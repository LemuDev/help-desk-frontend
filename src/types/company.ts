/**
 * Espeja `app/modules/company/schemas.py`.
 */

import type { Page, PaginatedQuery } from './api';

/** `CompanyRead`. */
export type Company = {
  id: number;
  name: string;
  /** ISO 8601. Con valor, la empresa esta borrada (borrado logico). */
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

/** `BranchRead` — una sucursal, siempre colgando de su empresa. */
export type Branch = {
  id: number;
  name: string;
  company_id: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

/** `CompanyCreate` — body de `POST /companies`. 1-100 caracteres, recortado. */
export type CompanyCreate = {
  name: string;
};

/** `CompanyUpdate` — body de `PATCH /companies/{id}`. */
export type CompanyUpdate = Partial<CompanyCreate>;

/** Query params de `GET /companies`. */
export type CompanyListQuery = PaginatedQuery & {
  /** Incluye las borradas (borrado logico). */
  include_deleted?: boolean;
};

/** `BranchCreate` — body de `POST /companies/{id}/branches`. Mismas reglas que el nombre de empresa. */
export type BranchCreate = {
  name: string;
};

/** `BranchUpdate` — body de `PATCH /companies/{id}/branches/{branch_id}`. */
export type BranchUpdate = Partial<BranchCreate>;

/** Query params de `GET /companies/{id}/branches`. */
export type BranchListQuery = PaginatedQuery & {
  /** Incluye las borradas (borrado logico). */
  include_deleted?: boolean;
};

export type CompanyPage = Page<Company>;
export type BranchPage = Page<Branch>;