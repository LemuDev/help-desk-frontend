import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DetailCard, formatDate, InfoRow } from "@/components/detail-card";
import { EditModal } from "@/components/edit-modal";
import type { FormField } from "@/components/form-modal";
import { TicketActions } from "@/components/ticket-actions";
import { useTheme } from "@/hooks/use-theme";
import { toApiError } from "@/lib/api";
import { initials } from "@/lib/initials";
import { can, isCustomer } from "@/lib/permissions";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_TONES,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TONES,
  type BadgeTone,
} from "@/lib/ticket-labels";
import { fetchProduct } from "@/services/catalog";
import { fetchBranch, fetchCompany } from "@/services/companies";
import { fetchTicket, updateTicket } from "@/services/tickets";
import { useAuthStore } from "@/store/auth-store";
import type { CurrentUser, Ticket, TicketUpdate, TicketUser } from "@/types";
import { Action, Resource, TicketPriority, TicketStatus } from "@/types";

/**
 * Detalle de un ticket (`/tickets/{id}`). Protegida por `ticket:read` en
 * `SCREEN_PERMISSIONS`, el mismo permiso que la lista y que `GET /tickets/{id}`.
 *
 * No usa `DetailView`: un ticket se lee y se trabaja desde aqui (estado,
 * asignacion, edicion), y la lista de `etiqueta: valor` generica no da para
 * eso.
 */
