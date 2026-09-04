# Mobile Data Contract V1

Status: proposta de contrato canônico para Web + App.

Objetivo: impedir que o aplicativo replique a dívida histórica de `usuarios`, `perfis` e `atletas` com modelos diferentes.

## Princípios

1. UID do Firebase Auth é a identidade principal da pessoa.
2. `usuarios/{uid}` guarda conta e dados privados/operacionais.
3. `perfis/{uid}` guarda somente dados públicos exibíveis.
4. `atletas/{id}` é legado e deve ser migrado/compatibilizado por `ownerUid`.
5. Estado financeiro não é autoritativo quando escrito pelo cliente.
6. Conteúdo social sempre carrega `ownerUid`, `aprovado`, `status`, `visibilidade` e timestamps.
7. Nenhum cliente mobile deve ler coleção inteira para filtrar localmente quando houver possibilidade de escala.

## Coleção `usuarios/{uid}`

Acesso: dono e ADM/backend.

Campos públicos/identificadores mínimos:

```ts
interface UserAccount {
  uid: string;
  nome: string;
  email: string;
  papel: 'usuario' | 'organizador' | 'admin';
  status: 'ativo' | 'suspenso' | 'excluido';
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}
```

Dados pessoais opcionais ficam aqui ou em subdocumento privado, nunca em `perfis`:

- nascimento;
- contato;
- e-mail;
- estado de verificação;
- preferências;
- flags operacionais.

Planos/pagamentos futuros devem migrar para documento server-owned, por exemplo:

`usuarios/{uid}/privado/billing`

## Coleção `perfis/{uid}`

Acesso: público conforme regras de privacidade do perfil.

```ts
interface PublicProfile {
  uid: string;
  nome: string;
  cidade: string;
  uf: string;
  modalidade: string;
  posicao: string;
  categoria: '' | 'Iniciante' | 'Intermediário' | 'Avançado';
  time: string;
  bio: string;
  fotoUrl: string;
  fotoPath: string;
  capaUrl: string;
  capaPath: string;
  handle: string;
  instagramUrl: string;
  historicoCampeonatos: ChampionshipHistoryItem[];
  completo: boolean;
}
```

`completo:false` permite conta nova aparecer na rede sem inventar dados esportivos.

## Coleção legado `atletas/{id}`

Status futuro: migration-only.

Regras para transição:

- se `ownerUid` existe, o perfil canônico é `perfis/{ownerUid}`;
- ao editar perfil moderno, sincronizar somente campos estritamente necessários ao legado enquanto ele existir;
- novos recursos do app não devem depender de `atletas`;
- criar plano de migração para aposentar a coleção depois que todos os registros reivindicáveis forem tratados.

## Conteúdo social

### `publicacoes/{postId}`

```ts
interface Post {
  ownerUid: string;
  nome?: string;
  texto?: string;
  legenda: string;
  tipo: 'imagem' | 'carrossel';
  imagemUrl: string;
  imagemPath?: string;
  midias?: MediaItem[];
  hashtags: string[];
  mencoes: string[];
  visibilidade: 'publico' | 'privado';
  aprovado: boolean;
  status: 'publicado' | 'removido';
  criadoEm: Timestamp;
}
```

### `videos/{videoId}`

Mesmo contrato social com `videoUrl`, metadados de mídia e `visibilidade`.

### `stories/{storyId}`

Campos mínimos:

- ownerUid;
- mediaUrl;
- tipo;
- legenda;
- visibilidade;
- criadoEm;
- expiraEm;
- aprovado;
- status.

## Social graph

- `seguidores/{targetUid}/usuarios/{followerUid}`
- `seguindo/{ownerUid}/usuarios/{targetUid}`
- `solicitacoes_seguir/{targetUid}/usuarios/{requesterUid}`
- `bloqueios/{ownerUid}/usuarios/{blockedUid}`

No futuro considerar reduzir escrita duplicada `seguidores` + `seguindo` por backend transacional, caso o volume cresça.

## Direct

### `conversas/{conversationId}`

ID determinístico: dois UIDs ordenados e unidos por separador estável.

```ts
interface Conversation {
  participants: [string, string];
  lastMessage: string;
  lastSenderUid: string;
  lastMessageAt: Timestamp;
  lastReadBy: string[];
  createdAt: Timestamp;
}
```

### `conversas/{conversationId}/mensagens/{messageId}`

```ts
interface Message {
  senderUid: string;
  text: string;
  type: 'text' | 'image' | 'video';
  mediaUrl?: string;
  mediaPath?: string;
  mediaMime?: string;
  mediaSize?: number;
  createdAt: Timestamp;
}
```

## Equipes

`equipes/{teamId}` deve conter apenas campos públicos da equipe.

Dados privados do responsável ficam em:

`equipes/{teamId}/privado/dados`

Mobile nunca deve exibir contato privado sem autorização explícita.

## Campeonatos

`campeonatos/{id}` é agenda pública aprovada.

Separar no futuro:

- evento;
- inscrições;
- participantes/equipes;
- resultados;
- patrocinadores;
- mídia.

Não colocar listas ilimitadas de inscrições/resultados dentro de um único documento.

## Ranking

A regra de pontos atual pode ser mantida como função pura compartilhada no curto prazo.

Em escala, o app deve consumir um ranking materializado/server-calculated, evitando recalcular todo o histórico de todos os atletas no cliente.

## Organizador / Sorteio

O algoritmo `sortearTimes` deve virar pacote/função pura sem Firebase e sem DOM.

Entrada sugerida:

```ts
interface DrawAthlete {
  uid?: string;
  nome: string;
  genero: 'M' | 'F';
  nivel: 1 | 2 | 3;
}
```

Saída:

```ts
interface DrawResult {
  ok: boolean;
  times: DrawTeam[];
  fila: DrawAthlete[];
  equilibrio: number;
  erro?: string;
}
```

## Monetização

Estado financeiro futuro deve ser server-owned.

Clientes Web/App podem criar somente intenções/solicitações.

Exemplo:

`billing/{uid}` ou `usuarios/{uid}/privado/billing`

Campos autoritativos somente backend:

- entitlement;
- plano;
- status;
- origem da compra;
- transaction/receipt IDs;
- período atual;
- renovação;
- cancelamento;
- chargeback/refund.

## Busca e paginação

Evitar `getDocs(collection(...))` sem limites em telas mobile.

Todos os diretórios devem possuir:

- `limit`;
- cursor `startAfter`;
- ordenação estável;
- filtros indexáveis;
- estados loading/empty/error/retry.

Para busca textual em escala, avaliar serviço de busca dedicado ou índices denormalizados server-side.

## Campos proibidos em documentos públicos

Nunca publicar diretamente:

- senha;
- token;
- API secret;
- data de nascimento completa, salvo requisito explícito e política adequada;
- telefone/e-mail privado;
- dados financeiros;
- comprovante de pagamento;
- claims/roles sensíveis manipuláveis pelo cliente.

## Versionamento

Ao iniciar o app, todos os novos contratos TypeScript devem possuir versão lógica de schema e migrations documentadas. Alterações incompatíveis devem ser tratadas como migração, não como simples mudança silenciosa de campo.
