/* DAYRIXA: deterministic workflows, sensitivity checks and research tables. */
(function(root){'use strict';
const C=typeof module!=='undefined'&&module.exports?require('./research-core.js'):root.DAYRIXAResearch;
const clone=x=>JSON.parse(JSON.stringify(x));
function requireCols(s,cols){const absent=cols.filter(c=>!s.cols.includes(c));if(absent.length)throw Error('Missing required columns: '+absent.join(', ')+'. Match the source column names before rerunning.');}
function refresh(s){return {...s,rawGrid:[s.cols,...s.rows.map(r=>s.cols.map(c=>r[c]))],rawMerges:[],headerSuggestion:null};}
function quantile(values,p){const a=values.slice().sort((a,b)=>a-b),i=(a.length-1)*p,j=Math.floor(i);return a[j]+(a[Math.min(j+1,a.length-1)]-a[j])*(i-j);}
function fences(rows,metric){const a=rows.map(r=>C.number(r[metric])).filter(Number.isFinite);if(a.length<4)throw Error('Outlier review needs at least four numeric observations.');const q1=quantile(a,.25),q3=quantile(a,.75);return {lower:q1-1.5*(q3-q1),upper:q3+1.5*(q3-q1)};}
function applyStep(input,step,files={}){
 let s={...input,cols:input.cols.slice(),rows:input.rows.slice()};if(!step||typeof step.kind!=='string')throw Error('Invalid workflow step.');
 if(step.kind==='headers'){
  const hs=s.headerSuggestion;if(!hs||JSON.stringify(hs.meta.map(m=>m.display))!==JSON.stringify(step.columns))throw Error('Header structure changed. Review the new file headers and record a new workflow.');
  s.cols=hs.meta.map(m=>m.display);s.rows=s.rawGrid.slice(hs.dataStart).filter(r=>r.some(v=>!C.blank(v))).map(r=>Object.fromEntries(s.cols.map((c,i)=>[c,r[i]??''])));s.headerSuggestion=null;return refresh(s);
 }
 if(step.kind==='variables'){
  if(!Array.isArray(step.variables)||!step.variables.length||step.variables.length>50)throw Error('Invalid variable step.');
  for(const v of step.variables){if(typeof v.name!=='string'||s.cols.includes(v.name))throw Error('Created variable already exists or has an invalid name: '+v.name);const values=C.evaluateExpression(v.formula,s.rows,s.cols,{time:v.time,entity:v.entity});s.rows=s.rows.map((r,i)=>({...r,[v.name]:values[i]}));s.cols.push(v.name);}return refresh(s);
 }
 if(step.kind==='clean'){
  const o=step.options||{};if(o.removeMissing){requireCols(s,o.fields||s.cols);s.rows=s.rows.filter(r=>(o.fields||s.cols).every(c=>!C.blank(r[c])));}
  if(o.removeDuplicates){const seen=new Set();s.rows=s.rows.filter(r=>{const k=JSON.stringify(s.cols.map(c=>r[c]));if(seen.has(k))return false;seen.add(k);return true;});}
  if(o.dropEmpty){const drop=s.cols.filter(c=>s.rows.every(r=>C.blank(r[c])));s.cols=s.cols.filter(c=>!drop.includes(c));}
  if(o.dropColumns?.length){requireCols(s,o.dropColumns);s.cols=s.cols.filter(c=>!o.dropColumns.includes(c));}
  if(o.renames){requireCols(s,Object.keys(o.renames));const names=s.cols.map(c=>o.renames[c]||c);if(new Set(names).size!==names.length||!names.every(c=>typeof c==='string'&&c.trim()))throw Error('Rename needs distinct nonempty names.');s.rows=s.rows.map(r=>Object.fromEntries(s.cols.map((c,i)=>[names[i],r[c]])));s.cols=names;}
  s.rows=s.rows.map(r=>Object.fromEntries(s.cols.map(c=>[c,r[c]])));return refresh(s);
 }
 if(step.kind==='outliers'){
  requireCols(s,[step.metric]);if(!['remove','winsorize'].includes(step.action))throw Error('Invalid outlier action.');const f=fences(s.rows,step.metric),flag=r=>{const v=C.number(r[step.metric]);return Number.isFinite(v)&&(v<f.lower||v>f.upper);};s.rows=step.action==='remove'?s.rows.filter(r=>!flag(r)):s.rows.map(r=>flag(r)?{...r,[step.metric]:Math.max(f.lower,Math.min(f.upper,C.number(r[step.metric])))}:r);return {...refresh(s),stepDiagnostic:f};
 }
 if(step.kind==='merge'){
  const right=files[step.slot];if(!right)throw Error('Upload the new right-hand dataset for merge '+step.slot+'. Old secondary data is never reused.');
  requireCols(right,step.rightColumns||[]);const out=C.mergeDatasets(s,right,step.config);return {...refresh({...s,rows:out.rows,cols:out.cols}),stepDiagnostic:out.diagnostics};
 }
 throw Error('This step cannot be replayed automatically: '+(step.reason||step.kind)+'. Rebuild it using the repeatable preparation controls.');
}
function validateRecipe(r){if(r?.format!=='dayrixa-workflow'||r.version!==1||!Array.isArray(r.steps)||r.steps.length>100||!Array.isArray(r.columns)||!r.columns.every(c=>typeof c==='string')||!Array.isArray(r.models)||r.models.length>20)throw Error('Invalid workflow file.');for(const m of r.models)if(!m.spec||typeof m.name!=='string'||!Array.isArray(m.spec.xs)||typeof m.spec.y!=='string')throw Error('Invalid workflow model.');return r;}
function replay(recipe,input,files={}){
 validateRecipe(recipe);requireCols(input,recipe.columns);if(input.cols.length!==recipe.columns.length)throw Error('New source has extra columns. Review the schema and record a new workflow before running.');
 let s=clone(input),audit=[];for(let i=0;i<recipe.steps.length;i++){const before=s.rows.length;try{s=applyStep(s,recipe.steps[i],files);if(!s.rows.length)throw Error('No rows remain.');audit.push({step:i+1,kind:recipe.steps[i].kind,before,after:s.rows.length,detail:s.stepDiagnostic||null});}catch(e){throw Error('Step '+(i+1)+': '+e.message);}}
 const models=recipe.models.map(m=>{requireCols(s,[m.spec.y,...m.spec.xs]);return {...C.fit(s.rows,m.spec),name:m.name};});
 let comparison=null;if(recipe.comparison){const c=recipe.comparison;if(typeof c.common!=='boolean'||!Array.isArray(c.models)||c.models.length<2||c.models.length>20)throw Error('Invalid comparison recipe.');for(const m of c.models)requireCols(s,[m.spec.y,...m.spec.xs]);comparison={common:c.common,models:C.compare(s.rows,c.models.map(m=>m.spec),c.common).map((m,i)=>({...m,name:c.models[i].name}))};}
 const sensitivityResult=recipe.sensitivity?sensitivity(s.rows,recipe.sensitivity.spec,recipe.sensitivity.options):null;
 return {state:refresh(s),audit,models,comparison,sensitivityResult};
}
function sensitivity(rows,spec,options){
 const initial=C.fit(rows,spec);let baseline=initial,variant,detail='',filterIds=initial.ids,variantSpec=clone(spec);
 if(options.kind==='outliers'){
  const f=fences(initial.ids.map(i=>rows[i]),options.metric);filterIds=initial.ids.filter(i=>{const v=C.number(rows[i][options.metric]);return !Number.isFinite(v)||(v>=f.lower&&v<=f.upper);});detail='1.5×IQR fences computed on baseline complete rows: '+f.lower+' to '+f.upper+'. Missing values in the screening column are retained.';
 }else if(options.kind==='period'){
  const start=C.calendarParts(options.start),end=C.calendarParts(options.end);if(!start||!end||start.precision!=='day'||end.precision!=='day')throw Error('Choose start and end as YYYY-MM-DD.');const date=p=>p.year+'-'+p.month+'-'+p.day,lo=date(start),hi=date(end);if(lo>hi)throw Error('Start date must not follow end date.');filterIds=initial.ids.filter(i=>{const p=C.calendarParts(rows[i][options.time]);return p&&p.precision==='day'&&date(p)>=lo&&date(p)<=hi;});detail='Inclusive range '+lo+' to '+hi+'. Missing, invalid and non-daily dates are excluded.';
 }else if(options.kind==='predictors'){
  if(!Array.isArray(options.xs)||!options.xs.length)throw Error('Choose at least one alternative predictor.');variantSpec.xs=options.xs;variantSpec.fixed=Object.fromEntries(Object.entries(spec.fixed||{}).filter(([k])=>k==='Intercept'||options.xs.includes(k)));
  const fields=[...new Set([spec.y,...spec.xs,...options.xs])];filterIds=rows.map((r,i)=>fields.every(c=>Number.isFinite(C.number(r[c])))?i:-1).filter(i=>i>=0);baseline=C.fit(rows,spec,filterIds);detail='Both models refitted on exactly the same complete rows. Fixed restrictions on removed predictors are omitted. '+(initial.n-baseline.n)+' baseline rows excluded to align the sample.';
 }else throw Error('Choose an outlier, period or predictor sensitivity check.');
 variant=C.fit(rows,variantSpec,filterIds);const beforeIds=new Set(baseline.ids),afterIds=new Set(variant.ids);const names=[...new Set([...baseline.terms,...variant.terms].map(t=>t.name))];return {options:clone(options),spec:clone(spec),baseline,variant,originalN:initial.n,removed:baseline.ids.filter(i=>!afterIds.has(i)).length,added:variant.ids.filter(i=>!beforeIds.has(i)).length,detail,deltas:names.map(name=>{const a=baseline.terms.find(t=>t.name===name),b=variant.terms.find(t=>t.name===name);return {name,before:a?.beta??null,after:b?.beta??null,delta:a&&b?b.beta-a.beta:null};})};
}
function describeStep(step){
 if(step.kind==='headers')return 'Interpret the source headers: '+(step.columns||[]).join(', ');
 if(step.kind==='variables')return 'Create variables: '+step.variables.map(v=>v.name+' = '+v.formula+(v.time?' (time: '+v.time+'; entity: '+(v.entity||'single series')+')':'')).join('; ');
 if(step.kind==='clean'){const o=step.options||{};return [o.removeDuplicates?'Remove duplicate rows':'',o.removeMissing?'Remove rows with missing values':'',o.dropEmpty?'Remove empty columns':'',o.dropColumns?.length?'Drop '+o.dropColumns.join(', '):'',o.renames?'Rename '+Object.entries(o.renames).map(([a,b])=>a+' to '+b).join(', '):''].filter(Boolean).join('; ');}
 if(step.kind==='outliers')return (step.action==='remove'?'Remove outlier rows':'Cap outlier values')+' in '+step.metric+' using newly calculated 1.5 x IQR fences';
 if(step.kind==='merge')return (step.config.how==='left'?'Left':'Inner')+' join with '+(step.name||step.slot)+' on '+step.config.keys.map(k=>k.left+' = '+k.right+' ('+k.mode+')').join(' and ');
 return step.reason||step.kind;
}
const texEscape=v=>String(v??'').replace(/[\\{}$&#_%~^]/g,c=>({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','$':'\\$','&':'\\&','#':'\\#','_':'\\_','%':'\\%','~':'\\textasciitilde{}','^':'\\textasciicircum{}'}[c]));
function latex(title,models,meta={}){
 const f=v=>Number.isFinite(v)?(v!==0&&(Math.abs(v)<1e-5||Math.abs(v)>=1e6)?v.toExponential(5):v.toFixed(6)):'--',e=texEscape;let out='\\documentclass[11pt]{article}\n\\usepackage{fontspec}\n\\usepackage[margin=25mm]{geometry}\n\\usepackage{longtable}\n\\begin{document}\n\\raggedright\n\\section*{'+e(title)+'}\n'+e('DAYRIXA '+C.VERSION+'; Source: '+(meta.source||'')+'; Data revision: '+(meta.revision??''))+'\\par\n';
 for(const m of models){out+='\\subsection*{'+e(m.name||'Model')+'}\n'+e(m.spec.y+' ~ '+m.spec.xs.join(' + '))+'\\par\n'+e('Errors: '+m.spec.seType+'; intercept: '+(m.spec.intercept?'included':'excluded')+'; data revision: '+(m.revision??meta.revision??''))+'\\par\n\\begin{longtable}{p{0.32\\linewidth}rrrr}\nTerm & Coefficient & SE & t & Fixed \\\\ \\hline\n';for(const t of m.terms)out+=e(t.name)+' & '+f(t.beta)+' & '+f(t.se)+' & '+f(t.t)+' & '+(t.fixed?'Yes':'No')+' \\\\\n';out+='\\end{longtable}\n\\begin{tabular}{lr}\n'+[['N',m.n],['Excluded rows',m.excluded],['R-squared'+(m.spec.intercept?'':' (uncentered)'),f(m.r2)],['Adjusted R-squared',f(m.adj)],['Residual df',m.df],['Residual SE',f(m.rmse)]].map(([label,value])=>e(label)+' & '+value+' \\\\\n').join('')+'\\end{tabular}\\par\n';}
 out+='\\section*{Method and notes}\n'+e(meta.notes||'')+'\\par\n'+e('Fixed coefficients are imposed, with no estimated SE or t. OLS/HC1 do not adjust for clustering or serial correlation. Model differences do not establish causality.')+'\\par\n';for(const step of meta.steps||[])out+=e(describeStep(step))+'\\par\n';return out+'\\par\n\\small Created and developed by Iman Malekikhajkolaei. Copyright 2026 DAYRIXA.\n\\end{document}\n';
}
const api={describeStep,applyStep,replay,validateRecipe,sensitivity,fences,latex,texEscape};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DAYRIXAWorkflow=api;
})(typeof window!=='undefined'?window:globalThis);
