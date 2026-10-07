const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

class ClassList {
  constructor(){ this.values = new Set(); }
  add(...xs){ xs.forEach(x=>this.values.add(x)); }
  remove(...xs){ xs.forEach(x=>this.values.delete(x)); }
  contains(x){ return this.values.has(x); }
  toggle(x,on){ if(on===undefined) on=!this.values.has(x); on?this.values.add(x):this.values.delete(x); return on; }
}

class FakeElement {
  constructor(id='', owner=null){
    this.id=id;this.owner=owner;this.style={};this.classList=new ClassList();this.value='';this.checked=false;
    this.disabled=false;this.dataset={};this.listeners={};this.children=[];this._innerHTML='';this._textContent='';this.clientWidth=900;
  }
  set innerHTML(html){
    this._innerHTML=String(html);this.children=[];
    const buttons=[...this._innerHTML.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
    for(const match of buttons){
      const attrs=match[1],child=new FakeElement('',this.owner);child._textContent=match[2].replace(/<[^>]+>/g,'').trim();
      const id=attrs.match(/\bid="([^"]+)"/i)?.[1];if(id){child.id=id;this.owner.elements.set(id,child);}
      const analysis=attrs.match(/\bdata-analysis="([^"]+)"/i)?.[1];if(analysis)child.dataset.analysis=analysis;
      child.className=attrs.match(/\bclass="([^"]+)"/i)?.[1]||'';this.children.push(child);
    }
  }
  get innerHTML(){ return this._innerHTML; }
  set textContent(value){ this._textContent=String(value); }
  get textContent(){ return this._textContent; }
  addEventListener(type,fn){ this.listeners[type]=fn; }
  querySelectorAll(selector){
    if(selector==='button') return this.children;
    return [];
  }
  querySelector(selector){
    if(selector==='.data-builder-close') return this.children.find(x=>x.className.includes('data-builder-close'))||new FakeElement('',this.owner);
    return null;
  }
  insertAdjacentHTML(_where,html){ this._innerHTML+=html; }
  getContext(){
    const fn=()=>{};return {setTransform:fn,clearRect:fn,beginPath:fn,moveTo:fn,lineTo:fn,stroke:fn,fillText:fn,arc:fn,fill:fn,fillRect:fn,save:fn,translate:fn,rotate:fn,restore:fn};
  }
  click(){ return this.onclick?.() ?? this.listeners.click?.({target:this}); }
}

class FakeDocument {
  constructor(){ this.elements=new Map();this.head=new FakeElement('head',this); }
  getElementById(id){ if(!this.elements.has(id))this.elements.set(id,new FakeElement(id,this));return this.elements.get(id); }
  createElement(){ return new FakeElement('',this); }
}

const document = new FakeDocument();
for(const id of ['dataFile','dataDrop','dataStatus','dataWorkspace','dataKpis','dataProfile','dataQuality','dataSuggestions','dataQuickActions','dataQuickConfig','dataQuestion','dataAskBtn','dataAnswer','dataTableWrap','dataChartWrap','dataChart']) document.getElementById(id);
const window = {devicePixelRatio:1,__DAYRIXA_TEST_MODE__:true};
const context={window,document,console,Intl,Date,Map,Set,Math,Number,String,Array,Object,JSON,Promise,RegExp,Error,setTimeout,clearTimeout};
vm.createContext(context);

const full=fs.readFileSync(__dirname+'/../ai/app-v3-1.js','utf8');
const marker='// DAYRIXA Data Analyst Beta';
let source=full.slice(full.indexOf('(() => {',full.indexOf(marker)));
const close=source.lastIndexOf('})();');
source=source.slice(0,close)+`
window.__DAYRIXA_DATA_TEST__={
  setData(testRows,testRaw=[]){rows=testRows.map(r=>({...r}));originalRows=rows.map(r=>({...r}));cols=rows.length?Object.keys(rows[0]):[];rawGrid=testRaw;rawMerges=[];headerSuggestion=null;infer();renderProfile();makeSuggestions();renderQuickActions();},
  getState(){return {rows:rows.map(r=>({...r})),cols:[...cols],types:{...types},answer:answer.innerHTML,table:tableWrap.innerHTML,suggestions:suggestions.children.map(x=>x.textContent)};},
  runRegression,resolveVariable,parseModelFormula,mentionedColumn,runQuestion,runRanking,runTrend,runMissing,runOutliers,applyCleaning,parseDatasetFile
};
`+source.slice(close);
vm.runInContext(source,context,{filename:'app-v3-1.data-section.js'});

