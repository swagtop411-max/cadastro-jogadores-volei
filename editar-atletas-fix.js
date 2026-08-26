const $=id=>document.getElementById(id);

const POSICOES=["Levantador","Ponteiro","Oposto","Central","Líbero","Universal"];

function normalizar(v){
  if(Array.isArray(v)) return v.flatMap(x=>String(x).split(",")).map(x=>x.trim()).filter(Boolean);
  return String(v||"").split(",").map(x=>x.trim()).filter(Boolean);
}

function aplicarMarcacao(v){
  const selecionadas=normalizar(v);
  document.querySelectorAll("#adminPosicoesBox input[type=checkbox]").forEach(c=>c.checked=selecionadas.includes(c.value));
}

function atualizarCampo(){
  const p=$("posicao");
  if(!p)return;
  const selecionadas=[...document.querySelectorAll("#adminPosicoesBox input[type=checkbox]:checked")].map(c=>c.value);
  p.value=selecionadas.join(", ");
  p.dispatchEvent(new Event("input",{bubbles:true}));
  p.dispatchEvent(new Event("change",{bubbles:true}));
}

function criarPosicoes(){
  const antigo=$("posicao");
  if(!antigo)return;

  if($("adminPosicoesBox")){
    aplicarMarcacao(antigo.value);
    return;
  }

  const box=document.createElement("div");
  box.id="adminPosicoesBox";
  box.className="admin-posicoes-box";
  box.innerHTML=`
    <div class="admin-posicoes-help">Selecione uma ou mais posições</div>
    <div class="admin-posicoes-grid">
      ${POSICOES.map(p=>`<label class="admin-posicao-option"><input type="checkbox" value="${p}"><span>${p}</span></label>`).join("")}
    </div>`;

  antigo.type="hidden";
  antigo.setAttribute("aria-hidden","true");
  antigo.style.display="none";
  antigo.parentElement.appendChild(box);

  box.querySelectorAll("input").forEach(c=>c.addEventListener("change",atualizarCampo));
  aplicarMarcacao(antigo.value);
}

function sincronizar(){
  const p=$("posicao"),box=$("adminPosicoesBox");
  if(!p||!box)return;
  const valor=normalizar(p.value).join(", ");
  const atual=[...box.querySelectorAll("input:checked")].map(x=>x.value).join(", ");
  if(valor!==atual)aplicarMarcacao(p.value);
}

function iniciar(){
  criarPosicoes();
  sincronizar();
  setInterval(sincronizar,250);
}

const css=document.createElement("style");
css.textContent=`
.admin-posicoes-box{margin-top:8px;width:100%}
.admin-posicoes-help{font-size:11px;color:#9da39c;margin:0 0 9px}
.admin-posicoes-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.admin-posicao-option{display:flex!important;align-items:center!important;gap:10px!important;min-height:48px;padding:11px 13px;border:1px solid rgba(217,169,63,.22);border-radius:11px;background:#0d110f;color:#f5f0e3;cursor:pointer;font-weight:800}
.admin-posicao-option:hover{border-color:rgba(242,204,114,.55);background:#121814}
.admin-posicao-option input{width:19px!important;height:19px!important;min-width:19px!important;accent-color:#d9a93f!important;margin:0!important;cursor:pointer}
.admin-posicao-option span{cursor:pointer}
@media(max-width:700px){.admin-posicoes-grid{grid-template-columns:1fr}}
`;
document.head.appendChild(css);

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(iniciar,150));
else setTimeout(iniciar,150);
