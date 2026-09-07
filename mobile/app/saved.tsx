import { getAuth } from "@react-native-firebase/auth";
import { collection, getDocs, getFirestore } from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SocialPostCard } from "@/components/SocialPostCard";
import { loadCompleteMobileFeed, type MobileFeedItemV2 } from "@/services/feedService";
import { brand } from "@/ui/brand";

const db = getFirestore();
function norm(value: unknown) { return String(value || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

export default function SavedScreen() {
  const router = useRouter();
  const uid = getAuth().currentUser?.uid || "";
  const [items, setItems] = useState<MobileFeedItemV2[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!uid) { setLoading(false); setError("Entre na sua conta para ver publicações salvas."); return; }
    Promise.all([getDocs(collection(db, "salvos", uid, "publicacoes")), loadCompleteMobileFeed()])
      .then(([saved, feed]) => {
        if (!mounted) return;
        const ids = new Set(saved.docs.map((entry) => entry.id));
        setItems(feed.filter((item) => ids.has(item.id)));
      })
      .catch((cause) => mounted && setError(cause instanceof Error ? cause.message : "Não foi possível carregar seus salvos."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [uid]);

  const visible = useMemo(() => {
    const term = norm(search.trim());
    if (!term) return items;
    return items.filter((item) => norm(`${item.authorName} ${item.text} ${item.hashtags.join(" ")}`).includes(term));
  }, [items, search]);

  return (
    <SafeAreaView style={styles.safe} edges={["top","bottom"]}>
      <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable><View style={styles.headerCopy}><Text style={styles.eyebrow}>SUA COLEÇÃO</Text><Text style={styles.title}>Salvos</Text><Text style={styles.subtitle}>{items.length} publicação{items.length===1?"":"ões"}</Text></View></View>
      <View style={styles.searchWrap}><Text style={styles.searchIcon}>⌕</Text><TextInput value={search} onChangeText={setSearch} placeholder="Buscar nos salvos…" placeholderTextColor={brand.colors.muted} style={styles.search}/></View>
      <FlatList data={visible} keyExtractor={(item)=>`${item.kind}-${item.id}`} contentContainerStyle={styles.list} ItemSeparatorComponent={()=><View style={styles.separator}/>} renderItem={({item})=><SocialPostCard item={item}/>} ListEmptyComponent={loading?<View style={styles.center}><ActivityIndicator color={brand.colors.cyan}/><Text style={styles.muted}>Carregando salvos…</Text></View>:<View style={styles.empty}><Text style={styles.emptyIcon}>◇</Text><Text style={styles.emptyTitle}>Sua coleção está vazia</Text><Text style={styles.muted}>{error||"Toque no ícone de salvar em uma publicação para guardar conteúdos aqui."}</Text></View>}/>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:brand.colors.bg},header:{flexDirection:"row",alignItems:"center",gap:11,padding:14},back:{width:42,height:42,borderRadius:21,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:brand.colors.borderSoft,backgroundColor:brand.colors.surface},backText:{color:brand.colors.text,fontSize:32,lineHeight:34},headerCopy:{flex:1},eyebrow:{color:brand.colors.gold,fontSize:8,fontWeight:"900",letterSpacing:1},title:{color:brand.colors.text,fontSize:25,fontWeight:"900"},subtitle:{marginTop:2,color:brand.colors.muted,fontSize:10},searchWrap:{flexDirection:"row",alignItems:"center",marginHorizontal:14,marginBottom:9,borderWidth:1,borderColor:brand.colors.border,borderRadius:brand.radius.md,backgroundColor:brand.colors.surface,paddingHorizontal:12},searchIcon:{color:brand.colors.cyan,fontSize:22,marginRight:7},search:{flex:1,color:brand.colors.text,paddingVertical:12},list:{padding:14,paddingTop:4,paddingBottom:35},separator:{height:14},center:{alignItems:"center",gap:9,paddingVertical:50},muted:{color:brand.colors.muted,textAlign:"center",lineHeight:19},empty:{alignItems:"center",borderWidth:1,borderColor:brand.colors.borderSoft,borderRadius:brand.radius.xl,backgroundColor:brand.colors.surface,padding:25},emptyIcon:{color:brand.colors.gold,fontSize:34},emptyTitle:{marginTop:8,marginBottom:6,color:brand.colors.text,fontSize:17,fontWeight:"900"}});