export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const [state, setState] = useState<{
    ticket: Ticket | null;
    isLoading: boolean;
    error: string | null;
  }>({ ticket: null, isLoading: true, error: null });
  // Subirlo relanza la carga: es el "Reintentar".
  const [attempt, setAttempt] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Si cambia el id (o se sale) antes de que llegue, la respuesta se descarta.
    let isCurrent = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga contra la API, como `DetailView`.
    setState({ ticket: null, isLoading: true, error: null });
    fetchTicket(id)
      .then(
        (ticket) =>
          isCurrent && setState({ ticket, isLoading: false, error: null }),
      )
      .catch(
        (cause) =>
          isCurrent &&
          setState({
            ticket: null,
            isLoading: false,
            error: toApiError(cause).message,
          }),
      );
    return () => {
      isCurrent = false;
    };
  }, [id, attempt]);

  const { ticket, isLoading, error } = state;
  const replace = (next: Ticket) =>
    setState({ ticket: next, isLoading: false, error: null });

  // Un ticket cerrado no se edita (409 en `update_ticket`): primero se reabre.
  const canEdit =
    ticket !== null &&
    ticket.status !== TicketStatus.closed &&
    can(user, Resource.ticket, Action.update);

  return (
    // El inset de arriba lo pone el `TopBar`, asi que aqui solo el de abajo.
    <SafeAreaView
      className="flex-1 bg-surface dark:bg-surface-dark"
      edges={["bottom", "left", "right"]}
    >
      {isLoading ? <ActivityIndicator className="mt-10" /> : null}

      {error ? (
        <View className="m-6 gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
          <Text className="text-sm text-danger dark:text-danger-dark">
            {error}
          </Text>
          <Pressable
            onPress={() => setAttempt((current) => current + 1)}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text className="text-sm font-semibold text-brand dark:text-brand-dark">
              Reintentar
            </Text>
          </Pressable>
        </View>
      ) : null}

      {ticket !== null ? (
        <ScrollView contentContainerClassName="w-full max-w-3xl self-center gap-4 px-6 pb-10 pt-4">
          {/* Cabecera */}
          <View className="gap-3">
            <View className="flex-row flex-wrap items-center gap-2">
              <Badge
                tone={TICKET_STATUS_TONES[ticket.status]}
                label={TICKET_STATUS_LABELS[ticket.status]}
              />
              <Badge
                tone={TICKET_PRIORITY_TONES[ticket.priority]}
                label={`Prioridad ${TICKET_PRIORITY_LABELS[ticket.priority].toLowerCase()}`}
              />
              <Text className="ml-auto text-xs text-muted dark:text-muted-dark">
                #{ticket.id.slice(0, 8)}
              </Text>
            </View>

            <View className="flex-row items-start gap-3">
              <Text className="flex-1 text-2xl font-bold text-content dark:text-content-dark">
                {ticket.title}
              </Text>
              {canEdit ? (
                <Pressable
                  className="h-10 w-10 items-center justify-center rounded-full bg-element active:opacity-70 dark:bg-element-dark"
                  onPress={() => setIsEditing(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Editar ticket"
                  hitSlop={8}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={theme.textSecondary}
                  />
                </Pressable>
              ) : null}
            </View>

            <Text className="text-sm text-muted dark:text-muted-dark">
              Abierto por{" "}
              <Text className="font-semibold text-content dark:text-content-dark">
                {ticket.requester.full_name}
              </Text>{" "}
              · {formatDate(ticket.created_at)}
            </Text>
          </View>

          {/* Descripcion */}
          <DetailCard title="Descripcion">
            <Text className="text-base leading-6 text-content dark:text-content-dark">
              {ticket.description}
            </Text>
          </DetailCard>

          {/*
            Un cliente no gestiona su ticket desde aqui aunque su rol tenga
            `ticket:close` (el `customer` lo tiene): su seguimiento es otra cosa.
          */}
          {user && !isCustomer(user) ? (
            <TicketActions
              ticket={ticket}
              userId={user.id}
              canUpdate={can(user, Resource.ticket, Action.update)}
              canClose={can(user, Resource.ticket, Action.close)}
              canAssign={can(user, Resource.ticket, Action.assign)}
              onChange={replace}
            />
          ) : null}

          <DetailCard title="Asignados">
            {ticket.assignees.length === 0 ? (
              <Text className="text-sm text-muted dark:text-muted-dark">
                Nadie lo lleva todavia.
              </Text>
            ) : (
              <View className="gap-3">
                {ticket.assignees.map((assignee) => (
                  <PersonRow
                    key={assignee.id}
                    person={assignee.agent}
                    caption={`Desde ${formatDate(assignee.created_at)}`}
                  />
                ))}
              </View>
            )}
          </DetailCard>

          <DetailCard title="Solicitante">
            <PersonRow
              person={ticket.requester}
              caption={`@${ticket.requester.username}`}
            />
          </DetailCard>

          <TicketInfo ticket={ticket} user={user} />
        </ScrollView>
      ) : null}

      {ticket !== null && canEdit ? (
        <EditModal
          // `FormModal` lee `initialValues` al montarse: cada version del
          // ticket es un formulario nuevo.
          key={ticket.updated_at}
          isVisible={isEditing}
          title="Editar ticket"
          fields={EDIT_FIELDS}
          initialValues={{
            title: ticket.title,
            description: ticket.description,
            priority: ticket.priority,
          }}
          submit={(changes) => updateTicket(ticket.id, changes)}
          onClose={() => setIsEditing(false)}
          onSaved={(saved) => {
            setIsEditing(false);
            replace(saved);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

/**
 * Los mismos limites que `Title` y `Description` en
 * `app/modules/tickets/schemas.py`. El estado no va aqui: tiene sus chips en
 * `TicketActions`, y cerrar pide otro endpoint.
 */
const EDIT_FIELDS: FormField<
  Required<Pick<TicketUpdate, "title" | "description" | "priority">>
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
    hint: "Maximo 1000 caracteres.",
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

/**
 * Empresa, sucursal, producto y fechas. `TicketRead` solo trae los ids, asi
 * que los nombres se piden aparte, y solo si el usuario puede leerlos: el rol
 * `agent` no tiene `company:read` (`app/core/seed.py`). Si no se puede o
 * falla, se queda el id.
 */
function TicketInfo({
  ticket,
  user,
}: {
  ticket: Ticket;
  user: CurrentUser | null;
}) {
  const { company_id: companyId, branch_id: branchId, product_id: productId } =
    ticket;
  const canReadCompany = can(user, Resource.company, Action.read);
  const canReadBranch = can(user, Resource.branch, Action.read);
  const canReadProduct = can(user, Resource.product, Action.read);

  const [names, setNames] = useState<{
    company?: string;
    branch?: string;
    product?: string;
  }>({});

  useEffect(() => {
    let isCurrent = true;
    // Sin `Promise.all`: que falle uno no tiene por que tumbar los otros dos.
    void Promise.allSettled([
      companyId !== null && canReadCompany
        ? fetchCompany(String(companyId)).then((company) => company.name)
        : undefined,
      companyId !== null && branchId !== null && canReadBranch
        ? fetchBranch(companyId, branchId).then((branch) => branch.name)
        : undefined,
      productId !== null && canReadProduct
        ? fetchProduct(productId).then((product) => product.name)
        : undefined,
    ]).then(([company, branch, product]) => {
      if (!isCurrent) return;
      const value = (result: PromiseSettledResult<string | undefined>) =>
        result.status === "fulfilled" ? result.value : undefined;
      setNames({
        company: value(company),
        branch: value(branch),
        product: value(product),
      });
    });
    return () => {
      isCurrent = false;
    };
  }, [companyId, branchId, productId, canReadCompany, canReadBranch, canReadProduct]);

  return (
    <DetailCard title="Detalles">
      <InfoRow
        icon="business-outline"
        label="Empresa"
        value={companyId === null ? null : (names.company ?? `#${companyId}`)}
      />
      <InfoRow
        icon="storefront-outline"
        label="Sucursal"
        value={branchId === null ? null : (names.branch ?? `#${branchId}`)}
      />
      <InfoRow
        icon="cube-outline"
        label="Producto"
        value={
          productId === null
            ? null
            : (names.product ?? `#${productId.slice(0, 8)}`)
        }
      />
      <InfoRow
        icon="calendar-outline"
        label="Creado"
        value={formatDate(ticket.created_at)}
      />
      <InfoRow
        icon="time-outline"
        label="Actualizado"
        value={formatDate(ticket.updated_at)}
      />
      {ticket.closed_at ? (
        <InfoRow
          icon="lock-closed-outline"
          label="Cerrado"
          value={formatDate(ticket.closed_at)}
        />
      ) : null}
    </DetailCard>
  );
}


function Badge({ tone, label }: { tone: BadgeTone; label: string }) {
  return (
    <View className={`rounded-full px-3 py-1 ${tone.container}`}>
      <Text className={`text-xs font-semibold ${tone.text}`}>{label}</Text>
    </View>
  );
}

function PersonRow({
  person,
  caption,
}: {
  person: TicketUser;
  caption: string;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-brand/15 dark:bg-brand-dark/25">
        <Text className="text-xs font-bold text-brand dark:text-brand-dark">
          {initials(person.full_name, person.username)}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-content dark:text-content-dark">
          {person.full_name}
        </Text>
        <Text className="text-xs text-muted dark:text-muted-dark">
          {caption}
        </Text>
      </View>
    </View>
  );
}


