import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { brand } from "@/ui/brand";

type FullScreenImageViewerProps = {
  visible: boolean;
  uri: string;
  authorName?: string;
  caption?: string;
  onClose: () => void;
};

type TouchPoint = {
  pageX: number;
  pageY: number;
};

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function distance(touches: readonly TouchPoint[]) {
  if (touches.length < 2) return 0;
  const first = touches[0];
  const second = touches[1];
  if (!first || !second) return 0;
  return Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY);
}

export function FullScreenImageViewer({
  visible,
  uri,
  authorName,
  caption,
  onClose,
}: FullScreenImageViewerProps) {
  const { width, height } = Dimensions.get("window");
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const currentScale = useRef(1);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const pinchStartDistance = useRef(0);
  const pinchStartScale = useRef(1);
  const panStartX = useRef(0);
  const panStartY = useRef(0);
  const lastTap = useRef(0);
  const [loading, setLoading] = useState(true);

  const resetTransform = (animated = true) => {
    currentScale.current = 1;
    currentX.current = 0;
    currentY.current = 0;

    if (animated) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8 }),
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 8 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }),
      ]).start();
      return;
    }

    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
  };

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    resetTransform(false);
    if (uri) void Image.prefetch(uri).catch(() => undefined);
  }, [uri, visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (event) =>
          event.nativeEvent.touches.length >= 2 || currentScale.current > 1.01,
        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches as readonly TouchPoint[];
          if (touches.length >= 2) {
            pinchStartDistance.current = distance(touches);
            pinchStartScale.current = currentScale.current;
          } else {
            panStartX.current = currentX.current;
            panStartY.current = currentY.current;
          }
        },
        onPanResponderMove: (event, gesture) => {
          const touches = event.nativeEvent.touches as readonly TouchPoint[];
          if (touches.length >= 2) {
            const nextDistance = distance(touches);
            if (!pinchStartDistance.current || !nextDistance) return;
            const nextScale = clamp(
              pinchStartScale.current * (nextDistance / pinchStartDistance.current),
              MIN_SCALE,
              MAX_SCALE,
            );
            currentScale.current = nextScale;
            scale.setValue(nextScale);
            return;
          }

          if (currentScale.current <= 1.01) return;
          const horizontalLimit = width * 0.55 * (currentScale.current - 1);
          const verticalLimit = height * 0.45 * (currentScale.current - 1);
          const nextX = clamp(panStartX.current + gesture.dx, -horizontalLimit, horizontalLimit);
          const nextY = clamp(panStartY.current + gesture.dy, -verticalLimit, verticalLimit);
          currentX.current = nextX;
          currentY.current = nextY;
          translateX.setValue(nextX);
          translateY.setValue(nextY);
        },
        onPanResponderRelease: () => {
          pinchStartDistance.current = 0;
          if (currentScale.current <= 1.04) resetTransform();
        },
        onPanResponderTerminate: () => {
          pinchStartDistance.current = 0;
          if (currentScale.current <= 1.04) resetTransform();
        },
      }),
    [height, scale, translateX, translateY, width],
  );

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (currentScale.current > 1.05) {
        resetTransform();
      } else {
        currentScale.current = DOUBLE_TAP_SCALE;
        Animated.spring(scale, {
          toValue: DOUBLE_TAP_SCALE,
          useNativeDriver: true,
          friction: 8,
        }).start();
      }
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.backdrop}>
        <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
          <View pointerEvents="box-none" style={styles.topBar}>
            <View style={styles.topCopy}>
              <Text style={styles.brandLabel}>BANCO DE ATLETAS</Text>
              {authorName ? <Text style={styles.authorName}>{authorName}</Text> : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar imagem"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
        </SafeAreaView>

        <View style={styles.stage} {...panResponder.panHandlers}>
          <Pressable accessibilityRole="button" onPress={handleTap} style={styles.imageTouchArea}>
            <Animated.Image
              source={{ uri }}
              resizeMode="contain"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              style={[
                styles.image,
                {
                  width,
                  height: height * 0.78,
                  transform: [{ translateX }, { translateY }, { scale }],
                },
              ]}
            />
          </Pressable>
          {loading ? (
            <View pointerEvents="none" style={styles.loadingOverlay}>
              <ActivityIndicator color={brand.colors.cyan} size="large" />
              <Text style={styles.loadingText}>Carregando em alta qualidade…</Text>
            </View>
          ) : null}
        </View>

        <SafeAreaView pointerEvents="box-none" style={styles.bottomSafeArea}>
          <View style={styles.bottomPanel}>
            {caption ? (
              <Text numberOfLines={2} style={styles.caption}>
                {caption}
              </Text>
            ) : null}
            <Text style={styles.hint}>Dois dedos para zoom • arraste • toque duplo para ampliar</Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000000" },
  safeArea: { position: "absolute", zIndex: 5, left: 0, right: 0, top: 0 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  topCopy: { flex: 1, paddingRight: 12 },
  brandLabel: { color: brand.colors.cyan, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  authorName: { color: "#ffffff", fontSize: 14, fontWeight: "900", marginTop: 3 },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16, 36, 52, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(91, 218, 255, 0.35)",
  },
  closeText: { color: "#ffffff", fontSize: 30, lineHeight: 32, fontWeight: "300" },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  imageTouchArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { backgroundColor: "#000000" },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.36)",
  },
  loadingText: { color: "#d9e6ef", fontSize: 12, fontWeight: "700" },
  bottomSafeArea: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 5 },
  bottomPanel: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  caption: { color: "#ffffff", fontSize: 13, lineHeight: 18, marginBottom: 8 },
  hint: { color: "#97a9b8", fontSize: 10, fontWeight: "700", textAlign: "center" },
  pressed: { opacity: 0.72 },
});