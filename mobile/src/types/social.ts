export type PublicProfile = {
  uid: string;
  nome: string;
  cidade?: string;
  uf?: string;
  modalidade?: string;
  posicao?: string;
  categoria?: string;
  time?: string;
  bio?: string;
  fotoUrl?: string;
  capaUrl?: string;
  instagram?: string;
  historicoCampeonatos?: Array<{
    campeonato?: string;
    colocacao?: string;
    ano?: string;
  }>;
};

export type FeedPost = {
  id: string;
  ownerUid: string;
  nome?: string;
  legenda?: string;
  texto?: string;
  imagemUrl?: string;
  imagem?: string;
  tipo?: 'imagem' | 'carrossel';
  aprovado?: boolean;
  status?: string;
  criadoEm?: unknown;
};
