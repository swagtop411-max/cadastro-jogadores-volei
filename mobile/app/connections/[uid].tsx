import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { PublicProfileV1 } from "@/contracts/schema-v1";
import { resolveProfile } from "@/services/profileResolver";
import { loadFollowerRefs, loadFollowingRefs } from "@/services/socialService";
import { brand } from "@/ui/brand";

type Entry = { uid: string; profile: PublicProfileV1 | null };
function norm(value: unknown) { return String(value || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

export default function ConnectionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uid?: string; mode?: string }>();
  const uid = String(params.uid || "");
  const mode = params.mode === "following" ? "following" : "followers";
  const [items, setItems] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const request = mode === "following" ? loadFollowingRefs(uid) : loadFollowerRefs(uid);
    request.then(async (refs) => Promise.all(refs.map(async (entry) => {
      try { return { uid: entry.uid, profile: (await resolveProfile(entry.uid)).resolved }; }
      catch { return { uid: entry.uid, profile: null }; }
    }))).then((next) => mounted && setItems(next)).catch((cause) => mounted && setError(cause instanceof Error ? cause.message : "Não foi possível carregar."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [mode, uid]);

  const visible = useMemo(() => {
    const term = norm(search.trim());
    if (!term) return items;
    return items.filter(({ profile }) => norm(`${profile?.nome} ${profile?.cidade} ${profile?.modalidade} ${profile?.categoria}`).includes(term));
  }, [items, search]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable><View><Text style={styles.eyebrow}>REDE DO ATLETA</Text><Text style={styles.title}>{mode === "following" ? "Seguindo" : "Seguidores"}</Text></View><View style={styles.count}><Text style={styles.countText}>{items.length}</Text></View></View>
      <View style={styles.searchWrap}><Text style={styles.searchIcon}>⌕</Text><TextInput value={search} onChangeText={setSearch} placeholder="Buscar atleta…" placeholderTextColor={brand.colors.muted} style={styles.search} /></View>
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {loading ? <View style={styles.center}><ActivityIndicator color={brand.colors.cyan} /><Text style={styles.muted}>Carregando conexões…</Text></View> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !visible.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>Nenhum atleta aqui ainda</Text><Text style={styles.muted}>As conexões deste perfil aparecerão nesta lista.</Text></View> : null}
        {visible.map(({ uid: itemUid, profile }) => <Pressable key={itemUid} onPress={() => router.push({ pathname: "/athlete/[uid]", params: { uid: itemUid } })} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>{profile?.fotoUrl ? <Image source={{ uri: profile.fotoUrl }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{(profile?.nome || "A").slice(0, 1).toUpperCase()}</Text></View>}<View style={styles.copy}><Text style={styles.name}>{profile?.nome || "Atleta"}</Text><Text style={styles.meta}>{[profile?.cidade, profile?.uf, profile?.categoria].filter(Boolean).join(" • ") || "Perfil esportivo"}</Text>{profile?.modalidade ? <Text style={styles.sport}>{profile.modalidade}</Text> : null}</View><Text style={styles.arrow}>›</Text></Pressable>)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:brand.colors.bg},header:{flexDirection:"row",alignItems:"center",gap:11,padding:14},back:{width:42,height:42,borderRadius:21,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:brand.colors.borderSoft,backgroundColor:brand.colors.surface},backText:{color:brand.colors.text,fontSize:32,lineHeight:34},eyebrow:{color:brand.colors.cyan,fontSize:8,fontWeight:"900",letterSpacing:1},title:{color:brand.colors.text,fontSize:24,fontWeight:"900"},count:{marginLeft:"auto",minWidth:36,height:36,borderRadius:18,alignItems:"center",justifyContent:"center",backgroundColor:"#3c2c0d"},countText:{color:brand.colors.gold,fontWeight:"900"},searchWrap:{flexDirection:"row",alignItems:"center",marginHorizontal:14,marginBottom:8,borderWidth:1,borderColor:brand.colors.border,borderRadius:brand.radius.md,backgroundColor:brand.colors.surface,paddingHorizontal:12},searchIcon:{color:brand.colors.cyan,fontSize:22,marginRight:7},search:{flex:1,color:brand.colors.text,paddingVertical:12},list:{gap:8,padding:14,paddingTop:4,paddingBottom:30},row:{flexDirection:"row",alignItems:"center",gap:11,borderWidth:1,borderColor:brand.colors.borderSoft,borderRadius:brand.radius.lg,backgroundColor:brand.colors.surface,padding:11},avatar:{width:52,height:52,borderRadius:26,borderWidth:1,borderColor:brand.colors.cyan},avatarFallback:{width:52,height:52,borderRadius:26,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:brand.colors.cyan,backgroundColor:brand.colors.bgDeep},avatarText:{color:brand.colors.cyanSoft,fontWeight:"900",fontSize:18},copy:{flex:1},name:{color:brand.colors.text,fontSize:14,fontWeight:"900"},meta:{marginTop:3,color:brand.colors.muted,fontSize:9},sport:{marginTop:4,color:brand.colors.cyan,fontSize:9,fontWeight:"800"},arrow:{color:brand.colors.gold,fontSize:25},center:{alignItems:"center",gap:9,paddingVertical:45},muted:{color:brand.colors.muted,textAlign:"center",lineHeight:18},empty:{borderWidth:1,borderColor:brand.colors.borderSoft,borderRadius:brand.radius.xl,backgroundColor:brand.colors.surface,padding:22},emptyTitle:{color:brand.colors.text,fontSize:16,fontWeight:"900",textAlign:"center",marginBottom:6},error:{borderRadius:brand.radius.md,backgroundColor:brand.colors.dangerBg,color:"#ffd5dd",padding:11},pressed:{opacity:.75} });
