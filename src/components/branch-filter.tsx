import { useEffect, useState } from "react";

import { SelectField } from "@/components/select-field";
import { toApiError } from "@/lib/api";
import { can } from "@/lib/permissions";
import { fetchBranches } from "@/services/companies";
import { useAuthStore } from "@/store/auth-store";
import type { Branch } from "@/types";
import { Action, Resource } from "@/types";

/** El tope de `size` de la API (`PageParams`): con mas, las ultimas no salen. */
const PICKER_SIZE = 50;

type BranchFilterProps = {
  /** La empresa elegida en el `Sidebar` (`useCompanyScopeStore`). */
  companyId: number;
  value: number | null;
  onChange: (branchId: number | null) => void;
};

/**
 * Filtro de lista por sucursal dentro de la empresa global. Sin `branch:read`
 * no se pinta nada. La pantalla lo monta con `key={companyId}`, asi que cambiar
 * de empresa empieza de cero en vez de ensenar las sucursales de la anterior.
 */
export function BranchFilter({ companyId, value, onChange }: BranchFilterProps) {
  const user = useAuthStore((state) => state.user);
  const canPick = can(user, Resource.branch, Action.read);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(canPick);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canPick) return;
    let isCurrent = true;
    fetchBranches(companyId, { size: PICKER_SIZE })
      .then((page) => isCurrent && setBranches(page.items))
      .catch((cause) => isCurrent && setError(toApiError(cause).message))
      .finally(() => isCurrent && setIsLoading(false));
    return () => {
      isCurrent = false;
    };
  }, [companyId, canPick]);

  if (!canPick) return null;

  return (
    <SelectField
      title="Sucursal"
      placeholder="Todas las sucursales"
      emptyLabel={error ?? "Esta empresa no tiene sucursales."}
      options={branches.map(({ id, name }) => ({ value: id, label: name }))}
      value={value}
      onChange={onChange}
      clearable
      isLoading={isLoading}
    />
  );
}