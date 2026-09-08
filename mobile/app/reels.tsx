import { useVideoPlayer, VideoView } from "expo-video";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, FlatList, Pressable, Share, StyleSheet, Text, View, ViewToken } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { loadCompleteMobileFeed, type MobileFeedItemV2 } from "@/services/feedService";
import { loadPostSocialState, toggleLike, toggleSaved, type SocialPostState } from "@/services/socialService";
import { brand } from "@/ui/brand";

const HEIGHT = Dimensions.get("window").height;
const EMPTY: SocialPostState = { liked:false,saved:false,likeCount:0,commentCount:0 };

function Reel({ item, active }: { item: MobileFeedItemV2; active: boolean }) {
  const router=useRouter();
  const [social,setSocial]=useState<SocialPostState>(EMPTY);
  const [acting,setActing]=useState(false);
  const player=useVideoPlayer(item.mediaUrl,(p)=>{p.loop=true;});
  useEffect(()=>{ if(active) player.play(); else player.pause(); return()=>player.pause(); },[active,player]);
  useEffect(()=>{loadPostSocialState(item.id).then(setSocial).catch(()=>undefined);},[item.id]);
  async function like(){if(acting)return;setActing(true);try{const liked=await toggleLike(item.id,social.liked);setSocial(p=>({...p,liked,likeCount:Math.max(0,p.likeCount+(liked?1:-1))}));}catch(cause){Alert.alert("Reels",cause instanceof Error?cause.message:"Não foi possível curtir.");}finally{setActing(false);}}
  async function save(){if(acting)return;setActing(true);try{const saved=await toggleSaved(item.id,"video",social.saved);setSocial(p=>({...p,saved}));}catch(cause){Alert.alert("Reels",cause instanceof Error?cause.message:"Não foi possível salvar.");}finally{setActing(false);}}
  async function share(){await Share.share({message:[item.text,item.mediaUrl,`Reel de ${item.authorName} no Banco de Atletas`].filter(Boolean).join("\n\n")});}
  return <View style={styles.reel}>
    <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false}/>
    <View style={styles.scrim}/>
    <SafeAreaView style={styles.overlay} edges={["top","bottom"]} pointerEvents="box-none">
      <View style={styles.top}><Pressable onPress={()=>router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable><Text style={styles.title}>Reels</Text><View style={styles.live}><Text style={styles.liveText}>VÍDEOS</Text></View></View>
      <View style={styles.bottom}>
        <View style={styles.copy}>
          <Pressable onPress={()=>item.ownerUid&&router.push({pathname:"/athlete/[uid]",params:{uid:item.ownerUid}})}><Text style={styles.author}>@{item.authorName}</Text></Pressable>
          {item.text?<Text numberOfLines={3} style={styles.caption}>{item.text}</Text>:null}
          {item.hashtags.length?<Text numberOfLines={1} style={styles.tags}>{item.hashtags.map(t=>`#${t}`).join("  ")}</Text>:null}
        </View>
        <View style={styles.actions}>
          <Pressable onPress={()=>void like()} style={styles.action}><Text style={[styles.icon,social.liked&&styles.liked]}>{social.liked?"♥":"♡"}</Text><Text style={styles.count}>{social.likeCount}</Text></Pressable>
          <Pressable onPress={()=>router.push({pathname:"/post/[id]",params:{id:item.id,kind:"video"}})} style={styles.action}><Text style={styles.icon}>◌</Text><Text style={styles.count}>{social.commentCount}</Text></Pressable>
          <Pressable onPress={()=>void share()} style={styles.action}><Text style={styles.icon}>↗</Text><Text style={styles.actionLabel}>ENVIAR</Text></Pressable>
          <Pressable onPress={()=>void save()} style={styles.action}><Text style={[styles.icon,social.saved&&styles.saved]}>{social.saved?"◆":"◇"}</Text><Text style={styles.actionLabel}>SALVAR</Text></Pressable>
        </View>
      </View>
    </SafeAreaView>
  </View>;
}

