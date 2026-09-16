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

const redirectStart = source.lastIndexOf('    const complete = Boolean(');
const redirectEnd = source.indexOf('  } catch (error)', redirectStart);
assert.ok(redirectStart >= 0 && redirectEnd > redirectStart);
const redirectCode = source.slice(redirectStart, redirectEnd);
for (const [label, data, query, expected] of [
  ['contato ausente', {nome:'Murilo', fotoUrl:'https://example.test/photo'}, '', false],
  ['foto ausente', {nome:'Murilo', contato:'16988886327'}, '', false],
  ['conclusão obrigatória aberta', {nome:'Murilo', contato:'16988886327', fotoUrl:'https://example.test/photo'}, '?obrigatorio=1', false],
  ['edição aberta', {nome:'Murilo', contato:'16988886327', fotoUrl:'https://example.test/photo'}, '?editar=1', false],
  ['perfil completo', {nome:'Murilo', contato:'16988886327', fotoUrl:'https://example.test/photo'}, '', true],
]) {
  test(`redirecionamento: ${label}`, () => {
    let redirected = false;
    vm.runInNewContext(redirectCode, {
      privateData:data, profile:{cidade:'Sertãozinho', uf:'SP'}, validUf:()=>true,
      params:new URLSearchParams(query), user:{uid:'test'},
      location:{replace:()=>{redirected=true;}},
    });
    assert.equal(redirected, expected);
  });
}