const api=window.__DAYRIXA_DATA_TEST__;
const rows=[
  {Date:'2026-01-01',Region:'East',Product:'A',Sales:'100',Profit:'10',Score:'1',Unnamed_7:''},
  {Date:'2026-01-01',Region:'West',Product:'B',Sales:'200',Profit:'25',Score:'2',Unnamed_7:''},
  {Date:'2026-02-01',Region:'East',Product:'A',Sales:'150',Profit:'18',Score:'3',Unnamed_7:''},
  {Date:'2026-02-01',Region:'West',Product:'B',Sales:'250',Profit:'30',Score:'4',Unnamed_7:''},
  {Date:'2026-03-01',Region:'East',Product:'C',Sales:'175',Profit:'20',Score:'5',Unnamed_7:''},
  {Date:'2026-03-01',Region:'West',Product:'C',Sales:'300',Profit:'35',Score:'6',Unnamed_7:''},
  {Date:'2026-04-01',Region:'North',Product:'A',Sales:'125',Profit:'12',Score:'7',Unnamed_7:''},
  {Date:'2026-04-01',Region:'South',Product:'B',Sales:'',Profit:'22',Score:'8',Unnamed_7:''},
  {Date:'2026-05-01',Region:'North',Product:'C',Sales:'225',Profit:'28',Score:'9',Unnamed_7:''},
  {Date:'2026-05-01',Region:'South',Product:'A',Sales:'10000',Profit:'900',Score:'100',Unnamed_7:''},
  {Date:'2026-05-01',Region:'South',Product:'A',Sales:'10000',Profit:'900',Score:'100',Unnamed_7:''},
];

function setControl(id,{value='',checked=false}={}){const el=document.getElementById(id);el.value=value;el.checked=checked;return el;}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

