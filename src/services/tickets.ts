import { api } from '@/lib/api';
import type {
  Ticket,
  TicketAssign,
  TicketCreate,
  TicketListQuery,
  TicketPage,
  TicketUpdate,
} from '@/types';

/**
 * `GET /tickets` — exige `ticket:read`. Los mas nuevos primero y sin los
 * borrados salvo `include_deleted`.
 */
export async function fetchTickets({ search, ...params }: TicketListQuery = {}): Promise<TicketPage> {
  const { data } = await api.get<TicketPage>('/tickets', {
    // El router lo llama `q` y busca en el titulo. Vacio se omite.
    params: { ...params, q: search || undefined },
  });
  return data;
}

/** `GET /tickets/{id}` — mismo permiso que la lista. */
export async function fetchTicket(id: string): Promise<Ticket> {
  const { data } = await api.get<Ticket>(`/tickets/${id}`);
  return data;
}

/** `POST /tickets` — exige `ticket:create`. */
export async function createTicket(payload: TicketCreate): Promise<Ticket> {
  const { data } = await api.post<Ticket>('/tickets', payload);
  return data;
}

/** `PATCH /tickets/{id}` — exige `ticket:update`. 409 si esta cerrado. */
export async function updateTicket(id: string, payload: TicketUpdate): Promise<Ticket> {
  const { data } = await api.patch<Ticket>(`/tickets/${id}`, payload);
  return data;
}

/** `POST /tickets/{id}/close` — exige `ticket:close`, no `ticket:update`. */
export async function closeTicket(id: string): Promise<Ticket> {
  const { data } = await api.post<Ticket>(`/tickets/${id}/close`);
  return data;
}

/** `POST /tickets/{id}/reopen` — exige `ticket:close`. Vuelve a `open`. */
export async function reopenTicket(id: string): Promise<Ticket> {
  const { data } = await api.post<Ticket>(`/tickets/${id}/reopen`);
  return data;
}

/** `POST /tickets/{id}/assignees` — exige `ticket:assign`. 409 si ya lo lleva. */
export async function assignTicket(id: string, payload: TicketAssign): Promise<Ticket> {
  const { data } = await api.post<Ticket>(`/tickets/${id}/assignees`, payload);
  return data;
}

/** `DELETE /tickets/{id}/assignees/{agentId}` — exige `ticket:assign`. */
export async function unassignTicket(id: string, agentId: string): Promise<Ticket> {
  const { data } = await api.delete<Ticket>(`/tickets/${id}/assignees/${agentId}`);
  return data;
}
