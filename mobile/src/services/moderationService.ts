import { getAuth } from "@react-native-firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc } from "@react-native-firebase/firestore";

const db=getFirestore();
export type ReportTarget="publicacao"|"comentario"|"perfil"|"equipe";
function requireUid(){const uid=getAuth().currentUser?.uid;if(!uid)throw new Error("Entre na sua conta para usar este recurso.");return uid;}
export async function isUserBlocked(targetUid:string){const uid=getAuth().currentUser?.uid;if(!uid||!targetUid||uid===targetUid)return false;return (await getDoc(doc(db,"bloqueios",uid,"usuarios",targetUid))).exists();}
export async function blockUser(targetUid:string){const uid=requireUid();if(!targetUid||targetUid===uid)throw new Error("Não é possível bloquear este perfil.");await setDoc(doc(db,"bloqueios",uid,"usuarios",targetUid),{uid:targetUid,criadoEm:serverTimestamp()});}
export async function unblockUser(targetUid:string){const uid=requireUid();await deleteDoc(doc(db,"bloqueios",uid,"usuarios",targetUid));}
export async function reportContent(input:{type:ReportTarget;targetId:string;reason:string;details?:string}){const uid=requireUid();const reason=input.reason.trim(),details=String(input.details||"").trim();if(reason.length<3)throw new Error("Informe o motivo da denúncia.");if(reason.length>300)throw new Error("O motivo deve ter no máximo 300 caracteres.");if(details.length>1000)throw new Error("Os detalhes devem ter no máximo 1.000 caracteres.");const created=await addDoc(collection(db,"denuncias"),{alvoTipo:input.type,alvoId:input.targetId,motivo:reason,detalhes:details,reportadoPorUid:uid,criadoEm:serverTimestamp(),status:"pendente"});return created.id;}
