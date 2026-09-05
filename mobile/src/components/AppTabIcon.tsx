import { Text, type TextStyle } from "react-native";

type TabIconName = "feed" | "explore" | "publish" | "championships" | "profile";

const GLYPHS: Record<TabIconName, string> = {
  feed: "⌂",
  explore: "⌕",
  publish: "+",
  championships: "♜",
  profile: "●",
};

export function AppTabIcon({
  name,
  color,
  size = 24,
}: {
  name: TabIconName;
  color: string;
  size?: number;
}) {
  const style: TextStyle = {
    color,
    fontSize: size,
    lineHeight: size + 2,
    fontWeight: "900",
    textAlign: "center",
    minWidth: size + 4,
  };

  return <Text style={style}>{GLYPHS[name]}</Text>;
}
