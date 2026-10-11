import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "@/store/auth-store";

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <View className="flex-1 justify-between px-6 py-8">
        <View>
          <Text className="text-sm text-muted dark:text-muted-dark">Sesion activa</Text>
          <Text className="mt-1 text-2xl font-bold text-content dark:text-content-dark">
            {user?.full_name ?? "—"}
          </Text>
          <Text className="mt-1 text-base text-muted dark:text-muted-dark">
            @{user?.username}
            {user?.is_superuser ? " · superusuario" : ""}
          </Text>
        </View>

        <Pressable
          className="items-center rounded-xl border border-selected py-4 active:opacity-70 dark:border-selected-dark"
          onPress={() => void logout()}
          accessibilityRole="button"
        >
          <Text className="text-base font-semibold text-danger dark:text-danger-dark">
            Cerrar sesion
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
