import { Text, View } from "react-native";

import type { User } from "@/types";

/**
 * Fila de las listas de Usuarios y Clientes. Con `hasAction` deja hueco a la
 * derecha para el lapiz de `renderAction`.
 */
export function UserRow({ user, hasAction }: { user: User; hasAction: boolean }) {
  return (
    <View
      className={`rounded-xl bg-element px-4 py-3 dark:bg-element-dark ${hasAction ? "pr-14" : ""}`}
    >
      <Text className="text-base font-semibold text-content dark:text-content-dark">
        {user.full_name}
      </Text>
      <Text className="mt-0.5 text-sm text-muted dark:text-muted-dark">
        @{user.username}
        {user.is_superuser ? " · superusuario" : ""}
        {user.is_active ? "" : " · inactivo"}
      </Text>
    </View>
  );
}
