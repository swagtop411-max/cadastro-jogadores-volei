const PAGE=location.pathname.split("/").pop()||"index.html";

function cutoffDate(reference=new Date()){
  const cutoff=new Date(reference.getFullYear()-18,reference.getMonth(),reference.getDate());
  return `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,"0")}-${String(cutoff.getDate()).padStart(2,"0")}`;
}
function isAdult18(value,reference=new Date()){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||"")))return false;
  const [year,month,day]=value.split("-").map(Number),birth=new Date(year,month-1,day);
  if(Number.isNaN(birth.getTime())||birth.getFullYear()!==year||birth.getMonth()!==month-1||birth.getDate()!==day)return false;
  const cutoff=new Date(reference.getFullYear()-18,reference.getMonth(),reference.getDate(),23,59,59,999);
  return birth<=cutoff;
}
function enhanceLegacyBirth(){
  const input=document.querySelector("#cadastroForm #cadNascimento");
  if(!input)return false;
  input.required=true;
  input.max=cutoffDate();
  input.setAttribute("aria-required","true");
  const label=input.closest(".cadastro-field")?.querySelector("label");
  if(label&&!label.textContent.includes("*"))label.textContent=`${label.textContent.trim()} *`;
  return true;
}
function statusFor(form){return form.querySelector("#cadStatus,.cadastro-status,[role=status]")||document.getElementById("cadStatus")}
function rejectLegacyForm(event){
  const form=event.target;
  if(!(form instanceof HTMLFormElement)||form.id!=="cadastroForm")return;
  const birth=form.querySelector("#cadNascimento");
  if(!birth)return;
  if(birth.value&&isAdult18(birth.value))return;
  event.preventDefault();event.stopImmediatePropagation();
  const status=statusFor(form);
  if(status){status.textContent=birth.value?"O Cadastro de Atletas é exclusivo para pessoas com 18 anos ou mais.":"Informe sua data de nascimento. A plataforma é exclusiva para maiores de 18 anos.";status.classList.add("erro")}
  birth.focus();birth.reportValidity?.();
}

if(PAGE!=="admin.html"){
  enhanceLegacyBirth();
  const observer=new MutationObserver(()=>enhanceLegacyBirth());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener("submit",rejectLegacyForm,true);
  window.BDAgeGateV47={cutoffDate,isAdult18};
}
