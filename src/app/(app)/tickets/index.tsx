import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BranchFilter } from "@/components/branch-filter";
import { CreateModal } from "@/components/create-modal";
import type { FormField } from "@/components/form-modal";
import { ItemList, type ItemDetailLink } from "@/components/item-list";
import { can, isCustomer } from "@/lib/permissions";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from "@/lib/ticket-labels";
import { createTicket, fetchTickets } from "@/services/tickets";
import { useAuthStore } from "@/store/auth-store";
import { useScopedCompanyId } from "@/store/company-scope-store";
import type { PaginatedQuery, Ticket, TicketCreate } from "@/types";
import { Action, Resource, TicketPriority } from "@/types";

/**
 * Pantalla protegida: solo existe si el backend concedio `ticket:read`, segun
 * `SCREEN_PERMISSIONS`. Lista y busqueda (por titulo) las lleva `ItemList`; el
 * alta, `CreateModal`. El detalle es su propia pantalla, `[id].tsx`.
 */
export default function TicketsScreen() {
  const user = useAuthStore((state) => state.user);
  const canCreate = can(user, Resource.ticket, Action.create);

  // Que tickets ve un cliente lo decide la API (`TicketController._scope_filters`):
  // los de su empresa si los gestiona (`ticket:update`), si no solo los suyos.
  // En ese ultimo caso no tiene sentido repetir el solicitante en cada fila.
  const customer = isCustomer(user);
  const showRequester = !customer || can(user, Resource.ticket, Action.update);

  // La empresa es la global del `Sidebar` (solo personal: a un cliente la API
  // ya le fija la suya). Dentro de ella se puede afinar por sucursal; la
  // sucursal se guarda junto a su empresa para que cambiar de empresa la
  // descarte sin un efecto que la resetee.
  const companyId = useScopedCompanyId();
  const [branch, setBranch] = useState<{ companyId: number; branchId: number } | null>(
    null,
  );
  const branchId = branch?.companyId === companyId ? branch?.branchId : undefined;
  const fetchPage = useCallback(
    (query: PaginatedQuery) =>
      fetchTickets({ ...query, company_id: companyId, branch_id: branchId }),
    [companyId, branchId],
  );

  const [isCreating, setIsCreating] = useState(false);
  // `ItemList` no expone su recarga: cambiar la `key` la remonta y vuelve a
  // pedir la pagina 1, donde sale el recien creado (orden por `created_at`).
  const [listVersion, setListVersion] = useState(0);

  return (
    // El inset de arriba lo pone el `TopBar`, asi que aqui solo el de abajo.
    <SafeAreaView
      className="flex-1 bg-surface dark:bg-surface-dark"
      edges={["bottom", "left", "right"]}
    >
      {canCreate ? (
        <>
          <Pressable
            className="absolute bottom-8 right-6 z-10 h-14 w-14 items-center justify-center rounded-full bg-brand shadow-lg active:opacity-80 dark:bg-brand-dark"
            onPress={() => setIsCreating(true)}
            accessibilityRole="button"
            accessibilityLabel="Nuevo ticket"
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </Pressable>
          <CreateModal
            isVisible={isCreating}
            title="Nuevo ticket"
            fields={TICKET_FIELDS}
            initialValues={{
              title: "",
              description: "",
              priority: TicketPriority.normal,
            }}
            submit={createTicket}
            onClose={() => setIsCreating(false)}
            onCreated={() => {
              setIsCreating(false);
              setListVersion((version) => version + 1);
            }}
          />
        </>
      ) : null}

      <ItemList
        key={listVersion}
        fetchPage={fetchPage}
        keyExtractor={(ticket) => ticket.id}
        renderItem={(ticket) => (
          <TicketRow ticket={ticket} showRequester={showRequester} />
        )}
        searchPlaceholder="Buscar por titulo"
        filters={
          !customer && companyId !== undefined ? (
            <BranchFilter
              key={companyId}
              companyId={companyId}
              value={branchId ?? null}
              onChange={(next) =>
                setBranch(next === null ? null : { companyId, branchId: next })
              }
            />
          ) : null
        }
        emptyLabel={
          companyId === undefined ? "No hay tickets." : "No hay tickets en esta empresa."
        }
        detail={TICKET_DETAIL}
      />
    </SafeAreaView>
  );
}

/**
 * Los mismos limites que `Title` y `Description` en
 * `app/modules/tickets/schemas.py`. Sin `user_id`: lo abre quien lo envia, y a
 * nombre de otro pediria `ticket:assign`.
 */
const TICKET_FIELDS: FormField<
  Required<Pick<TicketCreate, "title" | "description" | "priority">>
>[] = [
  {
    type: "text",
    name: "title",
    label: "Titulo",
    hint: "Maximo 100 caracteres.",
    minLength: 1,
  },
  {
    type: "text",
    name: "description",
    label: "Descripcion",
    hint: "Que pasa y desde cuando. Maximo 1000 caracteres.",
    minLength: 1,
    multiline: true,
  },
  {
    type: "choice",
    name: "priority",
    label: "Prioridad",
    options: Object.values(TicketPriority).map((priority) => ({
      value: priority,
      label: TICKET_PRIORITY_LABELS[priority],
    })),
  },
];

const TICKET_DETAIL: ItemDetailLink<Ticket> = {
  href: (ticket) => ({ pathname: "/tickets/[id]", params: { id: ticket.id } }),
  label: (ticket) => ticket.title,
};

/** Quien solo ve los suyos no necesita que se le repita el solicitante. */
function TicketRow({
  ticket,
  showRequester,
}: {
  ticket: Ticket;
  showRequester: boolean;
}) {
  return (
    <View className="rounded-xl bg-element px-4 py-3 dark:bg-element-dark">
      <Text
        className="text-base font-semibold text-content dark:text-content-dark"
        numberOfLines={1}
      >
        {ticket.title}
      </Text>
      <Text className="mt-0.5 text-sm text-muted dark:text-muted-dark">
        {TICKET_STATUS_LABELS[ticket.status]}
        {" · "}
        {TICKET_PRIORITY_LABELS[ticket.priority]}
        {showRequester ? ` · ${ticket.requester.full_name}` : ""}
      </Text>
    </View>
  );
}
