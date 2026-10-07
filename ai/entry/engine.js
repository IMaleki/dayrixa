/* DAYRIXA Entry Lab 0.1 — research implementation, not a paper replication. */
(function(root){
'use strict';
const VERSION='0.4.0';
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const sd=a=>Math.sqrt(mean(a.map(x=>(x-mean(a))**2)));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rng(seed=49){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function csv(text){
 if(text.length>12000000)throw Error('حداکثر اندازه فایل ۱۲ مگابایت است.');
 const first=text.replace(/^\uFEFF/,'').split(/\r?\n/)[0]; const sep=first.includes('\t')?'\t':first.includes(';')?';':',';
 let rows=[],row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){let c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===sep&&!quoted){row.push(field.trim());field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field.trim());if(row.some(Boolean))rows.push(row);row=[];field='';}else field+=c;}
 if(quoted)throw Error('علامت نقل‌قول فایل CSV بسته نشده است.');if(field||row.length){row.push(field.trim());rows.push(row);}
 if(rows.length<2)throw Error('فایل باید عنوان ستون‌ها و ردیف‌های داده داشته باشد.');
 const headers=rows.shift().map(x=>x.replace(/^\uFEFF/,'').toLowerCase().replace(/[ _-]/g,''));
 const idx=names=>headers.findIndex(x=>names.includes(x));
 const columns={date:idx(['date','datetime','time']),open:idx(['open']),high:idx(['high']),low:idx(['low']),close:idx(['close']),adj:idx(['adjclose','adjustedclose']),volume:idx(['volume']),symbol:idx(['symbol','ticker'])};
 if(['date','open','high','low','close','volume'].some(k=>columns[k]<0))throw Error('ستون‌های Date, Open, High, Low, Close, Volume لازم‌اند. Adj Close اختیاری است.');
 const groups={}; const seen=new Set();
 rows.forEach((a,j)=>{
  if(a.length!==headers.length)throw Error('تعداد ستون‌ها در ردیف '+(j+2)+' با عنوان‌ها برابر نیست.');
  const date=a[columns.date]; if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('تاریخ ردیف '+(j+2)+' باید معتبر و به شکل YYYY-MM-DD باشد.');
  const symbol=columns.symbol>=0?a[columns.symbol]:'UPLOADED';if(!symbol||symbol.length>40)throw Error('نماد نامعتبر است.');
  const key=symbol+'|'+date;if(seen.has(key))throw Error('تاریخ تکراری برای '+symbol+': '+date);seen.add(key);
  const nums={};['open','high','low','close','volume'].forEach(k=>{nums[k]=a[columns[k]]===''?NaN:Number(a[columns[k]].replace(/,/g,''));});
  if(Object.values(nums).some(x=>!Number.isFinite(x))||['open','high','low','close'].some(k=>nums[k]<=0)||nums.volume<0)throw Error('قیمت یا حجم نامعتبر در ردیف '+(j+2));
  if(nums.high<Math.max(nums.open,nums.close,nums.low)||nums.low>Math.min(nums.open,nums.close,nums.high))throw Error('High/Low با قیمت‌های ردیف '+(j+2)+' سازگار نیست.');
  const adj=columns.adj>=0?Number(a[columns.adj]):nums.close;if(!Number.isFinite(adj)||adj<=0)throw Error('Adj Close نامعتبر در ردیف '+(j+2));
  const factor=adj/nums.close;const r={date,symbol,rawClose:nums.close,volume:nums.volume};['open','high','low','close'].forEach(k=>r[k]=nums[k]*factor);
  (groups[symbol]??=[]).push(r);
 });
 for(const a of Object.values(groups)){a.sort((a,b)=>a.date.localeCompare(b.date));if(a.length>15000)throw Error('حداکثر ۱۵۰۰۰ ردیف برای هر نماد مجاز است.');}
 return {groups,adjusted:columns.adj>=0};
}
function features(rows,i){
 const c=rows[i].close,rets=[];for(let j=i-59;j<=i;j++)rets.push(rows[j].close/rows[j-1].close-1);
 const vols=rows.slice(i-19,i+1).map(r=>r.volume),v=mean(vols);
 return [c/rows[i-5].close-1,c/rows[i-20].close-1,c/rows[i-60].close-1,sd(rets.slice(-20)),sd(rets),v?rows[i].volume/v-1:0,(rows[i].high-rows[i].low)/c,rows[i].close/rows[i].open-1,rows[i].open/rows[i-1].close-1,c/mean(rows.slice(i-19,i+1).map(r=>r.close))-1];
}
function samples(rows,h){const out=[];for(let i=60;i+h<rows.length;i++)out.push({i,end:i+h,x:features(rows,i),y:rows[i+h].close/rows[i+1].open-1});return out;}
function normalize(data){const p=data[0].x.length,m=Array.from({length:p},(_,j)=>mean(data.map(d=>d.x[j]))),s=Array.from({length:p},(_,j)=>sd(data.map(d=>d.x[j]))||1);return x=>x.map((v,j)=>clamp((v-m[j])/s[j],-10,10));}
function solve(a,b){const n=b.length,A=a.map((r,i)=>[...r,b[i]]);for(let i=0;i<n;i++){let pivot=i;for(let j=i+1;j<n;j++)if(Math.abs(A[j][i])>Math.abs(A[pivot][i]))pivot=j;[A[i],A[pivot]]=[A[pivot],A[i]];const v=A[i][i];if(Math.abs(v)<1e-12)throw Error('حل مدل خطی ناموفق بود.');for(let k=i;k<=n;k++)A[i][k]/=v;for(let j=0;j<n;j++)if(j!==i){const f=A[j][i];for(let k=i;k<=n;k++)A[j][k]-=f*A[i][k];}}return A.map(r=>r[n]);}
function fit(data,type){
 const norm=normalize(data),X=data.map(d=>norm(d.x)),ym=mean(data.map(d=>d.y)),ys=sd(data.map(d=>d.y))||1,Y=data.map(d=>(d.y-ym)/ys),p=X[0].length;
 if(type==='ridge'){
  const Z=X.map(x=>[1,...x]),A=Array.from({length:p+1},()=>Array(p+1).fill(0)),b=Array(p+1).fill(0);
  Z.forEach((x,i)=>{for(let j=0;j<=p;j++){b[j]+=x[j]*Y[i]/Z.length;for(let k=0;k<=p;k++)A[j][k]+=x[j]*x[k]/Z.length;}});for(let j=1;j<=p;j++)A[j][j]+=.1;const w=solve(A,b);
  return x=>ym+ys*[1,...norm(x)].reduce((s,v,j)=>s+v*w[j],0);
 }
 if(type==='boost'){
  let pred=Array(Y.length).fill(0),trees=[];const minLeaf=Math.max(15,Math.floor(X.length*.08));
  const splits=Array.from({length:p},(_,j)=>{const a=X.map(x=>x[j]).sort((a,b)=>a-b);return Array.from({length:9},(_,k)=>a[Math.floor(a.length*(k+1)/10)]);});
  for(let m=0;m<70;m++){
   const residual=Y.map((y,i)=>y-pred[i]);let best=null;
   for(let j=0;j<p;j++)for(const t of splits[j]){let n=0,l=0,r=0,nr=0;X.forEach((x,i)=>{if(x[j]<=t){n++;l+=residual[i];}else{nr++;r+=residual[i];}});if(n<minLeaf||nr<minLeaf)continue;const gain=l*l/n+r*r/nr;if(!best||gain>best.gain)best={j,t,l:l/n,r:r/nr,gain};}
   if(!best)break;trees.push(best);pred=pred.map((v,i)=>v+.06*(X[i][best.j]<=best.t?best.l:best.r));
  }
  return x=>{const z=norm(x);return ym+ys*trees.reduce((s,t)=>s+.06*(z[t.j]<=t.t?t.l:t.r),0);};
 }
 if(type==='mlp'){
  const rand=rng(17),H=8,W=Array.from({length:H},()=>Array.from({length:p},()=>(rand()-.5)*.3)),B=Array(H).fill(0),V=Array.from({length:H},()=>(rand()-.5)*.2);let bias=0;
  for(let epoch=0;epoch<180;epoch++){
   const dW=W.map(w=>w.map(()=>0)),dB=Array(H).fill(0),dV=Array(H).fill(0);let db=0;
   X.forEach((x,i)=>{const a=W.map((w,k)=>Math.tanh(w.reduce((s,v,j)=>s+v*x[j],B[k]))),pr=a.reduce((s,v,k)=>s+v*V[k],bias),e=clamp(pr-Y[i],-8,8)*2/X.length;db+=e;for(let k=0;k<H;k++){dV[k]+=e*a[k];const g=e*V[k]*(1-a[k]*a[k]);dB[k]+=g;for(let j=0;j<p;j++)dW[k][j]+=g*x[j];}});
   const lr=.025;bias-=lr*db;for(let k=0;k<H;k++){V[k]-=lr*(dV[k]+.02*V[k]);B[k]-=lr*dB[k];for(let j=0;j<p;j++)W[k][j]-=lr*(dW[k][j]+.02*W[k][j]);}
  }
  return x=>{const z=norm(x);return ym+ys*(bias+W.reduce((s,w,k)=>s+V[k]*Math.tanh(w.reduce((v,a,j)=>v+a*z[j],B[k])),0));};
 }
 throw Error('مدل ناشناخته');
}
const mse=(ds,fn)=>mean(ds.map(d=>(d.y-fn(d.x))**2));
function simulate(rows,ds,preds,h,cost,threshold){
 let equity=1,peak=1,drawdown=0,idx=0,trades=[],curve=[];const map=new Map(ds.map((d,k)=>[d.i,k]));
 const start=ds[0].i+1,last=ds.at(-1).i+h;let active=null,previous=1;
 for(let i=start;i<=last;i++){
  const k=map.get(i-1);if(!active&&k!==undefined&&preds[k]>cost+threshold){active={signal:i-1,entry:i,exit:i-1+h,entryPrice:rows[i].open,startEq:equity,pred:preds[k]};}
  if(active){equity=active.startEq*(1-cost/2)*rows[i].close/active.entryPrice;if(i===active.exit){equity*=1-cost/2;trades.push({...active,entryDate:rows[active.entry].date,exitDate:rows[i].date,net:equity/active.startEq-1});active=null;}}
  peak=Math.max(peak,equity);drawdown=Math.min(drawdown,equity/peak-1);curve.push({date:rows[i].date,equity,buyHold:(1-cost/2)*rows[i].close/rows[start].open*(i===last?1-cost/2:1),daily:equity/previous-1});previous=equity;
 }
 const bh=curve.at(-1).buyHold-1;
 return {trades,curve,total:equity-1,buyHold:bh,drawdown,winRate:trades.length?mean(trades.map(t=>+(t.net>0))):null,exposure:trades.length*h/curve.length};
}
function analyze(rows,options={},progress=()=>{}){
 const h=Number(options.horizon||21),cost=Number(options.costBps??20)/10000,threshold=.005;
 if(![21,63].includes(h)||!Number.isFinite(cost)||cost<0||cost>.02)throw Error('تنظیمات نامعتبر است.');
 const intervals=rows.slice(1).map((r,i)=>(Date.parse(r.date)-Date.parse(rows[i].date))/864e5).sort((a,b)=>a-b);
 if(intervals.length&&intervals[Math.floor(intervals.length/2)]>3)throw Error('این نسخه به داده روزانه نیاز دارد؛ فاصله میانه تاریخ‌ها بیش از سه روز است.');
 const ds=samples(rows,h),v0=Math.floor(ds.length*.6),t0=Math.floor(ds.length*.8);
 if(rows.length<900||ds.length-t0<3*h)throw Error('برای آموزش و آزمون زمانی حداقل ۹۰۰ ردیف روزانه لازم است. فایل یک تا سه ماهه برای آموزش این نسخه کافی نیست.');
 const valStart=ds[v0].i,testStart=ds[t0].i;
 const train=ds.filter(d=>d.i<valStart&&d.end<valStart),val=ds.filter(d=>d.i>=valStart&&d.end<testStart),test=ds.filter(d=>d.i>=testStart);
 const summaries=[];for(const type of ['ridge','boost','mlp']){progress(type);const fn=fit(train,type);summaries.push({type,valMSE:mse(val,fn)});}
 summaries.sort((a,b)=>a.valMSE-b.valMSE);const winner=summaries[0].type;
 const refit=ds.filter(d=>d.end<testStart),baseline=mean(refit.map(d=>d.y)),baseMSE=mean(test.map(d=>(d.y-baseline)**2));
 let chosenPred;for(const s of summaries){const fn=fit(refit,s.type);s.testMSE=mse(test,fn);s.skill=baseMSE>0?1-s.testMSE/baseMSE:0;if(s.type===winner)chosenPred=test.map(d=>fn(d.x));}
 const sim=simulate(rows,test,chosenPred,h,cost,threshold),selected=summaries[0];
 progress('latest');const liveModel=fit(ds,winner),prediction=liveModel(features(rows,rows.length-1));
 const latestVol=features(rows,rows.length-1)[3]*Math.sqrt(h);
 const gaps=rows.slice(1).filter((r,i)=>(Date.parse(r.date)-Date.parse(rows[i].date))/864e5>7).length;
 const largeMoves=rows.slice(1).filter((r,i)=>Math.abs(r.close/rows[i].close-1)>.5).length;
 const stale=Math.floor((Date.now()-Date.parse(rows.at(-1).date))/864e5)>7;
 const future=Date.parse(rows.at(-1).date)>Date.now()+864e5;
 const ready=selected.skill>0&&sim.total>sim.buyHold&&sim.total>0&&sim.trades.length>=12;
 let status='wait',reason='شواهد آزمون برای تأیید ورود کافی نیست.';
 if(options.demo){status='demo';reason='این داده مصنوعی است؛ خروجی برای شناخت ابزار است، نه تصمیم خرید.';}
 else if(stale||future||gaps||largeMoves){status='invalid';reason=future?'تاریخ داده در آینده است.':stale?'داده قدیمی است؛ وضعیت مربوط به آخرین تاریخ فایل است و سیگنال امروز نیست.':gaps?'وقفه بیش از ۷ روز در داده دیده شد؛ پیوستگی روزانه را بررسی کنید.':'تغییر روزانه بیش از ۵۰٪ دیده شد؛ تعدیل و رویدادهای شرکت را بررسی کنید.';}
 else if(!options.adjusted){status='invalid';reason='برای ارزیابی ورود، Adj Close معتبر یا تأیید تعدیل یکسان OHLC لازم است.';}
 else if(prediction<=cost+threshold){status='avoid';reason='بازده تخمینی از هزینه و حاشیه ورود عبور نکرده است.';}
 else if(latestVol>.15){status='wait';reason='نوسان اخیر برای افق انتخاب‌شده بالاست؛ ورود تأیید نشد.';}
 else if(ready){status='enter';reason='پیش‌بینی مثبت و قواعد اولیهٔ آزمون برقرارند. اعتبار سیگنال هنوز روی چند سهم و دوره مستقل تأیید نشده است.';}
 return {version:VERSION,h,cost,threshold,winner,summaries,prediction,latestVol,status,reason,ready,stale,gaps,largeMoves,sim,lastDate:rows.at(-1).date,rows:rows.length,split:{train:[rows[train[0].i].date,rows[train.at(-1).i].date,train.length],validation:[rows[val[0].i].date,rows[val.at(-1).i].date,val.length],test:[rows[test[0].i].date,rows[test.at(-1).i].date,test.length],purge:h},forecasts:test.map((d,k)=>({date:rows[d.i].date,index:d.i,prediction:chosenPred[k],realized:d.y,end:rows[d.end].date})),trainingCutoff:rows[testStart].date};
}
function demoCSV(n=1800){const random=rng(491),data=['Date,Open,High,Low,Close,Adj Close,Volume'];let price=100,date=new Date('2019-01-01T00:00:00Z');for(let i=0;i<n;i++){while([0,6].includes(date.getUTCDay()))date.setUTCDate(date.getUTCDate()+1);const open=price*Math.exp((random()-.5)*.01),r=.0002+.002*Math.sin(i/70)+(random()-.5)*.035;price=open*Math.exp(r);const hi=Math.max(open,price)*(1+random()*.012),lo=Math.min(open,price)*(1-random()*.012);data.push([date.toISOString().slice(0,10),open.toFixed(4),hi.toFixed(4),lo.toFixed(4),price.toFixed(4),price.toFixed(4),Math.round(1e6*(.5+random()))].join(','));date.setUTCDate(date.getUTCDate()+1);}return data.join('\n');}
const api={VERSION,csv,features,samples,fit,analyze,demoCSV,simulate};if(typeof module!=='undefined')module.exports=api;else root.EntryEngine=api;
})(typeof self!=='undefined'?self:globalThis);
