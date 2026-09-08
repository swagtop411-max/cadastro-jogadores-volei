import { getAuth } from "@react-native-firebase/auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SocialPostCard } from "@/components/SocialPostCard";
import { loadCompleteMobileFeed, type MobileFeedItemV2 } from "@/services/feedService";
import { addComment, deleteOwnComment, loadComments, type SocialComment } from "@/services/socialService";
import { deleteOwnPost, updateOwnPostCaption } from "@/services/socialPublishService";
import { formatFirebaseDate } from "@/services/mobileContent";
import { brand } from "@/ui/brand";

export default function PostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; kind?: string }>();
  const id = String(params.id || "");
  const currentUid = getAuth().currentUser?.uid || "";
  const [item, setItem] = useState<MobileFeedItemV2 | null>(null);
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) { setError("Publicação inválida."); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const [feed, nextComments] = await Promise.all([loadCompleteMobileFeed(), loadComments(id).catch(() => [])]);
      const found = feed.find((entry) => entry.id === id) || null;
      setItem(found);
      setCaption(found?.text || "");
      setComments(nextComments);
      if (!found) setError("Esta publicação não está disponível ou não pode ser visualizada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir a publicação.");
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function sendComment() {
    if (!comment.trim() || acting) return;
    setActing(true); setError(null);
    try {
      await addComment(id, comment);
      setComment("");
      setComments(await loadComments(id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível comentar."); }
    finally { setActing(false); }
  }

  async function removeComment(entry: SocialComment) {
    try { await deleteOwnComment(entry.id); setComments((current) => current.filter((value) => value.id !== entry.id)); }
    catch (cause) { Alert.alert("Comentário", cause instanceof Error ? cause.message : "Não foi possível excluir."); }
  }

  async function saveCaption() {
    if (!item || acting) return;
    setActing(true); setError(null);
    try {
      await updateOwnPostCaption(item.id, item.kind, caption);
      setItem((current) => current ? { ...current, text: caption } : current);
      setEditing(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível editar a legenda."); }
    finally { setActing(false); }
  }

  function confirmDelete() {
    if (!item) return;
    Alert.alert("Excluir publicação", "Esta ação remove a publicação da rede. Deseja continuar?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => {
        setActing(true);
        try { await deleteOwnPost(item.id, item.kind); router.back(); }
        catch (cause) { setActing(false); Alert.alert("Excluir", cause instanceof Error ? cause.message : "Não foi possível excluir a publicação."); }
      } },
    ]);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={brand.colors.cyan} /><Text style={styles.muted}>Abrindo publicação…</Text></View>;
  if (!item) return <View style={styles.center}><Text style={styles.errorTitle}>Publicação indisponível</Text><Text style={styles.muted}>{error || "Conteúdo não encontrado."}</Text><Pressable onPress={() => router.back()} style={styles.backPrimary}><Text style={styles.backPrimaryText}>VOLTAR</Text></Pressable></View>;

  const isOwner = Boolean(currentUid && item.ownerUid === currentUid);
  return (
    <SafeAreaView style={styles.safe} edges={["top","bottom"]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable><View style={styles.headerCopy}><Text style={styles.eyebrow}>PUBLICAÇÃO</Text><Text style={styles.title}>Post</Text></View>{isOwner ? <Pressable onPress={() => setEditing((value) => !value)} style={styles.ownerButton}><Text style={styles.ownerButtonText}>EDITAR</Text></Pressable> : null}</View>

          <SocialPostCard item={item} />

          {isOwner && editing ? <View style={styles.editor}><Text style={styles.editorTitle}>EDITAR LEGENDA</Text><TextInput value={caption} onChangeText={setCaption} maxLength={2200} multiline placeholderTextColor={brand.colors.muted} style={styles.editorInput}/><Text style={styles.counter}>{caption.length}/2200</Text><View style={styles.editorActions}><Pressable disabled={acting} onPress={() => setEditing(false)} style={styles.cancel}><Text style={styles.cancelText}>CANCELAR</Text></Pressable><Pressable disabled={acting} onPress={() => void saveCaption()} style={styles.save}><Text style={styles.saveText}>{acting?"SALVANDO…":"SALVAR"}</Text></Pressable></View><Pressable disabled={acting} onPress={confirmDelete} style={styles.delete}><Text style={styles.deleteText}>EXCLUIR PUBLICAÇÃO</Text></Pressable></View> : null}

          <View style={styles.commentsHead}><View><Text style={styles.commentsEyebrow}>COMUNIDADE</Text><Text style={styles.commentsTitle}>Comentários</Text></View><View style={styles.commentCount}><Text style={styles.commentCountText}>{comments.length}</Text></View></View>
          <View style={styles.commentList}>{comments.map((entry) => <Pressable key={entry.id} onLongPress={() => entry.ownerUid === currentUid && removeComment(entry)} style={styles.commentRow}><View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{entry.nome.slice(0,1).toUpperCase()}</Text></View><View style={styles.commentCopy}><View style={styles.commentNameRow}><Text style={styles.commentName}>{entry.nome}</Text><Text style={styles.commentTime}>{formatFirebaseDate(entry.createdAt)}</Text></View><Text style={styles.commentText}>{entry.texto}</Text>{entry.ownerUid===currentUid?<Text style={styles.ownHint}>Segure para excluir</Text>:null}</View></Pressable>)}</View>
          {!comments.length ? <View style={styles.emptyComments}><Text style={styles.emptyCommentsTitle}>Seja o primeiro a comentar</Text><Text style={styles.muted}>Converse sobre o treino, resultado ou momento publicado.</Text></View> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.composer}><TextInput value={comment} onChangeText={setComment} maxLength={500} placeholder="Adicionar comentário…" placeholderTextColor={brand.colors.muted} style={styles.input}/><Pressable disabled={acting||!comment.trim()} onPress={() => void sendComment()} style={[styles.send,(acting||!comment.trim())&&styles.disabled]}>{acting?<ActivityIndicator size="small" color={brand.colors.bgDeep}/>:<Text style={styles.sendText}>➤</Text>}</Pressable></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:brand.colors.bg},root:{flex:1},page:{padding:14,paddingBottom:20},header:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:10},back:{width:42,height:42,borderRadius:21,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:brand.colors.borderSoft,backgroundColor:brand.colors.surface},backText:{color:brand.colors.text,fontSize:32,lineHeight:34},headerCopy:{flex:1},eyebrow:{color:brand.colors.cyan,fontSize:8,fontWeight:"900",letterSpacing:1},title:{color:brand.colors.text,fontSize:23,fontWeight:"900"},ownerButton:{borderWidth:1,borderColor:brand.colors.gold,borderRadius:brand.radius.pill,backgroundColor:"#3c2c0d",paddingHorizontal:11,paddingVertical:8},ownerButtonText:{color:brand.colors.gold,fontSize:8,fontWeight:"900"},editor:{marginTop:11,borderWidth:1,borderColor:brand.colors.borderSoft,borderRadius:brand.radius.lg,backgroundColor:brand.colors.surface,padding:13},editorTitle:{color:brand.colors.cyan,fontSize:9,fontWeight:"900",letterSpacing:.8},editorInput:{minHeight:95,marginTop:8,borderWidth:1,borderColor:brand.colors.border,borderRadius:brand.radius.md,backgroundColor:brand.colors.bgDeep,color:brand.colors.text,padding:11,textAlignVertical:"top"},counter:{alignSelf:"flex-end",marginTop:4,color:brand.colors.muted,fontSize:8},editorActions:{flexDirection:"row",gap:8,marginTop:8},cancel:{flex:1,alignItems:"center",borderWidth:1,borderColor:brand.colors.border,borderRadius:brand.radius.md,padding:11},cancelText:{color:brand.colors.mutedStrong,fontSize:9,fontWeight:"900"},save:{flex:1,alignItems:"center",borderRadius:brand.radius.md,backgroundColor:brand.colors.cyan,padding:11},saveText:{color:brand.colors.bgDeep,fontSize:9,fontWeight:"900"},delete:{alignItems:"center",marginTop:9,borderWidth:1,borderColor:brand.colors.danger,borderRadius:brand.radius.md,padding:10},deleteText:{color:brand.colors.danger,fontSize:8,fontWeight:"900"},commentsHead:{flexDirection:"row",alignItems:"flex-end",justifyContent:"space-between",marginTop:18,marginBottom:9},commentsEyebrow:{color:brand.colors.gold,fontSize:8,fontWeight:"900",letterSpacing:1},commentsTitle:{marginTop:2,color:brand.colors.text,fontSize:20,fontWeight:"900"},commentCount:{minWidth:31,height:31,borderRadius:16,alignItems:"center",justifyContent:"center",backgroundColor:"#0a4160"},commentCountText:{color:brand.colors.cyan,fontSize:10,fontWeight:"900"},commentList:{gap:7},commentRow:{flexDirection:"row",gap:9,borderWidth:1,borderColor:brand.colors.borderSoft,borderRadius:brand.radius.md,backgroundColor:brand.colors.surface,padding:10},commentAvatar:{width:37,height:37,borderRadius:19,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:brand.colors.cyan,backgroundColor:brand.colors.bgDeep},commentAvatarText:{color:brand.colors.cyanSoft,fontWeight:"900"},commentCopy:{flex:1},commentNameRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},commentName:{color:brand.colors.text,fontSize:11,fontWeight:"900"},commentTime:{color:brand.colors.muted,fontSize:7},commentText:{marginTop:4,color:brand.colors.mutedStrong,fontSize:11,lineHeight:16},ownHint:{marginTop:4,color:brand.colors.gold,fontSize:7,fontWeight:"800"},emptyComments:{borderWidth:1,borderColor:brand.colors.borderSoft,borderRadius:brand.radius.lg,backgroundColor:brand.colors.surface,padding:18},emptyCommentsTitle:{color:brand.colors.text,fontWeight:"900",textAlign:"center",marginBottom:5},composer:{flexDirection:"row",alignItems:"center",gap:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:brand.colors.borderSoft,backgroundColor:brand.colors.surface,padding:10},input:{flex:1,minHeight:42,maxHeight:90,borderWidth:1,borderColor:brand.colors.border,borderRadius:21,backgroundColor:brand.colors.bgDeep,color:brand.colors.text,paddingHorizontal:13,paddingVertical:9},send:{width:42,height:42,borderRadius:21,alignItems:"center",justifyContent:"center",backgroundColor:brand.colors.gold},sendText:{color:brand.colors.bgDeep,fontSize:18,fontWeight:"900"},disabled:{opacity:.4},error:{marginTop:10,borderRadius:brand.radius.md,backgroundColor:brand.colors.dangerBg,color:"#ffd5dd",padding:10},center:{flex:1,alignItems:"center",justifyContent:"center",gap:10,padding:24,backgroundColor:brand.colors.bg},muted:{color:brand.colors.muted,textAlign:"center",lineHeight:18},errorTitle:{color:brand.colors.text,fontSize:20,fontWeight:"900"},backPrimary:{marginTop:8,borderRadius:brand.radius.md,backgroundColor:brand.colors.cyan,paddingHorizontal:20,paddingVertical:12},backPrimaryText:{color:brand.colors.bgDeep,fontWeight:"900"}});
