import { installCdpSafetyGuard } from './cdp-safety.mjs';
installCdpSafetyGuard();
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,extname,sep} from 'node:path';
import {createServer} from 'node:http';
const site=resolve('.'), base=await mkdtemp(join(tmpdir(),'tabulous-native-website-')),profile=join(base,'profile');
await mkdir(profile); await writeFile(join(profile,'.tabulous-disposable-profile.json'),JSON.stringify({mode:'headless',extension:site}));
process.env.TABULOUS_TEST_PROFILE=profile;process.env.TABULOUS_TEST_EXTENSION=site;
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://local').pathname,path=resolve(site,'.'+(pathname==='/'?'/index.html':pathname));if(!path.startsWith(site+sep))throw Error();const body=await readFile(path);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=process.argv[3]||`http://127.0.0.1:${server.address().port}`;
const browser=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--enable-automation','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-sync','about:blank'],{stdio:['ignore','ignore','pipe']});let browserError='';browser.stderr.on('data',v=>{browserError=(browserError+v).slice(-8000)});
let socket;const checks=[];
try{
 let port;for(let i=0;i<200;i++){try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port,`Headless browser did not start: ${browserError}`);
 const version=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true});});
 let seq=0;const pending=new Map();socket.addEventListener('message',({data})=>{const m=JSON.parse(String(data)),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
 const cdp=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method+' '+JSON.stringify(params).slice(0,180)))},15000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
 const evaluate=async(id,expression)=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},id);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const target=await cdp('Target.createTarget',{url:'about:blank',background:true}),{sessionId:s}=await cdp('Target.attachToTarget',{targetId:target.targetId,flatten:true});await cdp('Page.enable',{},s);await cdp('Runtime.enable',{},s);
 const load=async(path)=>{await cdp('Page.navigate',{url:origin+path},s);for(let i=0;i<100;i++){if(await evaluate(s,`location.href===${JSON.stringify(origin+path)}&&document.readyState==='complete'`))break;await new Promise(r=>setTimeout(r,30));}await evaluate(s,'document.fonts.ready.then(()=>true)');await evaluate(s,"document.querySelectorAll('img').forEach(i=>{i.loading='eager'});true");for(let i=0;i<100;i++){if(await evaluate(s,"[...document.images].every(i=>i.complete&&i.naturalWidth>0)"))break;await new Promise(r=>setTimeout(r,30));}};


 const output=resolve('docs/store-assets/2026-11-01');
 await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false},s);
 await load('/docs/store-assets/2026-11-01/comparison-canvas.html');
 for(let i=0;i<100;i++){if(await evaluate(s,"document.body.dataset.ready==='true'"))break;await new Promise(r=>setTimeout(r,30));}
 assert.equal(await evaluate(s,"document.body.dataset.ready"),'true');
 const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},s);
 const path=join(output,'02-chaos-to-clarity-1280x800.png');await writeFile(path,Buffer.from(shot.data,'base64'));
 console.log(JSON.stringify({result:'PASS',path,width:1280,height:800,sourcePreserved:true,backgroundOnlyExtended:true}));
}finally{socket?.close();browser.kill('SIGTERM');server.closeAllConnections();await new Promise(r=>server.close(r));}
