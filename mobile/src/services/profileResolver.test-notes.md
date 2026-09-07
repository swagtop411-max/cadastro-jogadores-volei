Resolver de perfil V1

Ordem de leitura sem sobrescrever o Firestore:
1. perfis/{uid}
2. usuarios/{uid}
3. atletas where ownerUid == uid

O legado atletas só é consultado quando perfis/{uid} ainda não possui dados esportivos úteis.
Campos vazios do perfil são preenchidos em memória a partir de usuarios/atletas.
Nenhum documento é gravado por este resolvedor.
