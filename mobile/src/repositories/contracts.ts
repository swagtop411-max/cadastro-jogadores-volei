import type {
  PostV1,
  PublicProfileV1,
  UserAccountV1,
} from "../contracts/schema-v1";

export interface PageCursor {
  value: unknown;
}

export interface PageResult<T> {
  items: T[];
  nextCursor: PageCursor | null;
  hasMore: boolean;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface AuthSession {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

export interface AuthRepository {
  observeSession(listener: (session: AuthSession | null) => void): () => void;
  signIn(email: string, password: string): Promise<AuthSession>;
  signUp(input: SignUpInput): Promise<AuthSession>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  sendEmailVerification(): Promise<void>;
  refreshSession(): Promise<AuthSession | null>;
}

export interface AccountRepository {
  getByUid(uid: string): Promise<UserAccountV1 | null>;
  ensureInitialAccount(input: Pick<UserAccountV1, "uid" | "nome" | "email">): Promise<void>;
}

export interface ProfileRepository {
  getByUid(uid: string): Promise<PublicProfileV1 | null>;
  ensureInitialProfile(input: Pick<PublicProfileV1, "uid" | "nome">): Promise<void>;
  updateOwnProfile(
    uid: string,
    patch: Partial<Omit<PublicProfileV1, "uid">>,
  ): Promise<void>;
  listProfiles(input: {
    limit: number;
    cursor?: PageCursor | null;
  }): Promise<PageResult<PublicProfileV1>>;
}

export interface AthleteSearchFilters {
  query?: string;
  city?: string;
  uf?: string;
  category?: PublicProfileV1["categoria"];
  modality?: string;
  position?: string;
}

export interface AthleteRepository {
  search(input: {
    filters: AthleteSearchFilters;
    limit: number;
    cursor?: PageCursor | null;
  }): Promise<PageResult<PublicProfileV1>>;
}

export interface FeedRepository {
  getFeed(input: {
    viewerUid: string;
    limit: number;
    cursor?: PageCursor | null;
  }): Promise<PageResult<PostV1>>;

  createPost(input: Omit<PostV1, "criadoEm" | "status" | "aprovado">): Promise<string>;
}

export interface FollowRepository {
  follow(viewerUid: string, targetUid: string): Promise<void>;
  unfollow(viewerUid: string, targetUid: string): Promise<void>;
  isFollowing(viewerUid: string, targetUid: string): Promise<boolean>;
}

export interface UploadRequest {
  ownerUid: string;
  purpose: "profile" | "cover" | "post" | "story" | "message";
  mimeType: string;
  fileName: string;
  fileSize: number;
}

export interface SignedUploadDescriptor {
  uploadUrl: string;
  publicId: string;
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
}

export interface UploadService {
  createSignedUpload(request: UploadRequest): Promise<SignedUploadDescriptor>;
}
