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

export type FeedMedia = {
  url: string;
  tipo?: 'image' | 'video' | string;
  type?: 'image' | 'video' | string;
  path?: string;
  mime?: string;
  bytes?: number;
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
  midias?: FeedMedia[];
  hashtags?: string[];
  mencoes?: string[];
  aprovado?: boolean;
  status?: string;
  criadoEm?: unknown;
};
