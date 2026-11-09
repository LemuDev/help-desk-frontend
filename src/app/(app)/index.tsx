import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isCustomer } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);

  return (
    // El inset de arriba lo pone el `TopBar`, y el de abajo, si es cliente, el
    // tab bar.
    <SafeAreaView
      className="flex-1 bg-surface dark:bg-surface-dark"
      edges={isCustomer(user) ? ["left", "right"] : ["bottom", "left", "right"]}
    >
      <View className="flex-1 px-6 py-6">
        <Text className="text-sm text-muted dark:text-muted-dark">Sesion activa</Text>
        <Text className="mt-1 text-2xl font-bold text-content dark:text-content-dark">
          {user?.full_name ?? "—"}
        </Text>
        <Text className="mt-1 text-base text-muted dark:text-muted-dark">
          @{user?.username}
          {user?.is_superuser ? " · superusuario" : ""}
        </Text>

        {/* Las pantallas a las que puede entrar estan en el sidebar del `TopBar`
            (personal) o en el tab bar (clientes). */}
      </View>
    </SafeAreaView>
  );
}
