import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname, type Href } from "expo-router";
import { useEffect, useState, type ComponentProps } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CompanyScopePicker } from "@/components/company-scope-picker";
import { useTheme } from "@/hooks/use-theme";
import { initials } from "@/lib/initials";
import { can, canPickCompanyScope } from "@/lib/permissions";
import { SCREEN_PERMISSIONS } from "@/lib/screen-permissions";
import { useAuthStore } from "@/store/auth-store";

type SidebarLink = {
  href: Href;
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
};

/** Ancho del panel, en px: hace falta el numero para desplazarlo fuera de pantalla. */
const PANEL_WIDTH = 288;
/** Tope en pantallas estrechas, para que siempre se vea algo del fondo. */
const PANEL_MAX_RATIO = 0.8;
const DURATION = 220;

/**
 * Navegacion lateral, con las pantallas que el usuario puede abrir segun los
 * permisos que concede el backend: lo que `can()` descarta no se lista, y
 * ademas su ruta no existe (guard de `(app)/_layout.tsx`).
 *
 * La abre el `TopBar`, asi que esta en todas las pantallas con sesion.
 */
export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const { width } = useWindowDimensions();

  const panelWidth = Math.min(PANEL_WIDTH, width * PANEL_MAX_RATIO);

  // Abrir monta ya, pero cerrar espera a que el panel acabe de salir: si el
  // `Modal` siguiera a `isOpen` desapareceria de golpe y no habria animacion.
  // Lo desmonta el callback de la animacion de salida.
  const [isMounted, setIsMounted] = useState(isOpen);
  if (isOpen && !isMounted) setIsMounted(true);

  // 0 = fuera de pantalla y fondo transparente, 1 = abierto del todo.
  const progress = useSharedValue(isOpen ? 1 : 0);

  useEffect(() => {
    if (isOpen) {
      progress.value = withTiming(1, {
        duration: DURATION,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    progress.value = withTiming(
      0,
      { duration: DURATION, easing: Easing.in(Easing.cubic) },
      (finished) => {
        // Si otra animacion la interrumpio, la que gane se encarga de desmontar.
        if (finished) runOnJS(setIsMounted)(false);
      },
    );
  }, [isOpen, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -panelWidth * (1 - progress.value) }],
  }));

  const links: SidebarLink[] = [
    { href: "/", label: "Inicio", icon: "home-outline" },
    ...Object.values(SCREEN_PERMISSIONS).flatMap(({ resource, action, title, sidebar }) =>
      // Las de detalle no llevan `sidebar`: se abren desde su lista.
      sidebar && can(user, resource, action)
        ? [{ href: sidebar.href, label: title, icon: sidebar.icon }]
        : [],
    ),
  ];

  /** Cierra antes de navegar: si no, se queda encima de la pantalla nueva. */
  function go(href: Href) {
    onClose();
    // `navigate` y no `push`: volver a una pantalla ya abierta no la apila.
    router.navigate(href);
  }

  return (
    <Modal
      visible={isMounted}
      transparent
      // El slide y el fundido los hace este componente, no el `Modal`.
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1 flex-row">
        {/* Fondo detras del panel, asi tocar fuera cierra sin tapar el menu. */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <Pressable
            className="flex-1 bg-black/40"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar menu de navegacion"
          />
        </Animated.View>

        <Animated.View style={[panelStyle, { width: panelWidth }]}>
          <View
            className="h-full border-r border-selected bg-surface dark:border-selected-dark dark:bg-surface-dark"
            style={{ paddingTop: insets.top }}
          >
            <View className="flex-row items-center gap-3 border-b border-selected px-5 py-4 dark:border-selected-dark">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-element dark:bg-element-dark">
                <Text className="text-sm font-bold text-content dark:text-content-dark">
                  {initials(user?.full_name, user?.username)}
                </Text>
              </View>
              <View className="flex-1">
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
            </View>

            {canPickCompanyScope(user) ? (
              <View className="border-b border-selected px-5 py-4 dark:border-selected-dark">
                <CompanyScopePicker />
              </View>
            ) : null}

            <View className="gap-1 p-3">
              {links.map((link) => {
                const isActive = link.href === pathname;

                return (
                  <Pressable
                    key={link.label}
                    className={`flex-row items-center gap-3 rounded-xl px-3 py-3 active:opacity-70 ${
                      isActive ? "bg-element dark:bg-element-dark" : ""
                    }`}
                    onPress={() => go(link.href)}
                    accessibilityRole="link"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Ionicons
                      name={link.icon}
                      size={20}
                      color={isActive ? theme.text : theme.textSecondary}
                    />
                    <Text
                      className={
                        isActive
                          ? "text-base font-semibold text-content dark:text-content-dark"
                          : "text-base text-muted dark:text-muted-dark"
                      }
                    >
                      {link.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
