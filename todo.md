# Tarefas do site

- [x] Confirmar o repositório do site publicado
- [x] Definir comunidade com feed, fotos, comentários e moderação
- [x] Criar a página `comunidade.html`
- [x] Criar os estilos responsivos da comunidade
- [x] Criar publicação de texto com foto opcional
- [x] Criar comentários moderados em publicações aprovadas
- [x] Criar compartilhamento de publicações
- [x] Criar aba de moderação no painel administrativo
- [x] Adicionar regras locais do Firestore para publicações e comentários
- [x] Validar sintaxe dos scripts e navegação local
- [ ] Publicar as novas regras no Firebase após autorização
- [ ] Enviar as alterações para o repositório de produção
- [ ] Testar uma publicação e um comentário reais após a ativação
- [ ] Revisar limites antispam e política de denúncia para uso público

## Aplicação em produção solicitada

- [ ] Validar novamente o pacote final antes do envio
- [ ] Criar commit das alterações da comunidade
- [ ] Solicitar confirmação para publicar o código no repositório de produção
- [ ] Publicar as regras novas do Firestore após confirmação
- [ ] Verificar a comunidade no domínio online
- [ ] Testar uma publicação e um comentário após a ativação

## Publicação autorizada

- [ ] Enviar o commit `6a79976` para o remoto do site
- [ ] Publicar as regras `publicacoes` e `comentarios_publicacoes` no Firebase
- [ ] Verificar a página online e o carregamento do feed
- [ ] Registrar o resultado final da publicação

## Auditoria antes de novas atualizações sociais

- [x] Comparar o estado local com o remoto e revisar o histórico de commits
- [x] Inventariar todos os arquivos e integrações adicionados recentemente
- [x] Revisar a comunidade, comentários, fotos e moderação atuais
- [x] Revisar o painel administrativo e possíveis conflitos com atualizações remotas
- [x] Conferir regras atuais/publicadas do Firestore
- [x] Conferir Firebase Storage e permissões de upload de imagens
- [x] Verificar o site online e os caminhos públicos da comunidade
- [x] Consolidar riscos, divergências e plano de atualização antes de implementar

## Evolução da rede social — novo escopo

- [ ] Auditar a autenticação e a identidade atual do site
- [ ] Definir vínculo entre conta, atleta, equipe e publicações
- [ ] Implementar login e recuperação de acesso
- [ ] Proteger criação e edição de cadastros próprios
- [ ] Migrar fotos existentes e novos uploads para Firebase Storage
- [ ] Implementar curtidas idempotentes em perfis de atletas
- [ ] Melhorar publicações, comentários e respostas da comunidade
- [ ] Implementar denúncias, bloqueios e fila de moderação
- [ ] Atualizar regras do Firestore e Storage
- [ ] Testar os fluxos autenticados e públicos sem dados reais

## Implementação autorizada iniciada

- [ ] Sincronizar o checkout com `origin/main` preservando as alterações remotas
- [ ] Criar contratos de dados para contas, proprietários, curtidas, fotos e denúncias
- [ ] Implementar autenticação de visitantes por e-mail e senha
- [ ] Vincular novos cadastros ao UID autenticado
- [ ] Implementar edição protegida do próprio atleta/equipe
- [ ] Migrar novos uploads de fotos para Firebase Storage
- [ ] Implementar curtidas idempotentes em perfis e publicações
- [ ] Ampliar comentários com respostas e denúncias
- [ ] Melhorar a fila de moderação e ações administrativas
- [ ] Atualizar regras Firestore/Storage e testar fluxos
