from pathlib import Path

VERSION = "20260904-3"


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Trecho não encontrado em {path}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


# 1) Firestore: perfil social básico/incompleto, sem inventar dados esportivos.
rules = Path("firestore.rules")
text = rules.read_text(encoding="utf-8")
marker = "// V13_PERFIL_SOCIAL_BASICO"
if marker not in text:
    anchor = "    match /config_perfis/{uid} {"
    block = r'''    // V13_PERFIL_SOCIAL_BASICO
    // Toda conta pode possuir um perfil público mínimo antes de concluir os dados esportivos.
    // completo=false aceita somente campos públicos vazios/limitados; completo=true exige cidade, UF e categoria válidas.
    match /perfis/{uid} {
      allow create: if (isOwner(uid) || isAdmin())
        && request.resource.data.uid == uid
        && request.resource.data.keys().hasOnly([
          'uid','nome','cidade','uf','modalidade','posicao','categoria','time','bio',
          'fotoUrl','fotoPath','capaUrl','capaPath','historicoCampeonatos','handle','instagramUrl','completo'
        ])
        && request.resource.data.nome is string
        && request.resource.data.nome.size() >= 2
        && request.resource.data.nome.size() <= 100
        && request.resource.data.get('cidade','') is string
        && request.resource.data.get('cidade','').size() <= 100
        && request.resource.data.get('uf','') is string
        && request.resource.data.get('uf','').size() <= 2
        && request.resource.data.get('modalidade','') is string
        && request.resource.data.get('modalidade','').size() <= 100
        && request.resource.data.get('posicao','') is string
        && request.resource.data.get('posicao','').size() <= 100
        && request.resource.data.get('categoria','') is string
        && request.resource.data.get('categoria','').size() <= 40
        && request.resource.data.get('time','') is string
        && request.resource.data.get('time','').size() <= 100
        && request.resource.data.get('bio','') is string
        && request.resource.data.get('bio','').size() <= 500
        && request.resource.data.get('fotoUrl','') is string
        && request.resource.data.get('fotoUrl','').size() <= 2000
        && request.resource.data.get('fotoPath','') is string
        && request.resource.data.get('fotoPath','').size() <= 1000
        && request.resource.data.get('capaUrl','') is string
        && request.resource.data.get('capaUrl','').size() <= 2000
        && request.resource.data.get('capaPath','') is string
        && request.resource.data.get('capaPath','').size() <= 1000
        && request.resource.data.get('historicoCampeonatos',[]) is list
        && request.resource.data.get('historicoCampeonatos',[]).size() <= 30
        && request.resource.data.get('handle','') is string
        && request.resource.data.get('handle','').size() <= 40
        && request.resource.data.get('instagramUrl','') is string
        && request.resource.data.get('instagramUrl','').size() <= 300
        && request.resource.data.get('completo',false) is bool
        && (
          request.resource.data.get('completo',false) == false
          || (
            request.resource.data.cidade.size() >= 2
            && validUf(request.resource.data.uf)
            && validCategoria(request.resource.data.categoria)
          )
        );

      allow update: if (isOwner(uid) || isAdmin())
        && request.resource.data.uid == resource.data.uid
        && request.resource.data.keys().hasOnly([
          'uid','nome','cidade','uf','modalidade','posicao','categoria','time','bio',
          'fotoUrl','fotoPath','capaUrl','capaPath','historicoCampeonatos','handle','instagramUrl','completo'
        ])
        && request.resource.data.nome is string
        && request.resource.data.nome.size() >= 2
        && request.resource.data.nome.size() <= 100
        && request.resource.data.get('cidade','') is string
        && request.resource.data.get('cidade','').size() <= 100
        && request.resource.data.get('uf','') is string
        && request.resource.data.get('uf','').size() <= 2
        && request.resource.data.get('modalidade','') is string
        && request.resource.data.get('modalidade','').size() <= 100
        && request.resource.data.get('posicao','') is string
        && request.resource.data.get('posicao','').size() <= 100
        && request.resource.data.get('categoria','') is string
        && request.resource.data.get('categoria','').size() <= 40
        && request.resource.data.get('time','') is string
        && request.resource.data.get('time','').size() <= 100
        && request.resource.data.get('bio','') is string
        && request.resource.data.get('bio','').size() <= 500
        && request.resource.data.get('fotoUrl','') is string
        && request.resource.data.get('fotoUrl','').size() <= 2000
        && request.resource.data.get('fotoPath','') is string
        && request.resource.data.get('fotoPath','').size() <= 1000
        && request.resource.data.get('capaUrl','') is string
        && request.resource.data.get('capaUrl','').size() <= 2000
        && request.resource.data.get('capaPath','') is string
        && request.resource.data.get('capaPath','').size() <= 1000
        && request.resource.data.get('historicoCampeonatos',[]) is list
        && request.resource.data.get('historicoCampeonatos',[]).size() <= 30
        && request.resource.data.get('handle','') is string
        && request.resource.data.get('handle','').size() <= 40
        && request.resource.data.get('instagramUrl','') is string
        && request.resource.data.get('instagramUrl','').size() <= 300
        && request.resource.data.get('completo',false) is bool
        && (
          (
            resource.data.get('completo',false) == false
            && request.resource.data.get('completo',false) == false
          )
          || (
            request.resource.data.get('completo',false) == true
            && request.resource.data.cidade.size() >= 2
            && validUf(request.resource.data.uf)
            && validCategoria(request.resource.data.categoria)
          )
        );
    }

'''
    if anchor not in text:
        raise SystemExit("Âncora de config_perfis não encontrada")
    rules.write_text(text.replace(anchor, block + anchor, 1), encoding="utf-8")

