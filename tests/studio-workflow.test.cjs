const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{Document}=require('./dom-harness.cjs');
const document=new Document();
document.body.innerHTML=['dataFile','dataDrop','dataStatus','dataWorkspace','dataKpis','dataProfile','dataQuality','dataSuggestions','dataQuickActions','dataQuickConfig','dataQuestion','dataAskBtn','dataAnswer','dataTableWrap','dataChartWrap','dataChart','researchStudio','studioDemo','studioReopen'].map(id=>`<div id="${id}"></div>`).join('');
const window={},ctx=vm.createContext({window,document,console,Blob,URL,setTimeout,clearTimeout});
for(const f of ['research-core.js','research-workflow.js','research-studio.js'])vm.runInContext(fs.readFileSync(__dirname+'/../ai/'+f,'utf8'),ctx);
const full=fs.readFileSync(__dirname+'/../ai/app-v3-1.js','utf8'),start=full.indexOf('(() => {',full.indexOf('// DAYRIXA Data Analyst Beta'));let app=full.slice(start);const close=app.lastIndexOf('})();');app=app.slice(0,close)+'window.test={getStudio:()=>studio,parseDatasetFile,captureWorking,openBuilder,applyCleaning,restoreWorkingCopy};'+app.slice(close);vm.runInContext(app,ctx);
const $=id=>{const el=document.getElementById(id);assert(el,'Missing element: '+id);return el;};
const click=async id=>{await $(id).click();await new Promise(r=>setTimeout(r,0));};
(async()=>{
 await click('studioDemo');const api=window.test,studio=api.getStudio();assert.equal(api.captureWorking().rows.length,60);assert.equal(studio.getState().revision,1);
 studio.setPage('variables');$('svName').value='Excess_RI';$('svFormula').value='RI - Rf';await click('svPreview');assert($('svPreviewResult').innerHTML.includes('60 numeric'));await click('svApply');assert(api.captureWorking().cols.includes('Excess_RI'));assert.equal(studio.getState().journal.at(-1).action,'Create variable');
 studio.undo(-1);assert(!api.captureWorking().cols.includes('Excess_RI'));studio.undo(1);assert(api.captureWorking().cols.includes('Excess_RI'));
 studio.setPage('variables');$('svName').value='Lag_RI';$('svFormula').value='lag(RI, 1)';$('svTime').value='Date';$('svEntity').value='Fund';await click('svPreview');assert($('svPreviewResult').innerHTML.includes('5 missing'));await click('svApply');
 for(const [name,formula] of [['Base','RI ~ Rm'],['Extended','RI ~ Rm + Rb']]){studio.setPage('models');$('smName').value=name;$('smFormula').value=formula;await click('smRun');assert($('smResult').innerHTML.includes('SE'));await click('smSave');}
 assert.equal(studio.getState().models.length,2);await click('smCompare');let comparison=studio.getState().comparison;assert(comparison);assert.equal(comparison.models[0].n,56);assert.deepEqual(Array.from(comparison.models[0].ids),Array.from(comparison.models[1].ids));assert($('smComparison').innerHTML.includes('Exactly the same observations'));
 studio.setPage('export');assert.equal($('seCompare').disabled,false);const html=studio.reportHTML('Study <x>','Notes <script>alert(1)</script>',null);assert(html.includes('Study &lt;x&gt;'));assert(!html.includes('<script>'));assert(html.includes('Data audit log'));assert(studio.comparisonCSV(comparison).includes('Common complete rows'));
 let project=JSON.parse(JSON.stringify(studio.exportProject()));studio.importProject(project);assert.equal(studio.getState().models.length,2);assert(api.captureWorking().cols.includes('Lag_RI'));
 const originalRevision=studio.getState().revision;const malformed=JSON.parse(JSON.stringify(project));malformed.journal[0].rowsAfter='<img>';assert.throws(()=>studio.importProject(malformed),/audit/);assert.equal(studio.getState().revision,originalRevision);
 api.openBuilder('cleaning');$('cleanEmptyCols').checked=false;$('cleanDuplicates').checked=false;$('cleanMissingRows').checked=true;$('cleanSelectedCol').value='';$('cleanSelectedRow').value='';api.applyCleaning();assert(api.captureWorking().rows.length<60);studio.undo(-1);assert.equal(api.captureWorking().rows.length,60);
 api.restoreWorkingCopy();assert(!api.captureWorking().cols.includes('Lag_RI'));assert.equal(studio.getState().derived.length,0);

 studio.setPage('merge');
 const csv='Date,Rate\n'+Array.from({length:12},(_,i)=>`2021-${String(i+1).padStart(2,'0')}-01,${i+1}`).join('\n');
 $('sjFile').onchange({target:{files:[{name:'macro.csv',text:async()=>csv}]}});await new Promise(r=>setTimeout(r,0));
 $('sjL1').value='Date';$('sjR1').value='Date';$('sjMode1').value='day';await click('sjPreview');assert($('sjResult').innerHTML.includes('Merge checks complete'));assert.equal($('sjApply').disabled,true);
 $('sjConfirm').checked=true;$('sjConfirm').onchange();await click('sjApply');assert.equal(api.captureWorking().rows.length,60);assert.equal(api.captureWorking().rows[12].Rate,'1');assert.equal(studio.getState().journal.at(-1).action,'Merge datasets');
 studio.undo(-1);assert(!api.captureWorking().cols.includes('Rate'));studio.undo(1);assert(api.captureWorking().cols.includes('Rate'));
 assert(studio.reportHTML('Merged','',null).includes('rowCountValidated'));studio.importProject(JSON.parse(JSON.stringify(studio.exportProject())));assert.equal(api.captureWorking().rows[12].Rate,'1');
 studio.setPage('merge');$('sjFile').onchange({target:{files:[{name:'duplicate.csv',text:async()=> 'Date,Rate\n2021-01-01,1\n2021-01-01,2'}]}});await new Promise(r=>setTimeout(r,0));$('sjL1').value='Date';$('sjR1').value='Date';$('sjMode1').value='day';await click('sjPreview');assert($('sjResult').innerHTML.includes('Merge blocked'));assert.equal(document.getElementById('sjApply'),null);assert.equal(api.captureWorking().rows.length,60);
 const before=JSON.stringify(api.captureWorking());await api.parseDatasetFile({name:'empty.csv',text:async()=>''});assert.equal(JSON.stringify(api.captureWorking()),before);

 window.confirm=()=>true;await click('studioDemo');studio.setPage('models');
 assert($('researchStudio').innerHTML.includes('SYNTHETIC DEMO'));
 $('scAsset').value='RI';$('scMarket').value='Rm';$('scRiskFree').value='Rf';$('scFrequency').value='period';$('scUnits').checked=true;await click('scBuild');
 assert.equal(api.captureWorking().rows[0].CAPM_AssetExcess,.6);assert.equal(api.captureWorking().rows[0].CAPM_MarketExcess,-.1);
 await click('smCoefficients');const fixed=Array.from(document.querySelectorAll('.smFixed'));assert.equal(fixed.length,2);fixed[0].value='0';await click('smRun');assert($('smResult').innerHTML.includes('Fixed by user'));await click('smSave');assert.equal(studio.getState().models[0].spec.fixed.Intercept,0);
 studio.importProject(JSON.parse(JSON.stringify(studio.exportProject())));assert.equal(studio.getState().models[0].terms[0].se,null);assert(studio.reportHTML('CAPM','',null).includes('Fixed by user'));
 const retained=JSON.stringify(api.captureWorking());window.confirm=()=>false;await click('studioDemo');assert.equal(JSON.stringify(api.captureWorking()),retained);

 window.confirm=()=>true;await click('studioDemo');studio.setPage('prepare');$('spDuplicates').checked=true;await click('spPreview');await click('spApply');assert.equal(studio.getState().recipe.length,1);assert.equal(studio.getState().revision,2); // record rules even when this file has no duplicates
 studio.setPage('variables');$('svName').value='Excess';$('svFormula').value='RI - Rf';await click('svPreview');await click('svApply');
 studio.setPage('models');$('smName').value='Repeatable model';$('smFormula').value='Excess ~ Rm';await click('smRun');await click('smSave');const oldBeta=studio.getState().models[0].terms[0].beta;
 $('ssKind').value='period';$('ssKind').onchange();$('ssTime').value='Date';$('ssStart').value='2021-03-01';$('ssEnd').value='2021-09-01';await click('ssRun');assert.equal(studio.getState().sensitivityResult.variant.n,35);assert.equal(api.captureWorking().rows.length,60);
 assert(studio.latexReport('Study A_%','Compare samples').includes('Sensitivity alternative'));const saved=JSON.parse(JSON.stringify(studio.exportProject()));studio.importProject(saved);assert.equal(studio.getState().sensitivityResult.variant.n,35);assert.equal(studio.getState().recipe.length,2);
 const badSensitivity=JSON.parse(JSON.stringify(saved));badSensitivity.sensitivity.options.start='invalid';const unchanged=JSON.stringify(api.captureWorking());assert.throws(()=>studio.importProject(badSensitivity),/Choose start/);assert.equal(JSON.stringify(api.captureWorking()),unchanged);
 const original=studio.exportProject().original;const newCsv=original.cols.join(',')+'\n'+original.rows.map(r=>original.cols.map(c=>c==='RI'?Number(r[c])+5:r[c]).join(',')).join('\n');
 studio.setPage('workflow');$('swPrimary').onchange({target:{files:[{name:'new_month.csv',text:async()=>newCsv}]}});await new Promise(r=>setTimeout(r,0));await click('swPreview');assert($('swResult').innerHTML.includes('New run: 60 rows'));assert.equal(studio.getState().models[0].terms[0].beta,oldBeta);assert.equal($('swApply').disabled,true);$('swConfirm').checked=true;$('swConfirm').onchange();await click('swApply');assert(Math.abs(studio.getState().models[0].terms[0].beta-oldBeta-5)<1e-9);assert.equal(studio.getState().recipe.length,2);assert.equal(studio.getState().source,'new_month.csv');
 console.log('PASS: no-op cleaning rule recorded; sensitivity does not mutate data; sensitivity/recipe project restore; failed import atomicity; replay upload/preview/review/apply changes model intercept by exactly 5.');
 console.log('PASS: CAPM assistant, excess-return arithmetic, fixed alpha control, saved constraints/report/project, synthetic label and demo replacement cancellation.');
 console.log('PASS: CSV secondary upload → validated many-to-one merge → explicit review → apply → undo/redo → report/project provenance → duplicate blocking; failed primary import preserves working data.');
 console.log('PASS: demo upload → variable preview/apply → panel lag → undo/redo → two models → common-sample comparison → escaped report/CSV → project round trip → invalid import rejection → cleaning history → restore. DOM harness, not browser rendering.');
})().catch(e=>{console.error(e);process.exitCode=1;});
