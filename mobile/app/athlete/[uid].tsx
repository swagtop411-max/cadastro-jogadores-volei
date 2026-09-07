import { getAuth } from "@react-native-firebase/auth";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SectionTitle } from "@/components/BrandHeader";
import type { ChampionshipHistoryItemV1, PublicProfileV1 } from "@/contracts/schema-v1";
import { loadCompleteMobileFeed, type MobileFeedItemV2 } from "@/services/feedService";
import { resolveLegacyAthleteById, resolveProfile } from "@/services/profileResolver";
import { loadFollowState, toggleFollow, type FollowState } from "@/services/socialService";
import { brand } from "@/ui/brand";

const EMPTY_FOLLOW: FollowState = { following: false, requested: false, privateProfile: false, followerCount: 0, followingCount: 0 };
function historyTitle(item: ChampionshipHistoryItemV1) { return String(item.campeonato || item.nome || item.evento || "Campeonato").trim(); }
function historyPlacement(item: ChampionshipHistoryItemV1) { return String(item.colocacao || item.resultado || "Participação").trim(); }
function historyYear(item: ChampionshipHistoryItemV1) { return String(item.ano || item.data || "").trim(); }
function placementPoints(value: unknown) {
  const normalized = String(value || "").trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/(^|\s)(1[ºo°]?|primeiro|campeao)/.test(normalized)) return 100;
  if (/(^|\s)(2[ºo°]?|segundo)/.test(normalized)) return 80;
  if (/(^|\s)(3[ºo°]?|terceiro)/.test(normalized)) return 65;
  if (/(^|\s)(4[ºo°]?|quarto)/.test(normalized)) return 55;
  if (/(^|\s)[5-8][ºo°]?/.test(normalized)) return 40;
  return 10;
}

