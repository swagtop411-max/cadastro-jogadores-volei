export type UserRole = "usuario" | "organizador" | "admin";
export type UserStatus = "ativo" | "suspenso" | "excluido";
export type AthleteCategory = "" | "Iniciante" | "Intermediário" | "Avançado";
export type Visibility = "publico" | "privado";
export type SocialStatus = "publicado" | "removido";

export type TimestampLike = unknown;

export interface UserAccountV1 {
  uid: string;
  nome: string;
  email: string;
  papel: UserRole;
  status: UserStatus;
  criadoEm: TimestampLike;
  atualizadoEm: TimestampLike;
}

export interface ChampionshipHistoryItemV1 {
  campeonato?: string;
  nome?: string;
  evento?: string;
  colocacao?: string | number;
  resultado?: string;
  ano?: string | number;
  data?: string;
  modalidade?: string;
  categoria?: string;
}

export interface PublicProfileV1 {
  uid: string;
  nome: string;
  cidade: string;
  uf: string;
  modalidade: string;
  posicao: string;
  categoria: AthleteCategory;
  time: string;
  bio: string;
  fotoUrl: string;
  fotoPath: string;
  capaUrl: string;
  capaPath: string;
  handle: string;
  instagramUrl: string;
  historicoCampeonatos: ChampionshipHistoryItemV1[];
  completo: boolean;
}

export interface MediaItemV1 {
  url: string;
  path?: string;
  type: "image" | "video";
  mime?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface PostV1 {
  ownerUid: string;
  nome?: string;
  texto?: string;
  legenda: string;
  tipo: "imagem" | "carrossel";
  imagemUrl: string;
  imagemPath?: string;
  midias?: MediaItemV1[];
  hashtags: string[];
  mencoes: string[];
  visibilidade: Visibility;
  aprovado: boolean;
  status: SocialStatus;
  criadoEm: TimestampLike;
}

export interface StoryV1 {
  ownerUid: string;
  mediaUrl: string;
  mediaPath?: string;
  tipo: "image" | "video";
  legenda?: string;
  visibilidade: Visibility;
  criadoEm: TimestampLike;
  expiraEm: TimestampLike;
  aprovado: boolean;
  status: SocialStatus;
}

export interface ConversationV1 {
  participants: [string, string];
  lastMessage: string;
  lastSenderUid: string;
  lastMessageAt: TimestampLike;
  lastReadBy: string[];
  createdAt: TimestampLike;
}

export interface MessageV1 {
  senderUid: string;
  text: string;
  type: "text" | "image" | "video";
  mediaUrl?: string;
  mediaPath?: string;
  mediaMime?: string;
  mediaSize?: number;
  createdAt: TimestampLike;
}

export interface DrawAthleteV1 {
  uid?: string;
  nome: string;
  genero: "M" | "F";
  nivel: 1 | 2 | 3;
}

export interface DrawTeamV1 {
  numero: number;
  jogadores: DrawAthleteV1[];
  pontos: number;
}

export interface DrawResultV1 {
  ok: boolean;
  times: DrawTeamV1[];
  fila: DrawAthleteV1[];
  equilibrio: number;
  pontos?: number[];
  erro?: string;
}

export const SCHEMA_VERSION = 1 as const;
