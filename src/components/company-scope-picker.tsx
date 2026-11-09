import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { SelectField } from "@/components/select-field";
import { toApiError } from "@/lib/api";
import { canPickCompanyScope } from "@/lib/permissions";
import { fetchCompanies } from "@/services/companies";
import { useAuthStore } from "@/store/auth-store";
import { useCompanyScopeStore } from "@/store/company-scope-store";
import type { Company } from "@/types";

/** El tope de `size` de la API (`PageParams`): con mas, las ultimas no salen. */
const PICKER_SIZE = 50;

/**
 * Elige la empresa global (`useCompanyScopeStore`). Solo para quien
 * `canPickCompanyScope()`: sin `company:read` no hay lista que ofrecer, y un
 * cliente ya trabaja siempre en la suya.
 */
export function CompanyScopePicker() {
  const user = useAuthStore((state) => state.user);
  const company = useCompanyScopeStore((state) => state.company);
  const setCompany = useCompanyScopeStore((state) => state.setCompany);
  const canPick = canPickCompanyScope(user);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(canPick);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canPick) return;
    let isCurrent = true;
    fetchCompanies({ size: PICKER_SIZE })
      .then((page) => isCurrent && setCompanies(page.items))
      .catch((cause) => isCurrent && setError(toApiError(cause).message))
      .finally(() => isCurrent && setIsLoading(false));
    return () => {
      isCurrent = false;
    };
  }, [canPick]);

  if (!canPick) return null;

  function select(id: number | null) {
    const next = companies.find((option) => option.id === id);
    setCompany(next ? { id: next.id, name: next.name } : null);
  }

  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold uppercase text-muted dark:text-muted-dark">
        Empresa
      </Text>
      <SelectField
        title="Empresa"
        placeholder="Todas las empresas"
        emptyLabel={error ?? "No hay empresas."}
        options={companies.map(({ id, name }) => ({ value: id, label: name }))}
        value={company?.id ?? null}
        onChange={select}
        clearable
        isLoading={isLoading}
      />
    </View>
  );
}