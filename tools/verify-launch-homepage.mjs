import { installCdpSafetyGuard } from './cdp-safety.mjs';
installCdpSafetyGuard();
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,extname,sep} from 'node:path';
import {createServer} from 'node:http';
const site=resolve(process.env.TABULOUS_HOMEPAGE_ROOT||'.'), base=await mkdtemp(join(tmpdir(),'tabulous-native-website-')),profile=join(base,'profile');
await mkdir(profile); await writeFile(join(profile,'.tabulous-disposable-profile.json'),JSON.stringify({mode:'headless',extension:site}));
process.env.TABULOUS_TEST_PROFILE=profile;process.env.TABULOUS_TEST_EXTENSION=site;
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://local').pathname,path=resolve(site,'.'+(pathname==='/'?'/index.html':pathname));if(!path.startsWith(site+sep))throw Error();const body=await readFile(path);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
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

 const phase=process.argv[2]||'after';assert.ok(['before','after'].includes(phase));
 const output=resolve('docs/verification/public-launch-2026-10-31');await mkdir(output,{recursive:true});
 const errors=[];socket.addEventListener('message',({data})=>{const m=JSON.parse(String(data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);});
 for(const [label,width,height]of [['desktop',1440,1000],['laptop',1366,768],['tablet',820,1180],['mobile',390,844],['small-mobile',320,740]]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600},s);await load('/index.html');
  const data=await evaluate(s,`({width:document.documentElement.scrollWidth,viewport:innerWidth,images:[...document.images].map(i=>({src:i.getAttribute('src'),ok:i.complete&&i.naturalWidth>0})),heroBottom:document.querySelector('.hero').getBoundingClientRect().bottom,benefitsTop:document.querySelector('#features').getBoundingClientRect().top,footerVersion:document.querySelector('.footer-version')?.textContent,links:[...document.querySelectorAll('a')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href')})),text:document.body.innerText})`);
  assert.equal(data.width,data.viewport,label+' horizontal overflow');for(const i of data.images)assert.ok(i.ok,'Missing image '+i.src);
  for(const link of data.links){assert.ok(link.href,'Empty link');if(link.href.startsWith('https:')){assert.equal(link.href,'https://chromewebstore.google.com/detail/tabulous/iljkidmanamoojdglpbpilnepdpcaiij');continue;}const url=new URL(link.href,origin+'/index.html');assert.equal((await fetch(url)).status,200,link.href);if(url.hash)assert.ok(await evaluate(s,`!!document.getElementById(${JSON.stringify(url.hash.slice(1))})`));}
  if(phase==='after'){
   for(const phrase of ['Your browser workspaces,','Unlimited free Workspaces','Give your computer a break','Declutter the Dock. Tidy the Taskbar. Feel Tabulous.','Explore Pro plans','v2.0.1'])assert.ok(data.text.includes(phrase),phrase);
   assert.ok(data.text.includes('awaiting Chrome Web Store publication'),'Truthful publication status');
   assert.equal(await evaluate(s,"!!document.querySelector('header .version')"),false);
   if(label==='laptop')assert.ok(data.benefitsTop<height-60,'Benefits beginning should be visible on laptop');
   for(const selector of ['.actions .button','.actions .text-link','.split .text-link','nav a','.closing .button']){
    const result=await evaluate(s,`(()=>{const a=document.querySelector(${JSON.stringify(selector)});a.scrollIntoView({block:'center',behavior:'instant'});const r=a.getBoundingClientRect();return a.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()`);assert.ok(result,selector+' clickable at '+label);
   }
  }
  await evaluate(s,"scrollTo({top:0,behavior:'instant'})");
  const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},s);await writeFile(join(output,phase+'-'+label+'.png'),Buffer.from(shot.data,'base64'));
  const metrics=await cdp('Page.getLayoutMetrics',{},s);const full=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:Math.ceil(metrics.cssContentSize.height),scale:1}},s);await writeFile(join(output,phase+'-'+label+'-full.png'),Buffer.from(full.data,'base64'));
  delete data.text;checks.push({label,width,height,...data});
 }
 assert.deepEqual(errors,[]);const result={phase,result:'PASS',checks,errors,headless:true,personalBrowserTouched:false};await writeFile(join(output,phase+'-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{socket?.close();browser.kill('SIGTERM');server.closeAllConnections();await new Promise(r=>server.close(r));}
