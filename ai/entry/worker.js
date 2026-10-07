importScripts('engine.js?v=04en');
onmessage=({data})=>{try{const result=EntryEngine.analyze(data.rows,data.options,stage=>postMessage({stage}));postMessage({result});}catch(e){postMessage({error:e.message});}};
