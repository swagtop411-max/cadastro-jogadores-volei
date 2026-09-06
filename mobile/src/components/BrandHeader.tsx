import { Image, StyleSheet, Text, View } from "react-native";

import { brand } from "@/ui/brand";

export function BrandHeader({
  title,
  eyebrow,
  subtitle,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <View style={styles.topRow}>
        <View style={styles.brandMark}>
          <Image
            source={require("../../assets/branding/app-icon.png")}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.brandName}>
            Banco de <Text style={styles.brandNameAccent}>Atletas</Text>
          </Text>
          <Text style={styles.brandUrl}>cadastrodeatletas.com.br</Text>
        </View>
      </View>

      <View style={styles.ruleRow}>
        <View style={styles.ruleCyan} />
        <View style={styles.ruleGold} />
      </View>

      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
}) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionCopy}>
        {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    overflow: "hidden",
    marginHorizontal: -2,
    marginBottom: 16,
    borderRadius: brand.radius.xl,
    borderWidth: 1,
    borderColor: brand.colors.borderSoft,
    backgroundColor: brand.colors.surface,
    padding: 18,
    ...brand.shadow,
  },
  glowOne: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 90,
    backgroundColor: "rgba(24,213,255,0.08)",
    right: -70,
    top: -90,
  },
  glowTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 70,
    backgroundColor: "rgba(244,197,74,0.06)",
    left: -60,
    bottom: -75,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: brand.colors.cyan,
    backgroundColor: brand.colors.bgDeep,
  },
  logo: { width: "100%", height: "100%" },
  brandCopy: { flex: 1 },
  brandName: { color: brand.colors.text, fontSize: 18, fontWeight: "900" },
  brandNameAccent: { color: brand.colors.cyan },
  brandUrl: { marginTop: 2, color: brand.colors.muted, fontSize: 10, letterSpacing: 0.7 },
  ruleRow: { flexDirection: "row", gap: 5, marginTop: 14 },
  ruleCyan: { height: 3, flex: 1, borderRadius: 999, backgroundColor: brand.colors.cyan },
  ruleGold: { height: 3, width: 54, borderRadius: 999, backgroundColor: brand.colors.gold },
  eyebrow: {
    marginTop: 14,
    color: brand.colors.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  title: { marginTop: 4, color: brand.colors.text, fontSize: 30, fontWeight: "900" },
  subtitle: { marginTop: 7, color: brand.colors.mutedStrong, fontSize: 13, lineHeight: 19 },
  sectionRow: {
    marginTop: 4,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionCopy: { flex: 1 },
  sectionEyebrow: { color: brand.colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  sectionTitle: { marginTop: 2, color: brand.colors.text, fontSize: 20, fontWeight: "900" },
  sectionAction: { color: brand.colors.cyan, fontSize: 11, fontWeight: "900" },
});
