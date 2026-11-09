import { api } from '@/lib/api';
import type {
  Branch,
  BranchCreate,
  BranchListQuery,
  BranchPage,
  BranchUpdate,
  Company,
  CompanyCreate,
  CompanyListQuery,
  CompanyPage,
  CompanyUpdate,
} from '@/types';

/** `GET /companies` — exige `company:read`. Sin las borradas salvo `include_deleted`. */
export async function fetchCompanies({
  search,
  ...params
}: CompanyListQuery = {}): Promise<CompanyPage> {
  const { data } = await api.get<CompanyPage>('/companies', {
    // El router lo llama `name`. Vacio se omite: `name=` filtraria por cadena vacia.
    params: { ...params, name: search || undefined },
  });
  return data;
}

/** `GET /companies/{id}` — mismo permiso que la lista. */
export async function fetchCompany(id: string): Promise<Company> {
  const { data } = await api.get<Company>(`/companies/${id}`);
  return data;
}

/** `POST /companies` — exige `company:create`. El nombre es unico. */
export async function createCompany(payload: CompanyCreate): Promise<Company> {
  const { data } = await api.post<Company>('/companies', payload);
  return data;
}

/** `PATCH /companies/{id}` — exige `company:update`. */
export async function updateCompany(id: number, payload: CompanyUpdate): Promise<Company> {
  const { data } = await api.patch<Company>(`/companies/${id}`, payload);
  return data;
}

/** `GET /companies/{id}/branches` — exige `branch:read`. Sin las borradas salvo `include_deleted`. */
export async function fetchBranches(
  companyId: number,
  { search, ...params }: BranchListQuery = {},
): Promise<BranchPage> {
  const { data } = await api.get<BranchPage>(`/companies/${companyId}/branches`, {
    // Como en `/companies`, el router lo llama `name`. Vacio se omite.
    params: { ...params, name: search || undefined },
  });
  return data;
}

/** `GET /companies/{id}/branches/{branch_id}` — mismo permiso que la lista. 404 si es de otra empresa. */
export async function fetchBranch(companyId: number, branchId: number): Promise<Branch> {
  const { data } = await api.get<Branch>(`/companies/${companyId}/branches/${branchId}`);
  return data;
}

/** `POST /companies/{id}/branches` — exige `branch:create`. */
export async function createBranch(companyId: number, payload: BranchCreate): Promise<Branch> {
  const { data } = await api.post<Branch>(`/companies/${companyId}/branches`, payload);
  return data;
}

/** `PATCH /companies/{id}/branches/{branch_id}` — exige `branch:update`. */
export async function updateBranch(
  companyId: number,
  branchId: number,
  payload: BranchUpdate,
): Promise<Branch> {
  const { data } = await api.patch<Branch>(
    `/companies/${companyId}/branches/${branchId}`,
    payload,
  );
  return data;
}

/** `DELETE /companies/{id}/branches/{branch_id}` — exige `branch:delete`. Borrado logico. */
export async function deleteBranch(companyId: number, branchId: number): Promise<void> {
  await api.delete(`/companies/${companyId}/branches/${branchId}`);
}