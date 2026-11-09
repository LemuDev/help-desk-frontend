import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { initials } from "@/lib/initials";
import { useAuthStore } from "@/store/auth-store";
import { Action } from "@/types";

/**
 * La cuenta propia, tal como la devuelve `GET /auth/me`. No pasa por
 * `SCREEN_PERMISSIONS`: cualquiera con sesion puede ver lo suyo.
 */
export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);

  // El guard de sesion del layout raiz ya impide llegar aqui sin usuario.
  if (!user) return null;

  const permissionsByResource = groupByResource(user.permissions);

  return (
    // El inset de arriba lo pone el `TopBar`, asi que aqui solo el de abajo.
    <SafeAreaView
      className="flex-1 bg-surface dark:bg-surface-dark"
      edges={["bottom", "left", "right"]}
    >
      <ScrollView contentContainerClassName="px-6 pb-10 pt-6 gap-6">
        <View className="items-center gap-2">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-element dark:bg-element-dark">
            <Text className="text-2xl font-bold text-content dark:text-content-dark">
              {initials(user.full_name, user.username)}
            </Text>
          </View>
          <Text className="text-xl font-bold text-content dark:text-content-dark">
            {user.full_name}
          </Text>
          <Text className="text-base text-muted dark:text-muted-dark">
            @{user.username}
          </Text>
        </View>

        <View className="gap-px overflow-hidden rounded-xl bg-element dark:bg-element-dark">
          <Row label="Estado" value={user.is_active ? "Activa" : "Inactiva"} />
          <Row label="Superusuario" value={user.is_superuser ? "Si" : "No"} />
          <Row
            label="Ultimo acceso"
            value={formatDateTime(user.last_login_at)}
          />
          <Row label="Cuenta creada" value={formatDateTime(user.created_at)} />
        </View>

        <View className="gap-3">
          <Text className="text-base font-semibold text-content dark:text-content-dark">
            Permisos
          </Text>

          {user.is_superuser ? (
            <Text className="text-sm text-muted dark:text-muted-dark">
              Superusuario: la API le concede todo, aparezca o no en la lista.
            </Text>
          ) : null}

          {permissionsByResource.length === 0 ? (
            <Text className="text-sm text-muted dark:text-muted-dark">
              Sin permisos asignados.
            </Text>
          ) : (
            <View className="gap-px overflow-hidden rounded-xl bg-element dark:bg-element-dark">
              {permissionsByResource.map(([resource, actions]) => (
                <Row
                  key={resource}
                  label={resource}
                  value={
                    actions.includes(Action.manage)
                      ? "todo (manage)"
                      : actions.join(" · ")
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4 bg-surface px-4 py-3 dark:bg-element-dark">
      <Text className="text-sm text-muted dark:text-muted-dark">{label}</Text>
      <Text
        className="flex-1 text-right text-sm font-medium text-content dark:text-content-dark"
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

/** `['ticket:read', 'ticket:close']` -> `[['ticket', ['read', 'close']]]`. */
function groupByResource(permissions: string[]): [string, string[]][] {
  const grouped = new Map<string, string[]>();

  for (const code of permissions) {
    const [resource, action] = code.split(":");
    if (!resource || !action) continue;
    grouped.set(resource, [...(grouped.get(resource) ?? []), action]);
  }

  return [...grouped.entries()];
}

function formatDateTime(value: string | null): string {
  if (!value) return "Nunca";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
