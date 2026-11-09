/**
 * Espeja `app/modules/tickets/schemas.py` (y los enums de `models.py`).
 */

import type { Page, PaginatedQuery } from './api';

/** `TicketStatus`. `closed` solo se alcanza por `POST /tickets/{id}/close`. */
export const TicketStatus = {
  open: 'open',
  in_progress: 'in_progress',
  resolved: 'resolved',
  closed: 'closed',
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

/** `TicketPriority`. */
export const TicketPriority = {
  low: 'low',
  normal: 'normal',
  high: 'high',
  urgent: 'urgent',
} as const;

export type TicketPriority = (typeof TicketPriority)[keyof typeof TicketPriority];

/** `TicketUserRead` — forma minima del usuario dentro de un ticket. */
export type TicketUser = {
  id: string;
  username: string;
  full_name: string;
};

/** `TicketAssigneeRead` — un agente que lleva el ticket ahora. */
export type TicketAssignee = {
  id: string;
  support_agent_id: string;
  agent: TicketUser;
  /** Cuando se asigno, no cuando se creo el ticket. */
  created_at: string;
};

/** `TicketRead`. */
export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  user_id: string;
  requester: TicketUser;
  product_id: string | null;
  company_id: number | null;
  branch_id: number | null;
  /** Solo los asignados vivos: los que se quitaron no salen. */
  assignees: TicketAssignee[];
  closed_at: string | null;
  /** Con valor solo si se pidio `include_deleted`. */
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * `TicketCreate` — body de `POST /tickets`. Sin `user_id` lo abre quien manda
 * la peticion; ponerlo distinto pide `ticket:assign`. Sin `company_id` /
 * `branch_id` se heredan del solicitante.
 */
export type TicketCreate = {
  /** 1-100 caracteres, recortado. */
  title: string;
  /** 1-1000 caracteres, recortado. */
  description: string;
  priority?: TicketPriority;
  user_id?: string | null;
  product_id?: string | null;
  company_id?: number | null;
  branch_id?: number | null;
};

/**
 * `TicketUpdate` — body de `PATCH /tickets/{id}`, exige `ticket:update`.
 * `status` no acepta `closed`: cerrar es `POST /tickets/{id}/close`. Un ticket
 * cerrado no se edita, primero se reabre.
 */
export type TicketUpdate = {
  title?: string;
  description?: string;
  status?: Exclude<TicketStatus, 'closed'>;
  priority?: TicketPriority;
  product_id?: string | null;
  company_id?: number | null;
  branch_id?: number | null;
};

/** `TicketAssign` — body de `POST /tickets/{id}/assignees`. */
export type TicketAssign = {
  /** Un usuario que no sea cliente (`User.is_customer`). */
  support_agent_id: string;
};

/** Query params de `GET /tickets`. */
export type TicketListQuery = PaginatedQuery & {
  status?: TicketStatus;
  priority?: TicketPriority;
  /** Solo los abiertos por ese usuario. */
  user_id?: string;
  /** Solo los que lleva ese agente. */
  assigned_to?: string;
  only_unassigned?: boolean;
  product_id?: string;
  company_id?: number;
  branch_id?: number;
  include_deleted?: boolean;
};

export type TicketPage = Page<Ticket>;
