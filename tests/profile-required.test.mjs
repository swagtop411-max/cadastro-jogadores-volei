import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';

// Run the production handler with Firebase/DOM boundaries replaced by test doubles.
const source = readFileSync(new URL('../meu-perfil.js', import.meta.url), 'utf8');
const saveStart = source.indexOf('async function saveProfile() {');
const saveEnd = source.indexOf('\nasync function loadClaimableProfiles()', saveStart);
assert.ok(saveStart >= 0 && saveEnd > saveStart);
const saveCode = source.slice(saveStart, saveEnd);

for (const [label, nome, contato, foto, file, allowed] of [
  ['nome vazio', '', '16988886327', 'https://example.test/photo', null, false],
  ['nome com espaços', '   ', '16988886327', 'https://example.test/photo', null, false],
  ['contato vazio', 'Murilo', '', 'https://example.test/photo', null, false],
  ['contato curto', 'Murilo', '123', 'https://example.test/photo', null, false],
  ['sem foto', 'Murilo', '16988886327', '', null, false],
  ['foto existente', 'Murilo', '16988886327', 'https://example.test/photo', null, true],
  ['foto selecionada', 'Murilo', '16988886327', '', {}, true],
]) {
  test(`salvamento: ${label}`, async () => {
    let proceeded = false;
    const elements = {name: {value: nome}, contato: {value: contato}, avatarInput: {files: file ? [file] : []}};
    const boundary = new Error('passed required-field validation');
    const context = vm.createContext({
      $: id => {
        if (id === 'city') { proceeded = true; throw boundary; }
        return elements[id];
      },
      profile: {fotoUrl: foto}, status: () => {},
    });
    vm.runInContext(saveCode, context);
    if (allowed) await assert.rejects(context.saveProfile(), error => error === boundary);
    else await context.saveProfile();
    assert.equal(proceeded, allowed);
  });
}


const helpers = source.slice(source.indexOf('function completedProfileDestination('), saveStart);
for (const [query, expected] of [
  ['?obrigatorio=1', '/index.html'],
  ['?novo=1&return=%2Fexplorar.html%3Fbeta%3D1%23feed', '/explorar.html?beta=1#feed'],
  ['?obrigatorio=1&return=https%3A%2F%2Fevil.test', 'index.html'],
  ['?obrigatorio=1&return=%2Fmeu-perfil.html', 'index.html'],
  ['?editar=1', null],
]) {
  test(`destino após conclusão: ${query}`, () => {
    let destination = null;
    const context = vm.createContext({URL, URLSearchParams, location:{search:query, origin:'https://app.test', href:'https://app.test/meu-perfil.html'+query, replace:url=>{destination=url;}}});
    vm.runInContext(helpers, context);
    context.finishRequiredProfile();
    assert.equal(destination, expected);
  });
}

for (const failWrite of ['', 'usuarios', 'perfis']) {
  test(`cadastro completo: ${failWrite ? 'falha ao salvar '+failWrite : 'salva e libera acesso'}`, async () => {
    const values = {name:'Murilo', contato:'16988886327', city:'Sertãozinho', uf:'SP'};
    const elements = new Map();
    const writes = [];
    let destination = null;
    const context = vm.createContext({
      URL, URLSearchParams, console:{error:()=>{}}, CustomEvent:class {constructor(type, options){this.type=type;this.detail=options.detail;}},
      window:{dispatchEvent:()=>{}},
      location:{search:'?obrigatorio=1&return=%2Fexplorar.html',origin:'https://app.test',href:'https://app.test/meu-perfil.html',replace:url=>{destination=url;}},
      $:id=>{if(!elements.has(id))elements.set(id,{value:values[id]||'',files:[],style:{},disabled:false});return elements.get(id);},
      profile:{fotoUrl:'https://photo.test/avatar'}, user:{uid:'test',email:'test@example.test'},db:{},
      normalizeLocation:()=>({cidade:'Sertãozinho',uf:'SP'}),validUf:()=>true,
      getHistoricoCampeonatosFromForm:()=>[], profileHandle:()=> 'murilo-test',status:()=>{},
      doc:(_db,collection)=>collection,
      getDoc:async()=>({exists:()=>false}),
      setDoc:async(ref)=>{if(ref===failWrite)throw new Error('write failed');writes.push(ref);},
      serverTimestamp:()=>0,Timestamp:{now:()=>0},
      getDocs:async()=>({empty:true}),query:()=>{},collection:()=>{},where:()=>{},
      document:{querySelector:()=>null},renderHistoricoCampeonatos:()=>{},
    });
    vm.runInContext(helpers+saveCode,context);
    await context.saveProfile();
    assert.equal(destination, failWrite ? null : '/explorar.html');
    if(!failWrite)assert.deepEqual(writes,['usuarios','perfis','handles']);
    assert.equal(elements.get('saveProfile').disabled,false);
  });
}

const gateSource=readFileSync(new URL('../auth-gate-v53.js',import.meta.url),'utf8');
const validation=gateSource.slice(gateSource.indexOf('function profileComplete('),gateSource.indexOf('async function ensureRequiredProfile'));
for(const [label,privateData,publicData,expected] of [
 ['dados privados completos',{nome:'Murilo',contato:'16988886327',fotoUrl:'photo'},{},true],
 ['foto pública existente',{nome:'Murilo',contato:'16988886327'},{fotoUrl:'photo'},true],
 ['nome público existente',{contato:'16988886327'},{nome:'Murilo',fotoUrl:'photo'},true],
 ['sem contato privado',{nome:'Murilo'},{fotoUrl:'photo'},false],
 ['sem foto',{nome:'Murilo',contato:'16988886327'},{},false],
])test(`barreira: ${label}`,()=>{
 const context=vm.createContext({});vm.runInContext(validation,context);
 assert.equal(context.profileComplete(privateData,publicData),expected);
});

test('abrir perfil não redireciona automaticamente para a rede',()=>{
 const authHandler=source.slice(source.indexOf('onAuthStateChanged(auth, async'));
 assert.equal(authHandler.includes('finishRequiredProfile()'),false);
 assert.equal(authHandler.includes('location.replace('),false);
});

const gateHandler=gateSource.slice(gateSource.indexOf('async function ensureRequiredProfile'),gateSource.indexOf('if(!PUBLIC_PAGES.has(page))'));
for(const failure of [false,true])test(`consulta de perfil: ${failure?'erro mantém tela estável':'incompleto abre editor uma vez'}`,async()=>{
 let redirects=0,errors=0;
 const context=vm.createContext({
  page:'index.html',PUBLIC_PAGES:new Set(),ADMIN_EXEMPT_PAGES:new Set(),PROFILE_SETUP_PAGES:new Set(),
  appCheckReady:Promise.resolve(),profileRead:promise=>promise,doc:()=>({}),
  getDoc:async()=>{if(failure)throw Error('permission-denied');return {exists:()=>false};},
  profileComplete:()=>false,showProfileGateError:()=>{errors++;},console:{warn:()=>{}},
  location:{pathname:'/index.html',search:'',hash:'',replace:()=>{redirects++;}},encodeURIComponent
 });
 vm.runInContext(gateHandler,context);
 assert.equal(await context.ensureRequiredProfile({uid:'test'},{}),false);
 assert.equal(redirects,failure?0:1);assert.equal(errors,failure?1:0);
});
