import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable } from "react-native";

import { useTheme } from "@/hooks/use-theme";

/** El lapiz de las filas de `ItemList`, para su `renderAction`. */
export function EditButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      className="p-1 active:opacity-60"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
    >
      <Ionicons name="create-outline" size={22} color={theme.textSecondary} />
    </Pressable>
  );
}
