import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text } from "react-native";

import { DetailView, type DetailConfig } from "@/components/detail-view";
import { useTheme } from "@/hooks/use-theme";
import { can } from "@/lib/permissions";
import { fetchCompany } from "@/services/companies";
import { useAuthStore } from "@/store/auth-store";
import type { Company } from "@/types";
import { Action, Resource } from "@/types";

/**
 * Detalle de una empresa (`/companies/{id}`). Protegida por `company:read` en
 * `SCREEN_PERMISSIONS`, el mismo permiso que la lista y que `GET /companies/{id}`.
 *
 * Esta en `[id]/index.tsx` y no en `[id].tsx` porque `[id]/` tiene ademas las
 * sucursales: un `[id].tsx` junto a la carpeta seria su layout.
 */
export default function CompanyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();
  // Las sucursales piden su propio permiso (`branch:read`), no el de empresa.
  const canSeeBranches = can(user, Resource.branch, Action.read);

  return (
    <DetailView id={id} detail={COMPANY_DETAIL}>
      {canSeeBranches
        ? (company) => (
            <Pressable
              className="flex-row items-center gap-3 rounded-xl bg-element px-4 py-4 active:opacity-70 dark:bg-element-dark"
              onPress={() =>
                router.push({
                  pathname: "/companies/[id]/branches",
                  params: { id: String(company.id) },
                })
              }
              accessibilityRole="button"
            >
              <Ionicons
                name="storefront-outline"
                size={20}
                color={theme.textSecondary}
              />
              <Text className="flex-1 text-base font-semibold text-content dark:text-content-dark">
                Sucursales
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.textSecondary}
              />
            </Pressable>
          )
        : undefined}
    </DetailView>
  );
}

const COMPANY_DETAIL: DetailConfig<Company> = {
  title: (company) => company.name,
  fetch: fetchCompany,
  hide: ["name", "deleted_at"],
  labels: {
    id: "ID",
    created_at: "Creada",
    updated_at: "Actualizada",
  },
};