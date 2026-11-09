import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, Text } from "react-native";

import { ConfirmModal } from "@/components/confirm-modal";
import { DetailView, type DetailConfig } from "@/components/detail-view";
import { can } from "@/lib/permissions";
import { deleteBranch, fetchBranch } from "@/services/companies";
import { useAuthStore } from "@/store/auth-store";
import type { Branch } from "@/types";
import { Action, Resource } from "@/types";

/**
 * Detalle de una sucursal (`/companies/{id}/branches/{branch_id}`). Protegida
 * por `branch:read` en `SCREEN_PERMISSIONS`. Con `branch:delete` lleva el
 * boton de eliminar (borrado logico).
 */
export default function BranchDetailScreen() {
  const { id, branchId } = useLocalSearchParams<{
    id: string;
    branchId: string;
  }>();
  const companyId = Number(id);
  const user = useAuthStore((state) => state.user);
  const canDelete = can(user, Resource.branch, Action.delete);

  // `DetailView` pasa solo un id a `fetch`: la empresa va en el cierre, y el
  // `useCallback` lo mantiene estable para no relanzar la carga.
  const fetchDetail = useCallback(
    (branch: string) => fetchBranch(companyId, Number(branch)),
    [companyId],
  );
  const detail = useMemo<DetailConfig<Branch>>(
    () => ({ ...BRANCH_DETAIL, fetch: fetchDetail }),
    [fetchDetail],
  );

  return (
    <DetailView id={branchId} detail={detail}>
      {canDelete
        ? (branch) => <DeleteBranchButton companyId={companyId} branch={branch} />
        : undefined}
    </DetailView>
  );
}

const BRANCH_DETAIL: Omit<DetailConfig<Branch>, "fetch"> = {
  title: (branch) => branch.name,
  hide: ["name", "company_id", "deleted_at"],
  labels: {
    id: "ID",
    created_at: "Creada",
    updated_at: "Actualizada",
  },
};

function DeleteBranchButton({
  companyId,
  branch,
}: {
  companyId: number;
  branch: Branch;
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <>
      <Pressable
        className="items-center rounded-xl border border-danger/40 py-4 active:opacity-70"
        onPress={() => setIsConfirming(true)}
        accessibilityRole="button"
      >
        <Text className="text-base font-semibold text-danger dark:text-danger-dark">
          Eliminar sucursal
        </Text>
      </Pressable>
      <ConfirmModal
        isVisible={isConfirming}
        title="Eliminar sucursal"
        message={`Se eliminara "${branch.name}".`}
        confirmLabel="Eliminar"
        busyLabel="Eliminando..."
        confirm={() => deleteBranch(companyId, branch.id)}
        onClose={() => setIsConfirming(false)}
        onDone={() => {
          setIsConfirming(false);
          // A la lista: alli ya no sale (sin `include_deleted`). Sin historial
          // (web tras recargar) se va a ella directamente.
          if (router.canGoBack()) router.back();
          else
            router.replace({
              pathname: "/companies/[id]/branches",
              params: { id: String(companyId) },
            });
        }}
      />
    </>
  );
}