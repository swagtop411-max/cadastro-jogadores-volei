import { StyleSheet, View, type ColorValue } from "react-native";

type TabIconName = "feed" | "explore" | "publish" | "championships" | "profile";

export function AppTabIcon({
  name,
  color,
  size = 24,
}: {
  name: TabIconName;
  color: ColorValue;
  size?: number;
}) {
  const scale = size / 24;

  return (
    <View style={[styles.canvas, { width: size, height: size }]}>
      {name === "feed" ? <HomeIcon color={color} scale={scale} /> : null}
      {name === "explore" ? <ExploreIcon color={color} scale={scale} /> : null}
      {name === "publish" ? <PublishIcon color={color} scale={scale} /> : null}
      {name === "championships" ? <TrophyIcon color={color} scale={scale} /> : null}
      {name === "profile" ? <ProfileIcon color={color} scale={scale} /> : null}
    </View>
  );
}

function HomeIcon({ color, scale }: IconProps) {
  return (
    <View style={styles.fullCanvas}>
      <View
        style={[
          styles.line,
          {
            backgroundColor: color,
            width: 12 * scale,
            height: 2.2 * scale,
            left: 2.8 * scale,
            top: 7.3 * scale,
            transform: [{ rotate: "-38deg" }],
          },
        ]}
      />
      <View
        style={[
          styles.line,
          {
            backgroundColor: color,
            width: 12 * scale,
            height: 2.2 * scale,
            right: 2.8 * scale,
            top: 7.3 * scale,
            transform: [{ rotate: "38deg" }],
          },
        ]}
      />
      <View
        style={{
          position: "absolute",
          left: 5 * scale,
          top: 10 * scale,
          width: 14 * scale,
          height: 11 * scale,
          borderWidth: 2 * scale,
          borderColor: color,
          borderRadius: 2 * scale,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 10.2 * scale,
          top: 14 * scale,
          width: 4 * scale,
          height: 7 * scale,
          borderWidth: 1.8 * scale,
          borderColor: color,
          borderBottomWidth: 0,
        }}
      />
    </View>
  );
}

function ExploreIcon({ color, scale }: IconProps) {
  return (
    <View style={styles.fullCanvas}>
      <View
        style={{
          position: "absolute",
          left: 3 * scale,
          top: 3 * scale,
          width: 13 * scale,
          height: 13 * scale,
          borderWidth: 2.2 * scale,
          borderColor: color,
          borderRadius: 7 * scale,
        }}
      />
      <View
        style={[
          styles.line,
          {
            backgroundColor: color,
            width: 9 * scale,
            height: 2.2 * scale,
            left: 14 * scale,
            top: 16 * scale,
            transform: [{ rotate: "45deg" }],
          },
        ]}
      />
    </View>
  );
}

function PublishIcon({ color, scale }: IconProps) {
  return (
    <View style={styles.fullCanvas}>
      <View
        style={[
          styles.line,
          {
            backgroundColor: color,
            width: 18 * scale,
            height: 2.4 * scale,
            left: 3 * scale,
            top: 10.8 * scale,
          },
        ]}
      />
      <View
        style={[
          styles.line,
          {
            backgroundColor: color,
            width: 2.4 * scale,
            height: 18 * scale,
            left: 10.8 * scale,
            top: 3 * scale,
          },
        ]}
      />
    </View>
  );
}

function TrophyIcon({ color, scale }: IconProps) {
  return (
    <View style={styles.fullCanvas}>
      <View
        style={{
          position: "absolute",
          left: 6 * scale,
          top: 3 * scale,
          width: 12 * scale,
          height: 10 * scale,
          borderWidth: 2 * scale,
          borderColor: color,
          borderTopLeftRadius: 2 * scale,
          borderTopRightRadius: 2 * scale,
          borderBottomLeftRadius: 7 * scale,
          borderBottomRightRadius: 7 * scale,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 2.5 * scale,
          top: 5 * scale,
          width: 5 * scale,
          height: 6 * scale,
          borderWidth: 2 * scale,
          borderColor: color,
          borderRightWidth: 0,
          borderTopLeftRadius: 4 * scale,
          borderBottomLeftRadius: 4 * scale,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 2.5 * scale,
          top: 5 * scale,
          width: 5 * scale,
          height: 6 * scale,
          borderWidth: 2 * scale,
          borderColor: color,
          borderLeftWidth: 0,
          borderTopRightRadius: 4 * scale,
          borderBottomRightRadius: 4 * scale,
        }}
      />
      <View
        style={[
          styles.line,
          {
            backgroundColor: color,
            width: 2.2 * scale,
            height: 5 * scale,
            left: 10.9 * scale,
            top: 13 * scale,
          },
        ]}
      />
      <View
        style={[
          styles.line,
          {
            backgroundColor: color,
            width: 10 * scale,
            height: 2.2 * scale,
            left: 7 * scale,
            top: 18 * scale,
          },
        ]}
      />
    </View>
  );
}

function ProfileIcon({ color, scale }: IconProps) {
  return (
    <View style={styles.fullCanvas}>
      <View
        style={{
          position: "absolute",
          left: 8 * scale,
          top: 3 * scale,
          width: 8 * scale,
          height: 8 * scale,
          borderWidth: 2 * scale,
          borderColor: color,
          borderRadius: 5 * scale,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 4 * scale,
          top: 13 * scale,
          width: 16 * scale,
          height: 8 * scale,
          borderWidth: 2 * scale,
          borderColor: color,
          borderBottomWidth: 0,
          borderTopLeftRadius: 9 * scale,
          borderTopRightRadius: 9 * scale,
        }}
      />
    </View>
  );
}

type IconProps = { color: ColorValue; scale: number };

const styles = StyleSheet.create({
  canvas: {
    position: "relative",
  },
  fullCanvas: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
  line: {
    position: "absolute",
    borderRadius: 999,
  },
});
