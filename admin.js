const OWNER_GATE_KEY="oc_6f9c2a71_session";
if(sessionStorage.getItem(OWNER_GATE_KEY)!=="ok"){
  location.replace("/");
  throw new Error("Private console gateway required");
}
import("./owner-core-5e8a7c2d.js?v=20260908-31").catch(error=>{
  console.error("Falha ao carregar console privado:",error);
  document.body.innerHTML='<main style="min-height:100vh;display:grid;place-items:center;background:#031424;color:#fff;font-family:system-ui;padding:24px"><div style="max-width:480px;text-align:center"><h1>Console indisponível</h1><p style="color:#9bb1c2">Não foi possível carregar o painel agora. Feche esta página e entre novamente pelo acesso privado.</p></div></main>';
});