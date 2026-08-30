# CHECKPOINT — 2026-08-28

## Estado atual
- Repositório: swagtop411-max/cadastro-jogadores-volei
- Branch: main
- Último commit: 5ef50a0b095a24d0fa180a3f32127959833f589b
- Correção aplicada: ranking deixou de consultar a coleção de atletas durante o carregamento inicial; a consulta passou a ocorrer somente ao abrir o ranking.
- Auditoria confirmou que a homepage utiliza public.js para carregar atletas e apoiadores e que o carregamento integral da coleção de atletas ainda é o principal gargalo técnico.
- A área de equipes já é carregada sob demanda.
- A próxima otimização estrutural deve usar carregamento progressivo/paginação da coleção de atletas e manter imagens fora do documento sempre que possível.

## Pendências
- Aplicar carregamento progressivo dos atletas na homepage.
- Reduzir consultas secundárias no primeiro paint.
- Validar a área pública de atletas após a otimização.
- Revisar regras Firebase/Firestore sem alterar permissões sem validação.
- Executar nova auditoria funcional após publicação.

## Regra de continuidade
Preservar layout, dados, cadastro, comunidade, equipes, ranking e integrações existentes. Alterações devem ser incrementais e validadas antes de substituir arquivos inteiros.


## CHECKPOINT 2026-08-30 — Auditoria e correções estruturais
- Ranking consolidado em uma única fonte por UID/ID legado, com união e deduplicação do histórico de campeonatos.
- Histórico de campeonatos do perfil deduplicado antes de salvar e antes de calcular pontuação.
- Fluxo do menu de ranking mantido como drawer na página atual, sem redirecionamento para o feed.
- Upload de fotos no perfil social passou a usar upload simples para imagens, evitando travamento da sessão resumable em 0%/10%.
- Publicações, stories e vídeos novos passam a nascer como pendentes e entram na fila de moderação.
- Painel Comunidade ampliado para moderar publicações, stories, vídeos e comentários.
- Regras Firestore endurecidas para conteúdo social, incluindo campos permitidos e bloqueio de alteração de status/aprovação pelo proprietário.
- Regras Storage separadas por finalidade e com limites de tamanho/tipo.
- Perfil público passou a ser salvo com schema público, evitando novos campos privados no documento público.
- Leituras públicas iniciais receberam limites e URLs de mídia passaram a usar allowlist básica.
- Assets receberam versionamento de cache nas páginas principais.
- JavaScript corrigido passou por validação de parsing; regras tiveram validação estrutural de delimitadores.
- Importante: as regras do Firestore/Storage precisam ser publicadas no projeto Firebase para entrarem efetivamente em produção. O console remoto não foi autenticado durante a auditoria.
