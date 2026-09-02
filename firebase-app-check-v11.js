import{getApp,getApps,initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getToken,initializeAppCheck,ReCaptchaEnterpriseProvider}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app-check.js";

const cfg={apiKey:"AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",authDomain:"jogadores-de-volei.firebaseapp.com",projectId:"jogadores-de-volei",storageBucket:"jogadores-de-volei.firebasestorage.app",messagingSenderId:"48728914064",appId:"1:48728914064:web:1dd7aeb705319886f74015"};
const SITE_KEY="6LcP2aUtAAAAAJL53RXsdE6UaoemgTexo5eoTmzR";
const key=document.querySelector('meta[name="firebase-app-check-site-key"]')?.content?.trim()||window.BD_APP_CHECK_SITE_KEY||SITE_KEY;

if(!globalThis.__BD_APP_CHECK_PROMISE__){
 globalThis.__BD_APP_CHECK_PROMISE__=(async()=>{
  try{
   const app=getApps().length?getApp():initializeApp(cfg);
   const appCheck=initializeAppCheck(app,{provider:new ReCaptchaEnterpriseProvider(key),isTokenAutoRefreshEnabled:true});
   document.documentElement.dataset.appCheck="initializing";
   try{
    const token=await getToken(appCheck,false);
    document.documentElement.dataset.appCheck=token?.token?"active":"ready";
   }catch(tokenError){
    document.documentElement.dataset.appCheck="registered-client-pending";
    console.warn("App Check ainda não emitiu token. Confirme o registro da chave Enterprise no Firebase Console:",tokenError);
   }
   return appCheck;
  }catch(error){
   document.documentElement.dataset.appCheck="error";
   console.warn("App Check não inicializado:",error);
   return null;
  }
 })();
}

export default globalThis.__BD_APP_CHECK_PROMISE__;
