import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { toApiError } from "@/lib/api";
import { TICKET_STATUS_LABELS } from "@/lib/ticket-labels";
import {
  assignTicket,
  closeTicket,
  reopenTicket,
  unassignTicket,
  updateTicket,
} from "@/services/tickets";
import type { Ticket } from "@/types";
import { TicketStatus } from "@/types";

/** El orden de los chips: el ciclo de vida del ticket. */
const STATUS_ORDER: TicketStatus[] = [
  TicketStatus.open,
  TicketStatus.in_progress,
  TicketStatus.resolved,
  TicketStatus.closed,
];

/**
 * Cambio de estado y auto asignacion, para el personal. Cada boton pide el
 * permiso de su endpoint en `app/modules/tickets/router.py`: el PATCH
 * `ticket:update`, cerrar y reabrir `ticket:close`, y las asignaciones
 * `ticket:assign`. Sin ninguno de los tres no se pinta.
 */
export function TicketActions({
  ticket,
  userId,
  canUpdate,
  canClose,
  canAssign,
  onChange,
}: {
  ticket: Ticket;
  userId: string;
  canUpdate: boolean;
  canClose: boolean;
  canAssign: boolean;
  onChange: (ticket: Ticket) => void;
}) {
  const theme = useTheme();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canUpdate && !canClose && !canAssign) return null;

  const isAssigned = ticket.assignees.some(
    (assignee) => assignee.support_agent_id === userId,
  );

  async function run(action: () => Promise<Ticket>) {
    setIsBusy(true);
    setError(null);
    try {
      onChange(await action());
    } catch (cause) {
      setError(toApiError(cause).message);
    } finally {
      setIsBusy(false);
    }
  }

  /**
   * Un ticket cerrado no admite PATCH (409 en `update_ticket`): se reabre, que
   * lo deja en `open`, y si se pidio otro estado se aplica despues.
   */
  async function changeStatus(target: TicketStatus) {
    if (target === TicketStatus.closed) return closeTicket(ticket.id);
    if (ticket.status !== TicketStatus.closed) {
      return updateTicket(ticket.id, { status: target });
    }
    const reopened = await reopenTicket(ticket.id);
    return target === TicketStatus.open
      ? reopened
      : updateTicket(ticket.id, { status: target });
  }

  function isAllowed(target: TicketStatus): boolean {
    if (target === ticket.status) return false;
    if (target === TicketStatus.closed) return canClose;
    if (ticket.status === TicketStatus.closed) {
      return canClose && (target === TicketStatus.open || canUpdate);
    }
    return canUpdate;
  }

  return (
    <View className="gap-4 rounded-2xl bg-element p-4 dark:bg-element-dark">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-muted-dark">
          Gestion
        </Text>
        {isBusy ? <ActivityIndicator size="small" /> : null}
      </View>

      {canUpdate || canClose ? (
        <View className="gap-2">
          <Text className="text-sm text-content dark:text-content-dark">
            Estado
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {STATUS_ORDER.map((value) => {
              const isSelected = value === ticket.status;
              const isEnabled = !isBusy && isAllowed(value);
              return (
                <Pressable
                  key={value}
                  className={`rounded-full border px-4 py-2 active:opacity-70 ${
                    isSelected
                      ? "border-brand bg-brand dark:border-brand-dark dark:bg-brand-dark"
                      : "border-selected bg-surface dark:border-selected-dark dark:bg-surface-dark"
                  } ${isEnabled || isSelected ? "" : "opacity-50"}`}
                  disabled={!isEnabled}
                  onPress={() => run(() => changeStatus(value))}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: isSelected,
                    disabled: !isEnabled,
                  }}
                >
                  <Text
                    className={
                      isSelected
                        ? "text-sm font-medium text-white"
                        : "text-sm text-content dark:text-content-dark"
                    }
                  >
                    {TICKET_STATUS_LABELS[value]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {canAssign ? (
        <Pressable
          className={`flex-row items-center justify-center gap-2 rounded-xl py-3 active:opacity-80 ${
            isAssigned
              ? "border border-selected bg-surface dark:border-selected-dark dark:bg-surface-dark"
              : "bg-brand dark:bg-brand-dark"
          } ${isBusy ? "opacity-50" : ""}`}
          disabled={isBusy}
          onPress={() =>
            run(() =>
              isAssigned
                ? unassignTicket(ticket.id, userId)
                : assignTicket(ticket.id, { support_agent_id: userId }),
            )
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy, busy: isBusy }}
        >
          <Ionicons
            name={isAssigned ? "person-remove-outline" : "person-add-outline"}
            size={18}
            color={isAssigned ? theme.text : "#ffffff"}
          />
          <Text
            className={
              isAssigned
                ? "text-base font-semibold text-content dark:text-content-dark"
                : "text-base font-semibold text-white"
            }
          >
            {isAssigned ? "Quitarme del ticket" : "Asignarmelo"}
          </Text>
        </Pressable>
      ) : null}

      {error ? (
        <View className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
          <Text className="text-sm text-danger dark:text-danger-dark">
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}