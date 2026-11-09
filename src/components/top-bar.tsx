import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Sidebar } from "@/components/sidebar";
import { useTheme } from "@/hooks/use-theme";
import { initials } from "@/lib/initials";
import { canPickCompanyScope } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import { useCompanyScopeStore } from "@/store/company-scope-store";

type TopBarProps = {
  /** El `title` de la pantalla. En `index` no se pone y se ve el nombre de la app. */
  title?: string;
  /** `props.back` del header: solo hay pantalla anterior si el Stack la apilo. */
  canGoBack?: boolean;
  /**
   * El `parent` de `SCREEN_PERMISSIONS`. Con el, el boton atras sale siempre: si
   * no hay pantalla anterior, lleva aqui.
   */
  backHref?: Href;
  /** Boton del `Sidebar`. Los clientes navegan con el tab bar y no lo llevan. */
  showSidebar?: boolean;
};

/**
 * Barra superior de las pantallas con sesion, con el menu de la cuenta a la
 * derecha. La monta el header de `src/app/(app)/_layout.tsx`, asi que esta en
 * todas las pantallas del grupo y en ninguna de fuera (el login no lo lleva).
 *
 * Al ser un header custom de un native stack, el inset de arriba no viene dado:
 * lo aplica este componente.
 */
export function TopBar({
  title,
  canGoBack = false,
  backHref,
  showSidebar = true,
}: TopBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const scopedCompany = useCompanyScopeStore((state) => state.company);
  const setScopedCompany = useCompanyScopeStore((state) => state.setCompany);

  const triggerRef = useRef<View>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Posicion del menu bajo el avatar. El valor inicial sirve mientras llega la
  // medida real, que es la que lo deja pegado al boton en cualquier pantalla.
  const [anchor, setAnchor] = useState({ top: insets.top + 52, right: 12 });

  function openMenu() {
    triggerRef.current?.measureInWindow((x, y, buttonWidth, buttonHeight) => {
      if (buttonWidth === 0 && buttonHeight === 0) return;
      setAnchor({
        top: y + buttonHeight + 8,
        right: Math.max(width - (x + buttonWidth), 12),
      });
    });
    setIsOpen(true);
  }

  function goBack() {
    if (canGoBack) router.back();
    // `navigate` y no `push`: si la lista ya esta abierta, vuelve a ella.
    else if (backHref) router.navigate(backHref);
  }

  /** Cierra antes de navegar: si no, el menu se queda encima de la pantalla nueva. */
  function go(action: () => void) {
    setIsOpen(false);
    action();
  }

  return (
    <View
      className="border-b border-selected bg-surface dark:border-selected-dark dark:bg-surface-dark"
      style={{ paddingTop: insets.top }}
    >
      <View className="h-14 flex-row items-center justify-between px-4">
        <View className="flex-1 flex-row items-center gap-1">
          {showSidebar ? (
            <Pressable
              className="-ml-1 p-1 active:opacity-60"
              onPress={() => setIsSidebarOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Abrir menu de navegacion"
              accessibilityState={{ expanded: isSidebarOpen }}
              hitSlop={8}
            >
              <Ionicons name="menu" size={24} color={theme.text} />
            </Pressable>
          ) : null}

          {canGoBack || backHref ? (
            <Pressable
              className="p-1 active:opacity-60"
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              hitSlop={8}
            >
              {/* El color sale del tema: en claro es negro, y en oscuro se ve. */}
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </Pressable>
          ) : null}

          <Text
            className="ml-1 text-lg font-bold text-content dark:text-content-dark"
            numberOfLines={1}
          >
            {title ?? "Helpdesk"}
          </Text>
        </View>

        <Pressable
          ref={triggerRef}
          className="h-10 w-10 items-center justify-center rounded-full bg-element active:opacity-70 dark:bg-element-dark"
          onPress={openMenu}
          accessibilityRole="button"
          accessibilityLabel="Abrir menu de la cuenta"
          accessibilityState={{ expanded: isOpen }}
          hitSlop={8}
        >
          <Text className="text-sm font-bold text-content dark:text-content-dark">
            {initials(user?.full_name, user?.username)}
          </Text>
        </Pressable>
      </View>

      {/* Que se note que las listas estan filtradas: sin esto, una lista
          corta pareceria un error. Se elige en el `Sidebar`; aqui solo se ve
          y se quita. */}
      {showSidebar && scopedCompany && canPickCompanyScope(user) ? (
        <View className="flex-row items-center gap-2 border-t border-selected px-4 py-1.5 dark:border-selected-dark">
          <Ionicons name="business-outline" size={14} color={theme.textSecondary} />
          <Text
            className="flex-1 text-xs text-muted dark:text-muted-dark"
            numberOfLines={1}
          >
            Empresa: <Text className="font-semibold">{scopedCompany.name}</Text>
          </Text>
          <Pressable
            className="p-0.5 active:opacity-60"
            onPress={() => setScopedCompany(null)}
            accessibilityRole="button"
            accessibilityLabel="Ver todas las empresas"
            hitSlop={8}
          >
            <Ionicons name="close" size={16} color={theme.textSecondary} />
          </Pressable>
        </View>
      ) : null}

      {showSidebar ? (
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      ) : null}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        // El boton atras de Android cierra el menu en vez de salir de la pantalla.
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1"
          onPress={() => setIsOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Cerrar menu"
        >
          <View
            className="absolute w-56 overflow-hidden rounded-xl border border-selected bg-surface shadow-lg dark:border-selected-dark dark:bg-element-dark"
            style={{ top: anchor.top, right: anchor.right }}
          >
            <View className="border-b border-selected px-4 py-3 dark:border-selected-dark">
              <Text
                className="text-sm font-semibold text-content dark:text-content-dark"
                numberOfLines={1}
              >
                {user?.full_name ?? "—"}
              </Text>
              <Text
                className="text-xs text-muted dark:text-muted-dark"
                numberOfLines={1}
              >
                @{user?.username}
              </Text>
            </View>

            {/* `navigate` y no `push`: desde el propio perfil no apila otro. */}
            <MenuItem
              label="Perfil"
              onPress={() => go(() => router.navigate("/profile"))}
            />
            <MenuItem
              label="Cerrar sesion"
              onPress={() => go(() => void logout())}
              isDanger
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuItem({
  label,
  onPress,
  isDanger = false,
}: {
  label: string;
  onPress: () => void;
  isDanger?: boolean;
}) {
  return (
    <Pressable
      className="px-4 py-3 active:bg-element dark:active:bg-selected-dark"
      onPress={onPress}
      accessibilityRole="menuitem"
    >
      <Text
        className={
          isDanger
            ? "text-base font-medium text-danger dark:text-danger-dark"
            : "text-base font-medium text-content dark:text-content-dark"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}
