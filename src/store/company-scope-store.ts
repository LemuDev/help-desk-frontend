import { create } from 'zustand';

import { useAuthStore } from '@/store/auth-store';
import type { Company } from '@/types';

type ScopedCompany = Pick<Company, 'id' | 'name'>;

type CompanyScopeState = {
  /** `null` = todas las empresas. */
  company: ScopedCompany | null;
  setCompany: (company: ScopedCompany | null) => void;
};

/**
 * La empresa que el personal elige en el `Sidebar` para trabajar sobre ella:
 * las listas que dependen de una empresa (tickets, clientes, roles) la usan
 * como filtro mientras este elegida.
 *
 * Es solo un filtro de la UI: quien puede ver que lo sigue decidiendo la API.
 * Se guarda el nombre ademas del id para pintarlo en el `TopBar` sin pedir la
 * empresa otra vez. No se persiste: al recargar se vuelve a "todas".
 */
export const useCompanyScopeStore = create<CompanyScopeState>((set) => ({
  company: null,
  setCompany: (company) => set({ company }),
}));

// Al cerrar sesion se olvida: el siguiente en entrar puede no tener acceso a
// esa empresa, o ser un cliente.
useAuthStore.subscribe((state) => {
  if (state.status === 'unauthenticated' && useCompanyScopeStore.getState().company) {
    useCompanyScopeStore.setState({ company: null });
  }
});

/** El id de la empresa elegida, listo para un query param (`undefined` = sin filtro). */
export function useScopedCompanyId(): number | undefined {
  return useCompanyScopeStore((state) => state.company?.id);
}
