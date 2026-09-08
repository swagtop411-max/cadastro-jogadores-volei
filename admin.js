const OWNER_GATE_KEY="oc_6f9c2a71_session";
if(sessionStorage.getItem(OWNER_GATE_KEY)!=="ok"){
  location.replace("/");
  throw new Error("Private console gateway required");
}

function installAdminPrivateStyles(){
  if(!document.getElementById("adminPrivateV32Css")){
    const link=document.createElement("link");
    link.id="adminPrivateV32Css";
    link.rel="stylesheet";
    link.href="./admin-private-v32.css?v=20260908-40";
    document.head.appendChild(link);
  }
  if(!document.getElementById("adminCommandV33Css")){
    const link=document.createElement("link");
    link.id="adminCommandV33Css";
    link.rel="stylesheet";
    link.href="./admin-command-center-v33.css?v=20260908-40";
    document.head.appendChild(link);
  }
  if(!document.getElementById("adminMobileV40Css")){
    const link=document.createElement("link");
    link.id="adminMobileV40Css";
    link.rel="stylesheet";
    link.href="./admin-mobile-v40.css?v=20260908-40";
    document.head.appendChild(link);
  }
  document.documentElement.classList.add("admin-private-v32");
  document.body?.classList.add("admin-private-v32");
}

async function bootPrivateConsole(){
  installAdminPrivateStyles();
  try{
    await import("./owner-core-5e8a7c2d.js?v=20260908-40");
    await Promise.allSettled([
      import("./admin-v8-hardening.js?v=20260908-40"),
      import("./admin-claims-v9.js?v=20260908-40"),
      import("./admin-profile-link-v10.js?v=20260908-40"),
      import("./admin-control-center-v32.js?v=20260908-40"),
      import("./admin-command-center-v33.js?v=20260908-40"),
      import("./admin-data-migration-v11.js?v=20260908-40"),
      import("./admin-commerce-v11.js?v=20260908-40"),
      import("./admin-profile-browser-v13.js?v=20260908-40")
    ]);
  }catch(error){
    console.error("Falha ao carregar console privado:",error);
    document.body.innerHTML='<main style="min-height:100vh;display:grid;place-items:center;background:#031424;color:#fff;font-family:system-ui;padding:24px"><div style="max-width:480px;text-align:center"><h1>Console indisponível</h1><p style="color:#9bb1c2">Não foi possível carregar o painel agora. Feche esta página e entre novamente pelo acesso privado.</p></div></main>';
  }
}

void bootPrivateConsole();