export default function AthleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uid?: string; athleteId?: string }>();
  const uid = typeof params.uid === "string" ? params.uid : "";
  const athleteId = typeof params.athleteId === "string" ? params.athleteId : "";
  const currentUid = getAuth().currentUser?.uid || "";
  const [profile, setProfile] = useState<PublicProfileV1 | null>(null);
  const [posts, setPosts] = useState<MobileFeedItemV2[]>([]);
  const [follow, setFollow] = useState<FollowState>(EMPTY_FOLLOW);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid && !athleteId) { setLoading(false); setError("Atleta não informado."); return; }
    setLoading(true); setError(null);
    try {
      const resolved = athleteId ? await resolveLegacyAthleteById(athleteId) : (await resolveProfile(uid)).resolved;
      setProfile(resolved);
      const targetUid = resolved?.uid || uid;
      const [nextFollow, feed] = await Promise.all([
        targetUid ? loadFollowState(targetUid).catch(() => EMPTY_FOLLOW) : Promise.resolve(EMPTY_FOLLOW),
        targetUid ? loadCompleteMobileFeed().catch(() => []) : Promise.resolve([]),
      ]);
      setFollow(nextFollow);
      setPosts(feed.filter((item) => item.ownerUid === targetUid).slice(0, 30));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o atleta.");
    } finally { setLoading(false); }
  }, [athleteId, uid]);

  useEffect(() => { void load(); }, [load]);
  const history = profile?.historicoCampeonatos || [];
  const totalPoints = useMemo(() => history.reduce((sum, item) => sum + placementPoints(item.colocacao || item.resultado), 0), [history]);
  const targetUid = profile?.uid || uid;
  const isSelf = Boolean(currentUid && targetUid === currentUid);

  async function handleFollow() {
    if (!targetUid || acting) return;
    setActing(true);
    try {
      const result = await toggleFollow(targetUid, follow);
      setFollow((previous) => ({
        ...previous,
        following: result === "following",
        requested: result === "requested",
        followerCount: Math.max(0, previous.followerCount + (result === "following" && !previous.following ? 1 : result === "none" && previous.following ? -1 : 0)),
      }));
    } catch (cause) { Alert.alert("Seguir atleta", cause instanceof Error ? cause.message : "Não foi possível atualizar."); }
    finally { setActing(false); }
  }

  async function shareProfile() {
    if (!targetUid || !profile) return;
    const url = Linking.createURL(`/athlete/${targetUid}`);
    await Share.share({ message: `${profile.nome} • ${profile.modalidade || "Atleta"}\n${[profile.cidade, profile.uf].filter(Boolean).join(" / ")}\n${url}` });
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={brand.colors.cyan} /><Text style={styles.muted}>Carregando atleta…</Text></View>;
  if (error || !profile) return <View style={styles.center}><Text style={styles.errorTitle}>Perfil indisponível</Text><Text style={styles.muted}>{error || "Este atleta ainda não possui dados públicos."}</Text></View>;

  const city = [profile.cidade, profile.uf].filter(Boolean).join(" / ");
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.coverWrap}>{profile.capaUrl ? <Image source={{ uri: profile.capaUrl }} style={styles.cover} /> : <View style={styles.coverFallback}><View style={styles.coverGlow} /><Text style={styles.coverBrand}>BANCO DE ATLETAS</Text><Text style={styles.coverTagline}>CONECTA TALENTOS • MOVE O ESPORTE</Text></View>}<View style={styles.coverLineCyan} /><View style={styles.coverLineGold} /></View>

      <View style={styles.hero}>
        {profile.fotoUrl ? <Image source={{ uri: profile.fotoUrl }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{profile.nome.slice(0, 1).toUpperCase()}</Text></View>}
        <Text style={styles.name}>{profile.nome}</Text>
        {profile.handle ? <Text style={styles.handle}>@{profile.handle}</Text> : null}
        <Text style={styles.category}>{profile.categoria || "Categoria não informada"}</Text>
        {city ? <Text style={styles.city}>{city}</Text> : null}
        <View style={styles.heroChipRow}>{profile.modalidade ? <View style={styles.heroChip}><Text style={styles.heroChipText}>{profile.modalidade}</Text></View> : null}{profile.time ? <View style={styles.heroChipGold}><Text style={styles.heroChipGoldText}>{profile.time}</Text></View> : null}</View>
      </View>

      <View style={styles.statsRow}>
        <Pressable style={styles.statCard} onPress={() => targetUid && router.push({ pathname: "/connections/[uid]", params: { uid: targetUid, mode: "followers" } })}><Text style={styles.statValue}>{follow.followerCount}</Text><Text style={styles.statLabel}>SEGUIDORES</Text></Pressable>
        <Pressable style={styles.statCard} onPress={() => targetUid && router.push({ pathname: "/connections/[uid]", params: { uid: targetUid, mode: "following" } })}><Text style={styles.statValue}>{follow.followingCount}</Text><Text style={styles.statLabel}>SEGUINDO</Text></Pressable>
        <View style={styles.statCard}><Text style={[styles.statValue, styles.statValueGold]}>{totalPoints}</Text><Text style={styles.statLabel}>PONTOS</Text></View>
      </View>

      <View style={styles.actions}>
        {isSelf ? <Pressable onPress={() => router.push("/profile/edit")} style={styles.primary}><Text style={styles.primaryText}>EDITAR PERFIL</Text></Pressable> : <Pressable disabled={acting} onPress={() => void handleFollow()} style={[styles.primary, follow.following && styles.primaryFollowing]}><Text style={styles.primaryText}>{acting ? "…" : follow.following ? "SEGUINDO ✓" : follow.requested ? "SOLICITADO" : "SEGUIR"}</Text></Pressable>}
        {!isSelf && targetUid ? <Pressable onPress={() => router.push({ pathname: "/messages/[uid]", params: { uid: targetUid } })} style={styles.secondary}><Text style={styles.secondaryText}>✉ MENSAGEM</Text></Pressable> : null}
        <Pressable onPress={() => void shareProfile()} style={styles.share}><Text style={styles.shareText}>↗</Text></Pressable>
      </View>

      {profile.bio ? <View style={styles.bio}><Text style={styles.bioLabel}>SOBRE</Text><Text style={styles.bioText}>{profile.bio}</Text></View> : null}

      <SectionTitle eyebrow="PUBLICAÇÕES" title="Momentos do atleta" action={`${posts.length}`} />
      {posts.length ? <View style={styles.grid}>{posts.map((post) => <Pressable key={post.id} onPress={() => router.push({ pathname: "/post/[id]", params: { id: post.id, kind: post.kind } })} style={styles.gridItem}>{post.mediaUrl ? <Image source={{ uri: post.mediaUrl }} style={styles.gridImage} /> : <View style={styles.gridFallback}><Text style={styles.gridFallbackText}>{post.kind === "video" ? "▶" : "POST"}</Text></View>}{post.media.length > 1 ? <View style={styles.gridBadge}><Text style={styles.gridBadgeText}>{post.media.length}</Text></View> : null}</Pressable>)}</View> : <View style={styles.emptyHistory}><Text style={styles.emptyHistoryTitle}>Ainda sem publicações</Text><Text style={styles.muted}>Quando {isSelf ? "você publicar" : "este atleta publicar"}, os conteúdos aparecem aqui.</Text></View>}

      <SectionTitle eyebrow="DADOS ESPORTIVOS" title="Informações do atleta" />
      <View style={styles.card}><Info label="Modalidade" value={profile.modalidade || "Não informada"} /><Info label="Posição" value={profile.posicao || "Não informada"} /><Info label="Categoria" value={profile.categoria || "Não informada"} /><Info label="Time / equipe" value={profile.time || "Não informado"} /></View>

      <SectionTitle eyebrow="TRAJETÓRIA" title="Histórico de campeonatos" action={`${history.length}`} />
      {history.length ? <View style={styles.historyList}>{history.map((item, index) => <View key={`${historyTitle(item)}-${historyPlacement(item)}-${historyYear(item)}-${index}`} style={styles.historyItem}><View style={styles.medalBadge}><Text style={styles.medalText}>{historyPlacement(item).slice(0, 3).toUpperCase()}</Text></View><View style={styles.historyCopy}><Text style={styles.historyName}>{historyTitle(item)}</Text><Text style={styles.historyMeta}>{[historyPlacement(item), historyYear(item), item.modalidade, item.categoria].filter(Boolean).join(" • ")}</Text></View><Text style={styles.historyPoints}>{placementPoints(item.colocacao || item.resultado)} pts</Text></View>)}</View> : <View style={styles.emptyHistory}><Text style={styles.emptyHistoryTitle}>Nenhum campeonato registrado</Text></View>}

      {profile.instagramUrl ? <Pressable onPress={() => void Linking.openURL(profile.instagramUrl)} style={styles.instagram}><Text style={styles.instagramText}>ABRIR INSTAGRAM</Text><Text style={styles.instagramArrow}>›</Text></Pressable> : null}
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: brand.colors.bg, padding: 16, paddingBottom: 60 }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: brand.colors.bg, padding: 24 }, muted: { color: brand.colors.muted, textAlign: "center", lineHeight: 19 }, errorTitle: { color: brand.colors.text, fontSize: 20, fontWeight: "900" },
  coverWrap: { position: "relative", overflow: "hidden", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface }, cover: { width: "100%", height: 180 }, coverFallback: { height: 180, justifyContent: "flex-end", overflow: "hidden", backgroundColor: brand.colors.surfaceSoft, padding: 18 }, coverGlow: { position: "absolute", width: 220, height: 220, borderRadius: 110, top: -100, right: -80, backgroundColor: "rgba(24,213,255,0.11)" }, coverBrand: { color: brand.colors.text, fontSize: 18, fontWeight: "900" }, coverTagline: { marginTop: 4, color: brand.colors.gold, fontSize: 9, fontWeight: "900" }, coverLineCyan: { position: "absolute", left: 0, bottom: 0, height: 3, width: "76%", backgroundColor: brand.colors.cyan }, coverLineGold: { position: "absolute", right: 0, bottom: 0, height: 3, width: "24%", backgroundColor: brand.colors.gold },
  hero: { alignItems: "center", marginTop: -38, marginHorizontal: 12, borderWidth: 1, borderColor: brand.colors.cyan, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, padding: 20, ...brand.shadow }, avatar: { width: 112, height: 112, borderRadius: 56, borderWidth: 3, borderColor: brand.colors.cyan }, avatarFallback: { width: 112, height: 112, borderRadius: 56, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: brand.colors.cyan, backgroundColor: brand.colors.surfaceSoft }, avatarText: { color: brand.colors.cyanSoft, fontSize: 42, fontWeight: "900" }, name: { marginTop: 14, color: brand.colors.text, fontSize: 28, lineHeight: 32, fontWeight: "900", textAlign: "center" }, handle: { color: brand.colors.mutedStrong, marginTop: 2 }, category: { marginTop: 5, color: brand.colors.cyan, fontSize: 13, fontWeight: "900" }, city: { marginTop: 5, color: brand.colors.mutedStrong }, heroChipRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 7, marginTop: 10 }, heroChip: { borderRadius: brand.radius.pill, backgroundColor: brand.colors.surfaceRaised, paddingHorizontal: 10, paddingVertical: 6 }, heroChipText: { color: brand.colors.cyanSoft, fontSize: 9, fontWeight: "900" }, heroChipGold: { borderRadius: brand.radius.pill, backgroundColor: "#3c2c0d", paddingHorizontal: 10, paddingVertical: 6 }, heroChipGoldText: { color: brand.colors.gold, fontSize: 9, fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 10 }, statCard: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, paddingVertical: 11 }, statValue: { color: brand.colors.cyan, fontSize: 18, fontWeight: "900" }, statValueGold: { color: brand.colors.gold }, statLabel: { marginTop: 2, color: brand.colors.muted, fontSize: 7, fontWeight: "900", letterSpacing: 0.5 },
  actions: { flexDirection: "row", gap: 7, marginTop: 10 }, primary: { flex: 1.1, alignItems: "center", justifyContent: "center", minHeight: 46, borderRadius: brand.radius.md, backgroundColor: brand.colors.cyan }, primaryFollowing: { backgroundColor: brand.colors.surfaceRaised, borderWidth: 1, borderColor: brand.colors.cyan }, primaryText: { color: brand.colors.bgDeep, fontSize: 9, fontWeight: "900" }, secondary: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 46, borderWidth: 1, borderColor: brand.colors.gold, borderRadius: brand.radius.md, backgroundColor: "#3c2c0d" }, secondaryText: { color: brand.colors.gold, fontSize: 9, fontWeight: "900" }, share: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: brand.colors.border, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface }, shareText: { color: brand.colors.text, fontSize: 20 },
  bio: { marginTop: 12, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.lg, backgroundColor: brand.colors.surface, padding: 14 }, bioLabel: { color: brand.colors.cyan, fontSize: 8, fontWeight: "900", letterSpacing: 1 }, bioText: { marginTop: 5, color: brand.colors.text, fontSize: 13, lineHeight: 19 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 4 }, gridItem: { position: "relative", width: "32.5%", aspectRatio: 1, overflow: "hidden", borderRadius: 8, backgroundColor: brand.colors.surface }, gridImage: { width: "100%", height: "100%" }, gridFallback: { flex: 1, alignItems: "center", justifyContent: "center" }, gridFallbackText: { color: brand.colors.cyan, fontWeight: "900" }, gridBadge: { position: "absolute", right: 5, top: 5, minWidth: 21, height: 21, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,.7)" }, gridBadgeText: { color: "#fff", fontSize: 8, fontWeight: "900" },
  card: { borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.lg, backgroundColor: brand.colors.surface, paddingHorizontal: 16 }, info: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.colors.borderSoft, paddingVertical: 14 }, infoLabel: { color: brand.colors.cyan, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }, infoValue: { marginTop: 5, color: brand.colors.text, fontSize: 15 },
  historyList: { gap: 9 }, historyItem: { flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, padding: 12 }, medalBadge: { width: 45, height: 45, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#3c2c0d" }, medalText: { color: brand.colors.gold, fontSize: 10, fontWeight: "900" }, historyCopy: { flex: 1 }, historyName: { color: brand.colors.text, fontSize: 14, fontWeight: "900" }, historyMeta: { marginTop: 3, color: brand.colors.muted, fontSize: 10 }, historyPoints: { color: brand.colors.cyanSoft, fontSize: 9, fontWeight: "900" }, emptyHistory: { borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.surface, padding: 18 }, emptyHistoryTitle: { color: brand.colors.text, fontWeight: "900", marginBottom: 5 },
  instagram: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, borderWidth: 1, borderColor: brand.colors.cyanSoft, borderRadius: brand.radius.md, backgroundColor: brand.colors.cyan, paddingVertical: 14, paddingHorizontal: 16 }, instagramText: { color: brand.colors.bgDeep, fontWeight: "900" }, instagramArrow: { color: brand.colors.bgDeep, fontSize: 24, fontWeight: "900" },
});
