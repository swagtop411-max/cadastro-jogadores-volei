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