export default function ReelsScreen(){
  const [items,setItems]=useState<MobileFeedItemV2[]>([]);const [activeId,setActiveId]=useState("");const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);
  useEffect(()=>{loadCompleteMobileFeed().then(feed=>{const videos=feed.filter(i=>i.kind==="video"&&i.mediaUrl);setItems(videos);setActiveId(videos[0]?.id||"");}).catch(c=>setError(c instanceof Error?c.message:"Não foi possível carregar os Reels.")).finally(()=>setLoading(false));},[]);
  const onViewableItemsChanged=useRef(({viewableItems}:{viewableItems:ViewToken<MobileFeedItemV2>[]})=>{const first=viewableItems.find(v=>v.isViewable)?.item;if(first)setActiveId(first.id);}).current;
  if(loading)return <View style={styles.center}><ActivityIndicator size="large" color={brand.colors.cyan}/><Text style={styles.muted}>Carregando Reels…</Text></View>;
  if(!items.length)return <View style={styles.center}><Text style={styles.emptyTitle}>Nenhum Reel publicado ainda</Text><Text style={styles.muted}>{error||"Os vídeos verticais da comunidade aparecerão aqui."}</Text></View>;
  return <FlatList data={items} keyExtractor={i=>i.id} pagingEnabled showsVerticalScrollIndicator={false} decelerationRate="fast" snapToInterval={HEIGHT} viewabilityConfig={{itemVisiblePercentThreshold:60}} onViewableItemsChanged={onViewableItemsChanged} renderItem={({item})=><Reel item={item} active={activeId===item.id}/>}/>;
}

const styles=StyleSheet.create({reel:{height:HEIGHT,backgroundColor:"#000"},scrim:{...StyleSheet.absoluteFill,backgroundColor:"rgba(0,0,0,.18)"},overlay:{flex:1,justifyContent:"space-between"},top:{flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:12,paddingTop:5},back:{width:42,height:42,borderRadius:21,alignItems:"center",justifyContent:"center",backgroundColor:"rgba(0,0,0,.4)"},backText:{color:"#fff",fontSize:34,lineHeight:36},title:{flex:1,color:"#fff",fontSize:25,fontWeight:"900",textShadowColor:"#000",textShadowRadius:5},live:{borderRadius:brand.radius.pill,backgroundColor:"rgba(0,0,0,.55)",paddingHorizontal:10,paddingVertical:6},liveText:{color:brand.colors.cyan,fontSize:8,fontWeight:"900"},bottom:{flexDirection:"row",alignItems:"flex-end",gap:12,padding:15,paddingBottom:28},copy:{flex:1},author:{color:"#fff",fontSize:14,fontWeight:"900",textShadowColor:"#000",textShadowRadius:4},caption:{marginTop:7,color:"#fff",fontSize:13,lineHeight:19,textShadowColor:"#000",textShadowRadius:4},tags:{marginTop:7,color:brand.colors.cyanSoft,fontSize:11,fontWeight:"800"},actions:{gap:14,alignItems:"center"},action:{alignItems:"center",minWidth:46},icon:{color:"#fff",fontSize:28,fontWeight:"800",textShadowColor:"#000",textShadowRadius:5},liked:{color:"#ff6277"},saved:{color:brand.colors.gold},count:{marginTop:2,color:"#fff",fontSize:9,fontWeight:"900"},actionLabel:{marginTop:2,color:"#fff",fontSize:7,fontWeight:"900"},center:{flex:1,alignItems:"center",justifyContent:"center",gap:10,padding:24,backgroundColor:brand.colors.bgDeep},muted:{color:brand.colors.muted,textAlign:"center",lineHeight:19},emptyTitle:{color:brand.colors.text,fontSize:20,fontWeight:"900",textAlign:"center"}});
