import { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { brand } from "@/ui/brand";

type LaunchScreenProps = {
  message?: string;
  error?: boolean;
};

export function LaunchScreen({
  message = "Conectando talentos, movendo o esporte…",
  error = false,
}: LaunchScreenProps) {
  const { width, height } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  const logoSize = useMemo(() => Math.min(168, Math.max(124, width * 0.34)), [width]);
  const orbSize = useMemo(() => Math.max(width * 0.9, 340), [width]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 14,
        stiffness: 110,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  return (
    <View style={styles.page}>
      <StatusBar barStyle="light-content" backgroundColor={brand.colors.bgDeep} />

      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbTop,
          { width: orbSize, height: orbSize, borderRadius: orbSize / 2 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbBottom,
          {
            width: orbSize * 0.72,
            height: orbSize * 0.72,
            borderRadius: (orbSize * 0.72) / 2,
          },
        ]}
      />
      <View pointerEvents="none" style={styles.arcOne} />
      <View pointerEvents="none" style={styles.arcTwo} />

      <Animated.View
        style={[
          styles.content,
          {
            minHeight: Math.min(height * 0.72, 610),
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={styles.logoHalo}>
          <View style={styles.logoFrame}>
            <Image
              source={require("../../assets/branding/app-icon.png")}
              style={{ width: logoSize, height: logoSize }}
              resizeMode="contain"
            />
          </View>
        </View>

        <Text style={styles.eyebrow}>REDE ESPORTIVA</Text>
        <Text style={styles.brandTitle}>
          Banco de <Text style={styles.brandAccent}>Atletas</Text>
        </Text>
        <Text style={styles.url}>cadastrodeatletas.com.br</Text>

        <View style={styles.rule}>
          <View style={styles.ruleCyan} />
          <View style={styles.ruleGold} />
        </View>

        <Text style={styles.tagline}>Conectando talentos no esporte</Text>
        <Text style={styles.subline}>Atletas • equipes • campeonatos • oportunidades</Text>

        <View style={styles.loaderArea}>
          {!error ? <ActivityIndicator color={brand.colors.cyan} size="small" /> : null}
          <Text style={[styles.message, error && styles.errorMessage]}>{message}</Text>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.footerDot} />
        <Text style={styles.footerText}>BANCO DE ATLETAS</Text>
        <View style={styles.footerLine} />
        <Text style={styles.footerGold}>MAIS ESPORTE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: brand.colors.bgDeep,
    paddingHorizontal: 24,
  },
  orb: {
    position: "absolute",
    backgroundColor: "rgba(24, 213, 255, 0.055)",
  },
  orbTop: {
    top: -210,
    right: -170,
    borderWidth: 1,
    borderColor: "rgba(24, 213, 255, 0.10)",
  },
  orbBottom: {
    bottom: -180,
    left: -130,
    backgroundColor: "rgba(244, 197, 74, 0.035)",
    borderWidth: 1,
    borderColor: "rgba(244, 197, 74, 0.08)",
  },
  arcOne: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: "rgba(24, 213, 255, 0.07)",
    transform: [{ rotate: "22deg" }],
    top: "23%",
  },
  arcTwo: {
    position: "absolute",
    width: 340,
    height: 120,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: "rgba(244, 197, 74, 0.06)",
    transform: [{ rotate: "-18deg" }],
    bottom: "20%",
  },
  content: {
    width: "100%",
    maxWidth: 430,
    alignItems: "center",
    justifyContent: "center",
  },
  logoHalo: {
    width: 206,
    height: 206,
    borderRadius: 103,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(24, 213, 255, 0.045)",
    borderWidth: 1,
    borderColor: "rgba(24, 213, 255, 0.13)",
  },
  logoFrame: {
    width: 178,
    height: 178,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8, 36, 58, 0.92)",
    borderWidth: 1.5,
    borderColor: brand.colors.cyan,
    shadowColor: brand.colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.20,
    shadowRadius: 18,
    elevation: 9,
  },
  eyebrow: {
    marginTop: 28,
    color: brand.colors.gold,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 3.2,
  },
  brandTitle: {
    marginTop: 7,
    color: brand.colors.text,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1.1,
    textAlign: "center",
  },
  brandAccent: {
    color: brand.colors.cyan,
  },
  url: {
    marginTop: 4,
    color: brand.colors.muted,
    fontSize: 12,
    letterSpacing: 1.35,
  },
  rule: {
    width: "72%",
    maxWidth: 280,
    flexDirection: "row",
    gap: 7,
    marginTop: 24,
  },
  ruleCyan: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: brand.colors.cyan,
  },
  ruleGold: {
    width: 58,
    height: 4,
    borderRadius: 999,
    backgroundColor: brand.colors.gold,
  },
  tagline: {
    marginTop: 25,
    color: brand.colors.text,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  subline: {
    marginTop: 7,
    color: brand.colors.mutedStrong,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  loaderArea: {
    minHeight: 58,
    marginTop: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    marginTop: 10,
    color: brand.colors.muted,
    fontSize: 12,
    textAlign: "center",
  },
  errorMessage: {
    color: brand.colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 28,
    flexDirection: "row",
    alignItems: "center",
  },
  footerDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: brand.colors.cyan,
    marginRight: 9,
  },
  footerText: {
    color: brand.colors.mutedStrong,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  footerLine: {
    flex: 1,
    height: 1,
    marginHorizontal: 10,
    backgroundColor: brand.colors.borderSoft,
  },
  footerGold: {
    color: brand.colors.gold,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
});
