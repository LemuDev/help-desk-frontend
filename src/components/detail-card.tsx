import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode } from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

/**
 * Piezas de las pantallas de detalle hechas a mano (tickets, productos), las
 * que no pasan por `DetailView` porque se trabajan desde ahi.
 */

/** Una seccion con su titulo en versalitas. */
export function DetailCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-3 rounded-2xl bg-element p-4 dark:bg-element-dark">
      <Text className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-muted-dark">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** `icono  etiqueta ........ valor`. Sin valor pinta un guion. */
export function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string | null;
}) {
  const theme = useTheme();

  return (
    <View className="flex-row items-center gap-3">
      <Ionicons name={icon} size={18} color={theme.textSecondary} />
      <Text className="text-sm text-muted dark:text-muted-dark">{label}</Text>
      <Text
        className="flex-1 text-right text-sm font-medium text-content dark:text-content-dark"
        numberOfLines={1}
      >
        {value ?? "—"}
      </Text>
    </View>
  );
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}