/* DAYRIXA Research Studio 3.4.0. Created and developed by Iman Malekikhajkolaei. */
(function(root){
'use strict';
const VERSION='3.5.0';
const blank=v=>v==null||String(v).trim()==='';
function number(v){if(blank(v))return NaN;const s=String(v).trim().replace(/[$,%£€¥,]/g,'');return s.trim()===''?NaN:Number(s);}
const alias=c=>String(c).split(/\s+[—–-]\s+/).pop().trim();
function resolve(s,cols){const exact=cols.filter(c=>c.toLowerCase()===s.toLowerCase());if(exact.length===1)return exact[0];const found=cols.filter(c=>alias(c).toLowerCase()===s.toLowerCase());if(found.length!==1)throw Error((found.length?'Ambiguous':'Unknown')+' variable: '+s+'. Use a full name in backticks.');return found[0];}
function parseExpression(source,cols){
 if(!source.trim()||source.length>2000)throw Error('Enter a formula of 1–2000 characters.');
 const tokens=[];let i=0;
 while(i<source.length){let s=source.slice(i),m;if(/^\s/.test(s)){i++;continue;}if(s[0]==='`'){const j=source.indexOf('`',i+1);if(j<0)throw Error('Close the backtick around the column name.');tokens.push({kind:'var',value:resolve(source.slice(i+1,j),cols)});i=j+1;continue;}
 if((m=s.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i))){tokens.push({kind:'num',value:Number(m[0])});i+=m[0].length;continue;}
 if((m=s.match(/^[\p{L}_][\p{L}\p{N}_]*/u))){tokens.push({kind:'name',value:m[0]});i+=m[0].length;continue;}
 if((m=s.match(/^(>=|<=|==|!=|[+*/^(),<>-])/))){tokens.push({kind:m[0]});i+=m[0].length;continue;}
 throw Error('Unsupported symbol near '+s.slice(0,15)+'. Use backticks for full column names.');}
 if(tokens.length>300)throw Error('Formula is too long. Split it into several variables.');
 let pos=0,depth=0;const peek=()=>tokens[pos]?.kind,take=k=>{if(peek()!==k)throw Error('Expected '+k);return tokens[pos++];};
 const precedence={'==':1,'!=':1,'>':1,'<':1,'>=':1,'<=':1,'+':2,'-':2,'*':3,'/':3,'^':4};
 const counts={log:1,sqrt:1,abs:1,exp:1,lag:2,diff:2,pct_change:2};
 function expr(min=0){if(++depth>50)throw Error('Formula nesting is too deep.');let left,t=tokens[pos++];if(!t)throw Error('Formula is incomplete.');
  if(t.kind==='num'||t.kind==='var')left=t;
  else if(t.kind==='+'||t.kind==='-')left={kind:'unary',op:t.kind,arg:expr(4)};
  else if(t.kind==='('){left=expr();take(')');}
  else if(t.kind==='name'){if(peek()==='('){const name=t.value.toLowerCase();if(!(name in counts))throw Error('Unsupported function: '+name);take('(');let args=[expr()];while(peek()===','){take(',');args.push(expr());}take(')');if(args.length!==counts[name])throw Error(name+' expects '+counts[name]+' argument(s).');left={kind:'call',name,args};}else left={kind:'var',value:resolve(t.value,cols)};}
  else throw Error('Unexpected token in formula.');
  while(precedence[peek()]>=min){const op=tokens[pos++].kind,p=precedence[op];left={kind:'binary',op,left,right:expr(op==='^'?p:p+1)};}
  depth--;return left;
 }
 const ast=expr();if(pos!==tokens.length)throw Error('Unexpected extra formula content.');return ast;
}
function timeValue(v){const p=calendarParts(v);return p?Date.UTC(+p.year,+p.month-1,+p.day):NaN;}
function evaluateExpression(source,rows,cols,options={}){
 const tree=parseExpression(source,cols),n=rows.length;let previous=null;
 function ordered(k){if(!options.time||!cols.includes(options.time))throw Error('Lag, difference and growth need an explicit time column.');
  if(!previous){const groups=new Map(),keys=new Set();rows.forEach((r,i)=>{if(options.entity&&blank(r[options.entity]))throw Error('Entity IDs cannot be blank for a lag calculation.');const e=options.entity?String(r[options.entity]):'all',t=timeValue(r[options.time]);if(!Number.isFinite(t))throw Error('Time must be YYYY, YYYY-MM-DD, YYYY-MM or MM/DD/YYYY, with no blanks.');const key=JSON.stringify([e,t]);if(keys.has(key))throw Error('Duplicate entity/time keys. Resolve them before creating a lag.');keys.add(key);if(!groups.has(e))groups.set(e,[]);groups.get(e).push({i,t});});previous=[...groups.values()].map(g=>g.sort((a,b)=>a.t-b.t));}
  const indexes=Array(n).fill(-1);for(const g of previous)for(let j=k;j<g.length;j++)indexes[g[j].i]=g[j-k].i;return indexes;
 }
 function calc(node){if(node.kind==='num')return Array(n).fill(node.value);if(node.kind==='var')return rows.map(r=>number(r[node.value]));if(node.kind==='unary'){const a=calc(node.arg);return a.map(x=>node.op==='-'?-x:x);}if(node.kind==='binary'){const a=calc(node.left),b=calc(node.right);return a.map((x,i)=>{const y=b[i];if(!Number.isFinite(x)||!Number.isFinite(y))return NaN;switch(node.op){case '+':return x+y;case '-':return x-y;case '*':return x*y;case '/':return y===0?NaN:x/y;case '^':return x**y;case '>':return +(x>y);case '<':return +(x<y);case '>=':return +(x>=y);case '<=':return +(x<=y);case '==':return +(x===y);case '!=':return +(x!==y);}});}
  const a=calc(node.args[0]);if(['lag','diff','pct_change'].includes(node.name)){const arg=node.args[1];if(arg.kind!=='num'||!Number.isInteger(arg.value)||arg.value<1||arg.value>1000)throw Error('Lag length must be an integer from 1 to 1000.');const prev=ordered(arg.value);return a.map((v,i)=>{const old=prev[i]<0?NaN:a[prev[i]];if(node.name==='lag')return old;if(!Number.isFinite(v)||!Number.isFinite(old))return NaN;return node.name==='diff'?v-old:old===0?NaN:100*(v/old-1);});}
  return a.map(v=>{if(!Number.isFinite(v))return NaN;return node.name==='log'?(v>0?Math.log(v):NaN):node.name==='sqrt'?(v>=0?Math.sqrt(v):NaN):node.name==='abs'?Math.abs(v):Math.exp(v);});
 }
 return calc(tree).map(v=>Number.isFinite(v)?v:null);
}
function fit(rows,spec,allowed=null){
 const {y,xs,intercept=true,seType='OLS'}=spec;if(!y||!Array.isArray(xs)||!xs.length||xs.includes(y)||new Set(xs).size!==xs.length)throw Error('Choose Y and distinct explanatory variables.');if(!['OLS','HC1'].includes(seType))throw Error('Unknown standard error method.');
 const use=allowed?new Set(allowed):null,ids=[],X=[],Y=[];rows.forEach((r,i)=>{if(use&&!use.has(i))return;const a=xs.map(c=>number(r[c])),v=number(r[y]);if(Number.isFinite(v)&&a.every(Number.isFinite)){ids.push(i);X.push(intercept?[1,...a]:a);Y.push(v);}});
 const names=intercept?['Intercept',...xs]:xs,fixed=spec.fixed||{};
 if(typeof fixed!=='object'||Array.isArray(fixed)||Object.keys(fixed).some(key=>!names.includes(key)||!Number.isFinite(fixed[key])))throw Error('Fixed coefficients must be finite numbers for included terms.');
 const originalX=X.map(r=>r.slice()),originalY=Y.slice(),free=names.map((_,i)=>i).filter(i=>!Object.hasOwn(fixed,names[i]));
 for(let i=0;i<X.length;i++){Y[i]-=names.reduce((sum,name,j)=>sum+(Object.hasOwn(fixed,name)?fixed[name]*X[i][j]:0),0);X[i]=free.map(j=>X[i][j]);}
 const n=Y.length,k=free.length,df=n-k;if(df<=0)throw Error('More complete observations than estimated coefficients are required.');
 const freeNames=free.map(j=>names[j]);
 for(let j=0;j<k;j++){const values=X.map(r=>r[j]);if(freeNames[j]!=='Intercept'&&values.every(v=>Math.abs(v-values[0])<=1e-12*Math.max(1,Math.abs(values[0])))){
 if(values[0]===0||freeNames.includes('Intercept'))throw Error('Constant predictor '+freeNames[j]+' = '+values[0]+': collinear with the intercept (or all zero). Remove this predictor or fix its coefficient. For CAPM use Ri − Rf and Rm − Rf.');}}

 // Scaled, reorthogonalized modified Gram-Schmidt QR. Never invert X'X.
 const scale=Array.from({length:k},(_,j)=>Math.sqrt(X.reduce((s,r)=>s+r[j]*r[j],0)));
 if(scale.some(v=>!Number.isFinite(v)||v===0))throw Error('Zero or overflowing predictor. Rescale or remove it.');
 const Q=[],R=Array.from({length:k},()=>Array(k).fill(0));
 for(let j=0;j<k;j++){const v=X.map(r=>r[j]/scale[j]);for(let pass=0;pass<2;pass++)for(let l=0;l<j;l++){const dot=v.reduce((s,x,i)=>s+x*Q[l][i],0);R[l][j]+=dot;for(let i=0;i<n;i++)v[i]-=dot*Q[l][i];}R[j][j]=Math.sqrt(v.reduce((s,x)=>s+x*x,0));if(R[j][j]<1e-10)throw Error('Predictor '+freeNames[j]+' is collinear or numerically indistinguishable from earlier terms: '+freeNames.slice(0,j).join(', ')+'. Remove a redundant predictor or use an explicit coefficient restriction.');Q.push(v.map(x=>x/R[j][j]));}
 const qty=Q.map(q=>q.reduce((s,x,i)=>s+x*Y[i],0)),betaScaled=Array(k).fill(0);
 for(let j=k-1;j>=0;j--){betaScaled[j]=(qty[j]-R[j].reduce((s,x,l)=>s+(l>j?x*betaScaled[l]:0),0))/R[j][j];}
 const beta=betaScaled.map((b,j)=>b/scale[j]),residuals=X.map((r,i)=>Y[i]-r.reduce((s,v,j)=>s+v*beta[j],0)),sse=residuals.reduce((s,v)=>s+v*v,0),mean=originalY.reduce((s,v)=>s+v,0)/n,sst=originalY.reduce((s,v)=>s+(intercept?v-mean:v)**2,0),r2=sst>0?1-sse/sst:null,adj=r2==null?null:1-(1-r2)*(n-(intercept?1:0))/df;
 const ri=Array.from({length:k},()=>Array(k).fill(0));for(let col=0;col<k;col++)for(let j=k-1;j>=0;j--)ri[j][col]=((j===col?1:0)-R[j].reduce((s,v,l)=>s+(l>j?v*ri[l][col]:0),0))/R[j][j];
 const bread=Array.from({length:k},(_,i)=>Array.from({length:k},(_,j)=>ri[i].reduce((s,v,l)=>s+v*ri[j][l],0)/(scale[i]*scale[j])));
 let variance= bread.map((r,i)=>r[i]*sse/df);
 if(seType==='HC1'){variance=Array(k).fill(0);for(let i=0;i<n;i++){for(let j=0;j<k;j++){const z=bread[j].reduce((s,v,l)=>s+v*X[i][l],0);variance[j]+=z*z*residuals[i]**2*n/df;}}}
 const se=variance.map(v=>Math.sqrt(Math.max(0,v))),terms=names.map((name,j)=>{const i=free.indexOf(j);return i<0?{name,beta:fixed[name],se:null,t:null,fixed:true}:{name,beta:beta[i],se:se[i],t:se[i]>0?beta[i]/se[i]:null,fixed:false};});
 if(!Number.isFinite(sse)||!terms.every(t=>Number.isFinite(t.beta)&&(t.fixed||Number.isFinite(t.se))))throw Error('Numerical overflow. Rescale the input variables.');
 return {spec:{y,xs:[...xs],intercept,seType,fixed:{...fixed}},estimated:k,n,df,r2,adj,rmse:Math.sqrt(sse/df),sse,terms,ids,excluded:rows.length-n};
}
function compare(rows,specs,common=true){if(specs.length<2)throw Error('Select at least two models.');if(new Set(specs.map(s=>s.y)).size!==1)throw Error('Comparison requires the same dependent variable.');const fields=[...new Set(specs.flatMap(s=>[s.y,...s.xs]))],ids=common?rows.map((r,i)=>fields.every(c=>Number.isFinite(number(r[c])))?i:-1).filter(i=>i>=0):null;return specs.map(s=>fit(rows,s,ids));}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function csv(matrix){return '\ufeff'+matrix.map(r=>r.map(v=>{let s=String(v??'');if(typeof v==='string'&&/^\s*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');}
// Strict calendar parsing: no ambiguous locale inference or invalid-date rollover.
function calendarParts(value){
 if(blank(value))return null;const s=String(value).trim();let m,y,mo=1,d=1,precision='year';
 if((m=s.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/))){y=+m[1];if(m[2]){mo=+m[2];precision='month';}if(m[3]){d=+m[3];precision='day';}}
 else if((m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/))){mo=+m[1];d=+m[2];y=+m[3];if(y<100)y+=y>=70?1900:2000;precision='day';}
 else return null;
 if(y<1000||y>9999||mo<1||mo>12||d<1||d>new Date(Date.UTC(y,mo,0)).getUTCDate())return null;
 return {year:String(y),month:String(mo).padStart(2,'0'),day:String(d).padStart(2,'0'),precision};
}
function mergePart(v,mode){if(blank(v))return null;if(mode==='exact')return String(v).trim();const p=calendarParts(v);if(!p)return null;if(mode==='year')return p.year;if(p.precision==='year')return null;if(mode==='month')return p.year+'-'+p.month;if(p.precision!=='day')return null;return p.year+'-'+p.month+'-'+p.day;}
function mergeIndex(rows,keys,side){const map=new Map(),invalid=[];rows.forEach((row,i)=>{const parts=keys.map(k=>mergePart(row[k[side]],k.mode));if(parts.some(v=>v===null)){invalid.push(i);return;}const key=JSON.stringify(parts);if(!map.has(key))map.set(key,[]);map.get(key).push(i);});const duplicates=[...map].filter(([,ids])=>ids.length>1);return {map,invalid,duplicates};}
function inspectMerge(left,right,config){
 const keys=config?.keys;if(!Array.isArray(keys)||!keys.length||keys.length>3)throw Error('Choose one to three join keys.');if(!['left','inner'].includes(config.how))throw Error('Choose left or inner join.');
 if(new Set(keys.map(k=>k.left)).size!==keys.length||new Set(keys.map(k=>k.right)).size!==keys.length)throw Error('Join key columns must be distinct.');
 for(const k of keys)if(!left.cols.includes(k.left)||!right.cols.includes(k.right)||!['exact','day','month','year'].includes(k.mode))throw Error('Invalid join column or normalization.');
 const a=mergeIndex(left.rows,keys,'left'),b=mergeIndex(right.rows,keys,'right');let matched=0;const matchedRight=new Set(),unmatchedLeft=[];
 left.rows.forEach((r,i)=>{const parts=keys.map(k=>mergePart(r[k.left],k.mode)),ids=parts.some(v=>v===null)?null:b.map.get(JSON.stringify(parts));if(ids){matched++;ids.forEach(j=>matchedRight.add(j));}else unmatchedLeft.push(i);});
 const unusedRight=right.rows.map((_,i)=>i).filter(i=>!matchedRight.has(i));
 return {leftRows:left.rows.length,rightRows:right.rows.length,matched,unmatched:unmatchedLeft.length,unusedRight:unusedRight.length,invalidLeft:a.invalid.length,invalidRight:b.invalid.length,leftDuplicateKeys:a.duplicates.length,rightDuplicateKeys:b.duplicates.length,duplicateRightSamples:b.duplicates.slice(0,5).map(([key,ids])=>({key:JSON.parse(key),rows:ids.slice(0,8).map(i=>i+1),count:ids.length})),relationship:b.duplicates.length?'Unsafe: multiple right rows per key':a.duplicates.length?'Many-to-one':'One-to-one',expectedRows:b.duplicates.length?null:config.how==='left'?left.rows.length:matched,blocked:b.duplicates.length>0,unmatchedLeft,unusedRightIndexes:unusedRight};
}
function mergeDatasets(left,right,config){
 const diagnostics=inspectMerge(left,right,config);if(diagnostics.blocked)throw Error('Merge blocked: the second dataset has duplicate join keys. Add the entity/time key, or resolve duplicates before joining. No rows were changed.');
 const index=mergeIndex(right.rows,config.keys,'right').map,keys=new Set(config.keys.map(k=>k.right)),used=new Set(left.cols),columns=[];
 for(const source of right.cols){if(keys.has(source))continue;let target=source;for(let n=2;used.has(target);n++)target=source+'_right'+(n===2?'':n);used.add(target);columns.push({source,target});}
 if(!columns.length)throw Error('The second dataset has no non-key columns to add.');
 const rows=[],lineage=[];left.rows.forEach((r,i)=>{const parts=config.keys.map(k=>mergePart(r[k.left],k.mode)),ids=parts.some(v=>v===null)?null:index.get(JSON.stringify(parts));if(!ids&&config.how==='inner')return;const other=ids?right.rows[ids[0]]:null;rows.push(Object.fromEntries([...left.cols.map(c=>[c,r[c]]),...columns.map(c=>[c.target,other?.[c.source]??null])]));lineage.push({leftRow:i+1,rightRow:ids?ids[0]+1:null,status:ids?'matched':'unmatched'});});
 if(rows.length!==diagnostics.expectedRows||new Set(lineage.map(r=>r.leftRow)).size!==rows.length)throw Error('Merge validation failed: unexpected row count or repeated source row.');
 return {rows,cols:[...left.cols,...columns.map(c=>c.target)],diagnostics,columns,lineage,validated:true};
}
function suggestMerge(left,right){
 const name=c=>alias(c).toLowerCase().replace(/[\s_—-]+/g,''),dateName=c=>/date|time|month|year|تاریخ/i.test(c),entityName=c=>/(?:^id$|id$|entity|fund|firm|company|country|ticker|symbol|code|شناسه)/i.test(name(c));
 const dateCols=s=>s.cols.filter(c=>dateName(c)&&s.rows.some(r=>calendarParts(r[c]))).slice(0,3),ld=dateCols(left),rd=dateCols(right),pairs=[];
 for(const l of left.cols.filter(entityName).slice(0,6))for(const r of right.cols.filter(entityName).slice(0,6))if(name(l)===name(r)||(!pairs.length&&left.cols.filter(entityName).length===1&&right.cols.filter(entityName).length===1))pairs.push({left:l,right:r,mode:'exact'});
 const proposals=[];
 for(const l of ld)for(const r of rd){const lp=left.rows.map(x=>calendarParts(x[l])?.precision).filter(Boolean),rp=right.rows.map(x=>calendarParts(x[r])?.precision).filter(Boolean),mode=[...lp,...rp].includes('year')?'year':[...lp,...rp].includes('month')?'month':'day',key={left:l,right:r,mode};for(const entity of pairs)if(entity.left!==l&&entity.right!==r)proposals.push({label:'Panel: entity + time',keys:[entity,key]});proposals.push({label:'Time key: suitable for a unique time series on the right',keys:[key]});}
 for(const key of pairs)proposals.push({label:'Entity key: suitable for entity-level attributes',keys:[key]});
 const seen=new Set();return proposals.filter(p=>{const k=JSON.stringify(p.keys);if(seen.has(k))return false;seen.add(k);return true;}).map(p=>({...p,how:'left',diagnostics:inspectMerge(left,right,{...p,how:'left'})})).sort((a,b)=>Number(a.diagnostics.blocked)-Number(b.diagnostics.blocked)||b.diagnostics.matched-a.diagnostics.matched||b.keys.length-a.keys.length).slice(0,8);
}

const api={VERSION,blank,number,alias,resolve,parseExpression,evaluateExpression,fit,compare,escape,csv,calendarParts,inspectMerge,mergeDatasets,suggestMerge};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DAYRIXAResearch=api;
})(typeof window!=='undefined'?window:globalThis);