(async()=>{
  api.setData(rows);
  assert.strictEqual(api.getState().types.Sales,'numeric');
  assert.strictEqual(api.getState().types.Date,'date');

  const suggested=document.getElementById('dataSuggestions').children;
  assert(suggested.length>=6,'suggestions should be created');
  for(const button of suggested){button.click();await tick();assert(/<h3>/.test(api.getState().answer),`suggestion failed: ${button.textContent}`);}

  const quick=()=>document.getElementById('dataQuickActions').children;
  quick().find(x=>x.dataset.analysis==='top').click();
  assert(document.getElementById('dataQuickConfig').innerHTML.includes('Group by (category / ID)'));
  setControl('builderGroup',{value:'Region'});setControl('builderMetric',{value:'Sales'});setControl('builderAgg',{value:'Average'});setControl('builderN',{value:'5'});
  await document.getElementById('dataBuilderRun').click();
  assert(api.getState().answer.includes('Group by'));
  assert(api.getState().table.includes('Average Sales'));

  setControl('builderDate',{value:'Date'});setControl('builderMetric',{value:'Sales'});setControl('builderAgg',{value:'Average'});
  await api.runTrend();
  assert(api.getState().answer.includes('trend over'));

  api.runMissing();
  assert(api.getState().answer.includes('missing cells'));
  assert(api.getState().table.includes('Missing %'));

  quick().find(x=>x.dataset.analysis==='outliers').click();
  assert(document.getElementById('dataQuickConfig').innerHTML.includes('1.5×IQR'));
  setControl('builderMetric',{value:'Score'});setControl('builderOutlierAction',{value:'Review only'});document.getElementById('dataBuilderRun').click();
  assert(api.getState().answer.includes('flagged <strong>2</strong>'));
  assert(api.getState().table.includes('Above upper fence'));

  api.setData(rows);
  quick().find(x=>x.dataset.analysis==='cleaning').click();
  assert(document.getElementById('dataQuickConfig').innerHTML.includes('Data preview'));
  for(const id of ['cleanDuplicates','cleanMissingRows','cleanEmptyCols'])setControl(id,{checked:true});
  for(const id of ['cleanSmartHeader','cleanRenameUnnamed','cleanLeadingRows','cleanAddColumn','cleanAddRow'])setControl(id,{checked:false});
  setControl('cleanSelectedCol',{value:''});setControl('cleanSelectedRow',{value:''});
  document.getElementById('dataBuilderRun').click();
  assert.strictEqual(api.getState().rows.length,9);
  assert.strictEqual(api.getState().cols.length,6);
  assert(api.getState().answer.includes('Cleaning applied'));

  api.setData(rows);
  setControl('builderMetric',{value:'Score'});setControl('builderOutlierAction',{value:'Remove flagged rows'});api.runOutliers();
  assert.strictEqual(api.getState().rows.length,9);
  assert(api.getState().answer.includes('were removed'));

  const csv=fs.readFileSync(__dirname+'/dayrixa-test.csv','utf8');
  await api.parseDatasetFile({name:'dayrixa-test.csv',text:async()=>csv});
  assert.strictEqual(api.getState().rows.length,11);
  assert.strictEqual(api.getState().cols.length,7);
  assert(document.getElementById('dataStatus').innerHTML.includes('ready for analysis'));


  const financial=[5,4,8,7,11,10,15,12].map((y,i)=>({'Date':`2026-0${i+1}-01`,'DJCASG Index — RI':y,'SPTSX Index — Rm':i+1,'TBBC1M Index — Rf':[3,1,4,2,5,3,6,4][i]}));
  api.setData(financial);
  assert.equal(api.resolveVariable('RI',api.getState().cols),'DJCASG Index — RI');
  assert.equal(api.mentionedColumn('Show RI trend',api.getState().cols),'DJCASG Index — RI');
  assert.equal(api.mentionedColumn('Show UNKNOWN trend',api.getState().cols),null);
  assert.throws(()=>api.parseModelFormula('RI ~ Rm + BAD',api.getState().cols),/Unknown variable/);
  assert.throws(()=>api.parseModelFormula('RI ~ RI',api.getState().cols),/dependent variable/);
  await api.runQuestion('Show RI trend over time');
  assert(api.getState().answer.includes('DJCASG Index — RI trend'));
  assert(!api.getState().answer.includes('SPTSX Index — Rm'));
  assert(api.getState().table.startsWith('<details'));
  await api.runQuestion('Show UNKNOWN trend over time');
  assert(api.getState().answer.includes('Trend needs'));
  setControl('builderRegFormula',{value:'RI ~ Rm + Rf'});
  setControl('builderRegIntercept',{checked:true});
  api.runRegression();
  let result=api.getState();
  for(const value of ['0.7500','0.9000','1.2000','0.5123','0.1039','0.1587','1.4639','8.6603','7.5593','0.9844'])assert(result.table.includes(value),value+' missing: '+result.table);
  assert(result.table.includes('Model summary'));
  setControl('builderRegFormula',{value:'RI ~ Rm + MISSING'});api.runRegression();
  assert(api.getState().answer.includes('Unknown variable'));
  assert.equal(api.getState().table,'');
  setControl('builderRegFormula',{value:'RI ~ Rm + Rf'});setControl('builderRegIntercept',{checked:false});api.runRegression();
  assert(api.getState().table.includes('uncentered'));
  assert(!api.getState().table.includes('NaN'));
  console.log('PASS: regression coefficients, standard errors and t statistics match independent NumPy reference; strict formula validation; RI resolution; unknown trend rejection; collapsed data tables.');
  console.log('PASS: CSV loading, all suggested questions, Top/Bottom ranking, Group by aggregation, trends, missing data, outlier review/removal, and data cleaning.');
})().catch(error=>{console.error(error);process.exitCode=1;});