# 2) Shell: sincronizador de perfil em todas as páginas principais.
replace_once(
    "site-v5.js",
    'await import("./firebase-app-check-v11.js?v=20260904-2");',
    'await import("./firebase-app-check-v11.js?v=20260904-2");\nimport("./profile-autosync-v13.js?v=20260904-3").catch(error=>console.warn("Perfil automático V13:",error));'
)

# 3) Conta: garante o sincronizador também no fluxo de criação/login.
replace_once(
    "conta.js",
    'await import("./firebase-app-check-v11.js?v=20260904-2");',
    'await import("./firebase-app-check-v11.js?v=20260904-2");\nawait import("./profile-autosync-v13.js?v=20260904-3");'
)

# 4) Meu perfil: quando o atleta completa os campos obrigatórios, marca como completo.
replace_once(
    "meu-perfil.js",
    'const perfilPublico={uid:user.uid,nome,cidade,uf,modalidade,posicao,categoria,time,bio,fotoUrl,fotoPath,capaUrl,capaPath,historicoCampeonatos,handle,instagramUrl};',
    'const perfilPublico={uid:user.uid,nome,cidade,uf,modalidade,posicao,categoria,time,bio,fotoUrl,fotoPath,capaUrl,capaPath,historicoCampeonatos,handle,instagramUrl,completo:true};'
)

# 5) Todos os Atletas: perfil básico também aparece, ainda que a cidade esteja pendente.
replace_once(
    "public.js",
    'profiles=[...profileMap.values()].filter(a=>a.nome&&a.cidade&&normal(a.status)!=="inativo")',
    'profiles=[...profileMap.values()].filter(a=>a.nome&&normal(a.status)!=="inativo")'
)

# 6) ADM: botão ABRIR PERFIL / CRIAR E ABRIR PERFIL.
replace_once(
    "site-v7-autoload.js",
    "      import('./admin-commerce-v11.js?v=20260904-2')",
    "      import('./admin-commerce-v11.js?v=20260904-2'),\n      import('./admin-profile-browser-v13.js?v=20260904-3')"
)

# 7) Cache bust explícito nas páginas críticas.
for path in ["conta.html", "atletas.html"]:
    p=Path(path);s=p.read_text(encoding="utf-8");s=s.replace("?v=20260904-2",f"?v={VERSION}");p.write_text(s,encoding="utf-8")
for path in ["site-v7-autoload.js", "analytics.js"]:
    p=Path(path);s=p.read_text(encoding="utf-8");s=s.replace("site-v5.js?v=20260904-2",f"site-v5.js?v={VERSION}").replace("site-v7-autoload.js?v=20260904-2",f"site-v7-autoload.js?v={VERSION}");p.write_text(s,encoding="utf-8")

# Service worker novo para expulsar cópias antigas do shell.
p=Path("sw.js");s=p.read_text(encoding="utf-8");s=s.replace("bd-atletas-v8-20260904-2","bd-atletas-v13-20260904-3");p.write_text(s,encoding="utf-8")

print("V13 profile sync patch aplicado")
