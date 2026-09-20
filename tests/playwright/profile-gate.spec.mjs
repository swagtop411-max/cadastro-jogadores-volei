import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

for(const denied of [true,false])test(`barreira estável com ${denied?'falha na consulta':'cadastro completo'}`,async({page})=>{
 let navigations=0;
 page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++;});
 await page.route('https://www.gstatic.com/firebasejs/12.1.0/**',route=>{
  const url=route.request().url();
  let body='';
  if(url.endsWith('firebase-app.js'))body='export const getApps=()=>[{}],getApp=()=>({}),initializeApp=()=>({});';
  if(url.endsWith('firebase-auth.js'))body='export const getAuth=()=>({currentUser:{uid:"test"}});export function onAuthStateChanged(auth,cb){setTimeout(()=>cb(auth.currentUser),0);return ()=>{};}';
  if(url.endsWith('firebase-firestore.js'))body=`export const getFirestore=()=>({}),doc=()=>({});export async function getDoc(){${denied?'throw Error("permission-denied");':'return {exists:()=>true,data:()=>({nome:"Atleta",contato:"16988886327",fotoUrl:"photo"})};'}}`;
  return route.fulfill({contentType:'text/javascript',body});
 });
 await page.route('http://profile.test/**',route=>{
  const pathname=new URL(route.request().url()).pathname;
  if(pathname==='/firebase-app-check-init-v60.js')return route.fulfill({contentType:'text/javascript',body:'export default Promise.resolve();'});
  if(pathname==='/auth-gate-v53.js')return route.fulfill({contentType:'text/javascript',body:readFileSync('auth-gate-v53.js','utf8')});
  return route.fulfill({contentType:'text/html',body:'<body><main>Conteúdo do app</main><script type="module" src="/auth-gate-v53.js"></script></body>'});
 });
 await page.goto('http://profile.test/index.html');
 if(denied){
  await expect(page.locator('#profileGateError')).toBeVisible();
  await expect(page.locator('main')).toBeHidden();
  await expect(page.getByRole('button',{name:'Tentar novamente'})).toBeVisible();
 }else{
  await expect(page.locator('html')).toHaveAttribute('data-auth-gate','authenticated');
  await expect(page.locator('main')).toBeVisible();
 }
 await page.waitForTimeout(1000);
 expect(navigations).toBe(1);
});
