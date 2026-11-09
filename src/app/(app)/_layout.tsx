import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, Tabs } from "expo-router";

import { TopBar } from "@/components/top-bar";
import { useTheme } from "@/hooks/use-theme";
import { can, isCustomer } from "@/lib/permissions";
import { SCREEN_PERMISSIONS } from "@/lib/screen-permissions";
import { useAuthStore } from "@/store/auth-store";

/**
 * Las pantallas con sesion. El grupo `(app)` no sale en la URL: `/`, `/profile`
 * y `/users` siguen igual.
 *
 * Hay dos navegaciones segun quien entra: los clientes (`isCustomer`) ven un
 * tab bar, y el personal de la empresa un Stack con el `TopBar` como header.
 * En las dos, los permisos del backend deciden aqui que rutas existen.
 */
export default function AppLayout() {
  const user = useAuthStore((state) => state.user);

  return isCustomer(user) ? <CustomerTabs /> : <StaffStack />;
}

function StaffStack() {
  const user = useAuthStore((state) => state.user);

  return (
    <Stack
      screenOptions={{
        header: ({ options, back }) => (
          <TopBar title={options.title} canGoBack={back !== undefined} />
        ),
      }}
    >
      {/* Sin permiso: las ve cualquiera con sesion. El perfil es la cuenta
          propia, que es lo que `/auth/me` ya devuelve. */}
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" options={{ title: "Perfil" }} />
      {/* Solo de clientes: el personal no es de ninguna empresa. Sin
          mencionarla, el Stack la dejaria abierta. */}
      <Stack.Protected guard={false}>
        <Stack.Screen name="my-company" />
      </Stack.Protected>

      {/* Una pantalla por permiso de `SCREEN_PERMISSIONS`: sin el permiso que
          concede el backend la ruta no existe, asi que entrar por
          `router.push`, por un deep link o por la URL en web devuelve a
          `index`. Si el permiso se cae con la pantalla abierta, el router saca
          de ella y borra su historial. */}
      {Object.entries(SCREEN_PERMISSIONS).map(([name, { resource, action, title, parent }]) => (
        <Stack.Protected key={name} guard={can(user, resource, action)}>
          <Stack.Screen
            name={name}
            options={{
              title,
              // Las de detalle llevan su lista, por si no hay nada apilado
              // (en web, tras recargar o entrar por URL).
              header: ({ options, back }) => (
                <TopBar
                  title={options.title}
                  canGoBack={back !== undefined}
                  backHref={parent}
                />
              ),
            }}
          />
        </Stack.Protected>
      ))}
    </Stack>
  );
}

/**
 * Navegacion de los clientes: tab bar abajo (Home y las pantallas con `tab` en
 * `SCREEN_PERMISSIONS`) y el mismo
 * `TopBar` arriba, pero sin el boton del `Sidebar`: el tab bar ya es su
 * navegacion. El menu de la cuenta (perfil, cerrar sesion) se queda.
 *
 * Tabs crea una pestana por cada ruta del grupo, asi que las que no son del
 * cliente (sin `tab`) se esconden con `href: null`; las de `SCREEN_PERMISSIONS` siguen
 * ademas detras de su guard, igual que en el Stack.
 */
function CustomerTabs() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);

  return (
    <Tabs
      screenOptions={{
        header: ({ options }) => <TopBar title={options.title} showSidebar={false} />,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.backgroundSelected,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          // `tabBarLabel` y no `title`: sin titulo el `TopBar` muestra el nombre
          // de la app, igual que en el Stack.
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="profile" options={{ href: null, title: "Perfil" }} />

      {Object.entries(SCREEN_PERMISSIONS).map(([name, { resource, action, title, tab, parent, customerParent }]) => (
        <Tabs.Protected key={name} guard={can(user, resource, action)}>
          <Tabs.Screen
            name={name}
            options={
              tab
                ? {
                    // La etiqueta de la pestana tambien como titulo: el de la
                    // tabla es el del personal (p.ej. "Clientes").
                    title: tab.label,
                    tabBarLabel: tab.label,
                    tabBarIcon: ({ color, size, focused }) => (
                      <Ionicons
                        name={focused ? tab.iconFocused : tab.icon}
                        size={size}
                        color={color}
                      />
                    ),
                  }
                : {
                    href: null,
                    title,
                    // Tabs no apila: el boton atras de un detalle lleva a su lista.
                    header: ({ options }) => (
                      <TopBar
                        title={options.title}
                        backHref={customerParent ?? parent}
                        showSidebar={false}
                      />
                    ),
                  }
            }
          />
        </Tabs.Protected>
      ))}
      {/* Su empresa la lee cualquier cliente que tenga una, sin permiso: lo
          que puede hacer en ella (editarla, ver sucursales) lo decide la
          propia pantalla. */}
      <Tabs.Protected guard={user?.company_id != null}>
        <Tabs.Screen
          name="my-company"
          options={{
            title: "Mi empresa",
            tabBarLabel: "Empresa",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "business" : "business-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tabs.Protected>
    </Tabs>
  );
}