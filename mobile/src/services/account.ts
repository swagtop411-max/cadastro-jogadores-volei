import { createUserWithEmailAndPassword, deleteUser, updateProfile, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';
import type { PublicProfile } from '@/src/types/social';

export const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] as const;
export const CATEGORIES = ['Iniciante','Intermediário','Avançado'] as const;

export type AccountForm = {
  nome: string;
  email: string;
  password: string;
  cidade: string;
  uf: string;
  modalidade: string;
  posicao: string;
  categoria: string;
  time?: string;
  bio?: string;
};

export type ProfileForm = Omit<AccountForm, 'email' | 'password'> & {
  fotoUrl?: string;
  fotoPath?: string;
  privado?: boolean;
};

function clean(value: unknown, max = 120) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

export function validateAccountForm(input: AccountForm) {
  const nome = clean(input.nome, 100);
  const email = clean(input.email, 180).toLowerCase();
  const cidade = clean(input.cidade, 100);
  const uf = clean(input.uf, 2).toUpperCase();
  const modalidade = clean(input.modalidade, 60);
  const posicao = clean(input.posicao, 80);
  const categoria = clean(input.categoria, 40);
  const time = clean(input.time, 100);
  const bio = String(input.bio || '').trim().slice(0, 500);

  if (nome.length < 2) throw new Error('Informe seu nome completo.');
  if (!email.includes('@')) throw new Error('Informe um e-mail válido.');
  if (input.password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
  if (cidade.length < 2) throw new Error('Informe sua cidade.');
  if (!(UFS as readonly string[]).includes(uf)) throw new Error('Informe uma UF válida.');
  if (!modalidade) throw new Error('Informe sua modalidade.');
  if (!posicao) throw new Error('Informe sua posição.');
  if (!(CATEGORIES as readonly string[]).includes(categoria)) throw new Error('Selecione uma categoria válida.');

  return { nome, email, cidade, uf, modalidade, posicao, categoria, time, bio };
}

export async function registerAccount(input: AccountForm) {
  const data = validateAccountForm(input);
  const credential = await createUserWithEmailAndPassword(auth, data.email, input.password);
  const user = credential.user;

  try {
    const common = {
      uid: user.uid,
      nome: data.nome,
      cidade: data.cidade,
      uf: data.uf,
      modalidade: data.modalidade,
      posicao: data.posicao,
      categoria: data.categoria,
      time: data.time,
      bio: data.bio,
      fotoUrl: '',
      fotoPath: '',
      capaUrl: '',
      capaPath: '',
      historicoCampeonatos: [],
    };

    await Promise.all([
      setDoc(doc(db, 'usuarios', user.uid), {
        ...common,
        email: data.email,
        papel: 'usuario',
        status: 'ativo',
        modalidades: [data.modalidade],
        posicoes: [data.posicao],
        plano: 'Gratuito',
        planoId: 'gratuito',
        valorPlano: 0,
        planoStatus: 'ativo',
        pagamentoConfirmado: true,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      }),
      setDoc(doc(db, 'perfis', user.uid), common),
      setDoc(doc(db, 'config_perfis', user.uid), {
        uid: user.uid,
        privado: false,
        atualizadoEm: serverTimestamp(),
      }),
      updateProfile(user, { displayName: data.nome }),
    ]);

    return user;
  } catch (error) {
    await deleteUser(user).catch(() => undefined);
    throw error;
  }
}

export async function saveProfile(user: User, input: ProfileForm) {
  const currentSnap = await getDoc(doc(db, 'perfis', user.uid));
  const current = currentSnap.exists() ? (currentSnap.data() as Partial<PublicProfile> & { fotoPath?: string; capaPath?: string }) : {};
  const validated = validateAccountForm({
    ...input,
    email: user.email || 'perfil@local.invalid',
    password: '******',
  });

  const payload = {
    uid: user.uid,
    nome: validated.nome,
    cidade: validated.cidade,
    uf: validated.uf,
    modalidade: validated.modalidade,
    posicao: validated.posicao,
    categoria: validated.categoria,
    time: validated.time,
    bio: validated.bio,
    fotoUrl: input.fotoUrl ?? current.fotoUrl ?? '',
    fotoPath: input.fotoPath ?? current.fotoPath ?? '',
    capaUrl: current.capaUrl ?? '',
    capaPath: current.capaPath ?? '',
    historicoCampeonatos: Array.isArray(current.historicoCampeonatos) ? current.historicoCampeonatos.slice(0, 30) : [],
  };

  await setDoc(doc(db, 'perfis', user.uid), payload);
  await setDoc(doc(db, 'config_perfis', user.uid), {
    uid: user.uid,
    privado: !!input.privado,
    atualizadoEm: serverTimestamp(),
  });
  await updateProfile(user, { displayName: validated.nome });

  try {
    const privateUser = await getDoc(doc(db, 'usuarios', user.uid));
    if (privateUser.exists()) {
      await updateDoc(doc(db, 'usuarios', user.uid), {
        nome: validated.nome,
        cidade: validated.cidade,
        uf: validated.uf,
        modalidade: validated.modalidade,
        modalidades: [validated.modalidade],
        posicao: validated.posicao,
        posicoes: [validated.posicao],
        categoria: validated.categoria,
        time: validated.time,
        bio: validated.bio,
        fotoUrl: payload.fotoUrl,
        fotoPath: payload.fotoPath,
        atualizadoEm: serverTimestamp(),
      });
    }
  } catch (error) {
    console.warn('Perfil público salvo; sincronização privada pendente.', error);
  }

  return payload;
}
