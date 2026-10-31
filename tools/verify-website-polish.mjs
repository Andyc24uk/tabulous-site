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
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://local').pathname,path=resolve(site,'.'+(pathname==='/'?'/index.html':pathname));if(!path.startsWith(site+sep))throw Error();const body=await readFile(path);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
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

 const phase=process.argv[2]||'local';
 const output=resolve('docs/verification/website-polish-2026-10-31');await mkdir(output,{recursive:true});
 const errors=[];socket.addEventListener('message',({data})=>{const m=JSON.parse(String(data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);});
 const paths=['/index.html','/pricing.html','/support.html','/account.html','/privacy.html','/terms.html','/delete-account.html','/checkout-success.html','/checkout-cancel.html','/portal-return.html','/404.html'];
 const links=new Map();
 for(const [label,width,height]of [['desktop',1440,1000],['tablet',820,1180],['mobile',390,844],['small-mobile',320,740]]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600},s);
  for(const path of paths){
   await load(path);
   const data=await evaluate(s,`(()=>{const header=document.querySelector('header'),head=document.querySelector('.hero,.page-head'),h1=document.querySelector('h1'),eyebrow=head.querySelector('.eyebrow'),next=head.nextElementSibling;return {width:document.documentElement.scrollWidth,viewport:innerWidth,h1Count:document.querySelectorAll('h1').length,headerBottom:header.getBoundingClientRect().bottom,headerPaddingBottom:getComputedStyle(header).paddingBottom,headPaddingTop:getComputedStyle(head).paddingTop,headPaddingBottom:getComputedStyle(head).paddingBottom,eyebrowTop:eyebrow.getBoundingClientRect().top,titleTop:h1.getBoundingClientRect().top,headBottom:head.getBoundingClientRect().bottom,nextContentTop:next?.querySelector('h2')?.getBoundingClientRect().top??next?.getBoundingClientRect().top??null,images:[...document.images].map(i=>({src:i.getAttribute('src'),ok:i.complete&&i.naturalWidth>0})),links:[...document.querySelectorAll('a')].map(a=>a.getAttribute('href')),text:document.body.innerText}})()`);
   assert.equal(data.width,data.viewport,label+' '+path+' overflow');assert.equal(data.h1Count,1,path+' heading');for(const i of data.images)assert.ok(i.ok,'Missing '+i.src);for(const href of data.links){assert.ok(href,'Empty link');links.set(new URL(href,origin+path).href,true);}
   if(phase!=='before'){
    assert.ok(!/coming soon|launching soon|available soon|in development|in beta|prepared for Chrome Web Store review|version 0\.8/i.test(data.text),path+' stale copy');
    if(path==='/pricing.html')for(const price of ['$0','$1.99','$14.99','$29.99','$19.99'])assert.ok(data.text.includes(price),price);
    if(['/pricing.html','/support.html'].includes(path))assert.equal(data.headPaddingTop,width<=600?'22px':width<=900?'26px':'30px');
   }
   if(['desktop','mobile'].includes(label)&&['/index.html','/pricing.html','/support.html'].includes(path)){
    const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},s);await writeFile(join(output,phase+'-'+label+'-'+path.slice(1)+'.png'),Buffer.from(shot.data,'base64'));
   }
   delete data.text;delete data.links;delete data.images;checks.push({label,path,...data});
  }
  if(phase!=='before'){
   const row=p=>checks.find(c=>c.label===label&&c.path===p),pricing=row('/pricing.html'),support=row('/support.html'),home=row('/index.html');
   assert.equal(pricing.titleTop,support.titleTop,label+' page titles aligned');assert.equal(pricing.titleTop,home.titleTop,label+' titles align with homepage');assert.equal(pricing.eyebrowTop,support.eyebrowTop,label+' page starts aligned');assert.equal(pricing.headerPaddingBottom,home.headerPaddingBottom,label+' shared header spacing');assert.equal(pricing.headPaddingTop,home.headPaddingTop,label+' shared page entry spacing');
  }
 }
 for(const [href]of links){const url=new URL(href);if(url.origin===origin){const response=await fetch(url);assert.equal(response.status,200,href);if(url.hash){const html=await response.text();assert.ok(html.includes('id="'+decodeURIComponent(url.hash.slice(1))+'"'),href+' target');}}else if(url.hostname==='chromewebstore.google.com')assert.equal(url.href,'https://chromewebstore.google.com/detail/tabulous/iljkidmanamoojdglpbpilnepdpcaiij');}
 if(phase!=='before'){
  const before=JSON.parse(await readFile(join(output,'before-result.json'),'utf8'));
  for(const row of checks.filter(c=>c.path==='/index.html')){const baseline=before.checks.find(c=>c.label===row.label&&c.path===row.path);for(const key of ['headerBottom','headerPaddingBottom','headPaddingTop','headPaddingBottom','eyebrowTop','titleTop','headBottom'])assert.equal(row[key],baseline[key],'Homepage spacing preserved: '+row.label+' '+key);}
 }
 assert.deepEqual(errors,[]);const result={phase,origin,result:'PASS',checks,linksChecked:links.size,errors,headless:true,realAccountOrPaymentActions:false};await writeFile(join(output,phase+'-result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({phase,result:'PASS',viewports:4,pages:paths.length,linksChecked:links.size,coreSpacing:checks.filter(c=>['/index.html','/pricing.html','/support.html'].includes(c.path)),output},null,2));
}finally{socket?.close();browser.kill('SIGTERM');server.closeAllConnections();await new Promise(r=>server.close(r));}
