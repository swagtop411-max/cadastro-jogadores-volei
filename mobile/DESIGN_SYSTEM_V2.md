# Design System V2 — Banco de Atletas

## Direção visual

A interface mobile segue a identidade esportiva premium da marca Banco de Atletas: fundo azul-marinho profundo, superfícies em azul petróleo, ciano elétrico como cor funcional e dourado como cor de destaque.

## Cores principais

- Fundo: `#031525`
- Fundo profundo: `#020d18`
- Superfície: `#08243a`
- Superfície elevada: `#0d3551`
- Borda: `#154e70`
- Ciano: `#18d5ff`
- Ciano claro: `#7eeaff`
- Dourado: `#f4c54a`
- Texto: `#f7fbff`
- Texto secundário: `#9ab0c0`

## Princípios

1. Cards com cantos arredondados, borda discreta e profundidade.
2. Ciano para ação, seleção, conectividade e identidade digital.
3. Dourado para conquista, campeonatos, trajetória e pontos de atenção.
4. Tipografia de alto contraste e hierarquia forte.
5. Navegação inferior elevada e central de publicação em destaque.
6. Fotos esportivas ocupam áreas amplas, sem distorção.
7. Nenhuma estatística fictícia: a interface apresenta apenas dados reais disponíveis no backend.

## Telas cobertas

- Splash e carregamento
- Login
- Cadastro
- Recuperação de senha
- Feed
- Explorar atletas
- Publicar
- Campeonatos
- Perfil do usuário
- Perfil público do atleta
- Editor de perfil

## Base reutilizável

- `src/ui/brand.ts`: tokens de cor, raio e sombra.
- `src/components/BrandHeader.tsx`: cabeçalho de marca e títulos de seção.
- `app/(tabs)/_layout.tsx`: navegação inferior premium.

A evolução futura deve reutilizar esses tokens em vez de introduzir novas cores isoladas por tela.
