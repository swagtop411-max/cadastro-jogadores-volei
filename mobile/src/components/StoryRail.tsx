import { getAuth } from "@react-native-firebase/auth";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { groupStories, loadActiveStories, type StoryGroup } from "@/services/storyService";
import { brand } from "@/ui/brand";

export function StoryRail() {
  const router = useRouter();
  const currentUid = getAuth().currentUser?.uid || "";
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setGroups(groupStories(await loadActiveStories()));
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void load();
  }, [load]));

  const currentGroup = useMemo(() => groups.find((group) => group.ownerUid === currentUid), [currentUid, groups]);
  const visibleGroups = useMemo(() => groups.filter((group) => group.ownerUid !== currentUid), [currentUid, groups]);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>STORIES</Text>
          <Text style={styles.subtitle}>Momentos que ficam no ar por 24 horas</Text>
        </View>
        <Pressable onPress={() => router.push("/stories/create")} hitSlop={10}>
          <Text style={styles.createLink}>+ NOVO STORY</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Pressable
          onPress={() => currentGroup
            ? router.push({ pathname: "/stories/[ownerUid]", params: { ownerUid: currentUid } })
            : router.push("/stories/create")}
          style={({ pressed }) => [styles.storyButton, pressed && styles.pressed]}
        >
          <View style={[styles.ring, currentGroup && styles.ringActive]}>
            <View style={styles.addCircle}>
              <Text style={styles.addIcon}>{currentGroup ? "◉" : "+"}</Text>
            </View>
            {!currentGroup ? <View style={styles.addBadge}><Text style={styles.addBadgeText}>+</Text></View> : null}
          </View>
          <Text numberOfLines={1} style={styles.storyName}>{currentGroup ? "Seu Story" : "Criar Story"}</Text>
        </Pressable>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator size="small" color={brand.colors.cyan} /></View>
        ) : visibleGroups.map((group) => (
          <Pressable
            key={group.ownerUid}
            onPress={() => router.push({ pathname: "/stories/[ownerUid]", params: { ownerUid: group.ownerUid } })}
            style={({ pressed }) => [styles.storyButton, pressed && styles.pressed]}
          >
            <View style={[styles.ring, group.hasUnseen ? styles.ringActive : styles.ringSeen]}>
              {group.ownerPhoto ? (
                <Image source={{ uri: group.ownerPhoto }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}><Text style={styles.avatarText}>{group.ownerName.slice(0, 1).toUpperCase()}</Text></View>
              )}
            </View>
            <Text numberOfLines={1} style={styles.storyName}>{group.ownerName}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 13, borderWidth: 1, borderColor: brand.colors.borderSoft, borderRadius: brand.radius.xl, backgroundColor: brand.colors.surface, paddingVertical: 13, ...brand.shadow },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 14, marginBottom: 10 },
  eyebrow: { color: brand.colors.cyan, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  subtitle: { marginTop: 2, color: brand.colors.muted, fontSize: 9 },
  createLink: { color: brand.colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 0.45 },
  row: { paddingHorizontal: 12, gap: 10 },
  storyButton: { width: 72, alignItems: "center" },
  ring: { width: 66, height: 66, borderRadius: 33, padding: 3, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.borderSoft },
  ringActive: { backgroundColor: brand.colors.cyan },
  ringSeen: { backgroundColor: brand.colors.muted },
  avatar: { width: 58, height: 58, borderRadius: 29, borderWidth: 3, borderColor: brand.colors.surface, backgroundColor: brand.colors.bgDeep },
  avatarFallback: { width: 58, height: 58, borderRadius: 29, borderWidth: 3, borderColor: brand.colors.surface, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.bgDeep },
  avatarText: { color: brand.colors.cyanSoft, fontSize: 18, fontWeight: "900" },
  addCircle: { width: 58, height: 58, borderRadius: 29, borderWidth: 3, borderColor: brand.colors.surface, alignItems: "center", justifyContent: "center", backgroundColor: brand.colors.bgDeep },
  addIcon: { color: brand.colors.gold, fontSize: 27, fontWeight: "900" },
  addBadge: { position: "absolute", right: 0, bottom: 1, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: brand.colors.surface, backgroundColor: brand.colors.gold },
  addBadgeText: { color: brand.colors.bgDeep, fontSize: 14, fontWeight: "900", lineHeight: 16 },
  storyName: { width: 72, marginTop: 6, color: brand.colors.text, fontSize: 9, fontWeight: "800", textAlign: "center" },
  loading: { width: 66, height: 66, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.72 },
});
