import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';

async function isolatedShell(page,{slow=false}={}){
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!=='http://motion.test')return route.abort();
  const filename=path.resolve('.'+url.pathname);
  if(url.pathname.endsWith('.js')&&!['/theme-boot-v64.js','/app-motion-v64.js'].includes(url.pathname))return route.fulfill({contentType:'text/javascript',body:''});
  if(slow&&url.pathname==='/beta-mobile-v21.css')await new Promise(r=>setTimeout(r,300));
  if(!existsSync(filename))return route.fulfill({status:404,body:''});
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
  return route.fulfill({contentType:types[path.extname(filename)]||'application/octet-stream',body:readFileSync(filename)});
 });
}
for(const name of ['index','explorar','conta','meu-perfil'])test(`${name}: tema móvel desde a primeira exibição, CSS lento`,async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await isolatedShell(page,{slow:true});
 await page.addInitScript(()=>{
  window.themeFrames=[];
  function frame(){if(document.body)window.themeFrames.push({mobile:document.documentElement.classList.contains('beta-mobile-app'),scheme:getComputedStyle(document.documentElement).colorScheme});requestAnimationFrame(frame);}requestAnimationFrame(frame);
 });
 await page.goto(`http://motion.test/${name}.html?app=1`);
 await expect(page.locator('html')).toHaveClass(/beta-mobile-app/);
 await expect(page.locator('html')).toHaveCSS('color-scheme','dark');
 await page.waitForTimeout(100);
 const frames=await page.evaluate(()=>window.themeFrames);
 expect(frames.length).toBeGreaterThan(0);
 expect(frames.every(frame=>frame.mobile&&frame.scheme==='dark')).toBe(true);
 // Runtime modules find their styles already present in stable cascade order.
 for(const id of ['siteThemeV5Runtime','siteThemeV8Runtime','betaMobileV21Css'])await expect(page.locator('#'+id)).toHaveCount(1);
});
test('navegação mantém o tema e voltar não bloqueia a página',async({page})=>{
 await page.setViewportSize({width:390,height:844});await isolatedShell(page);
 await page.goto('http://motion.test/conta.html?beta=1');
 await page.evaluate(()=>{const a=document.createElement('a');a.href='/explorar.html';a.id='testNavigation';a.textContent='Explorar';document.body.append(a);});
 await page.locator('#testNavigation').click();await expect(page).toHaveURL(/explorar.html/);
 await expect(page.locator('html')).toHaveClass(/beta-mobile-app/);
 await page.goBack();await expect(page).toHaveURL(/conta.html/);
 await expect(page.locator('body')).toBeVisible();
});
test('preferência por movimento reduzido desativa animações',async({page})=>{
 await isolatedShell(page);await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('http://motion.test/conta.html?app=1');
 await expect(page.locator('#loginForm')).toHaveCSS('animation-name','none');
 await expect(page.locator('[data-account-tab="login"]')).toHaveCSS('transition-duration','0s');
});
