# Segurança V29

- Push tokens são privados por usuário e não carregam segredo de envio no app.
- Convites de equipe só podem ser criados pelo responsável da equipe e respondidos pelo atleta convidado.
- Entrada em `equipes/{equipeId}/membros` exige convite aceito no mesmo batch ou ação do responsável.
- Bloqueios e denúncias usam as regras de moderação existentes.
