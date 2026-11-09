import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

import { toApiError } from "@/lib/api";

/**
 * Confirmacion de una accion destructiva. Modal propio porque `Alert` no hace
 * nada en web. Mientras vuela la peticion no se puede cerrar; si falla, el
 * error sale aqui y se puede reintentar.
 */
export function ConfirmModal({
  isVisible,
  title,
  message,
  confirmLabel,
  busyLabel,
  confirm,
  onClose,
  onDone,
}: {
  isVisible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** Lo que dice el boton mientras vuela la peticion. */
  busyLabel: string;
  confirm: () => Promise<void>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (isSubmitting) return;
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await confirm();
      onDone();
    } catch (cause) {
      setError(toApiError(cause).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      {/* Tocar fuera cierra; la tarjeta no propaga el toque. */}
      <Pressable
        className="flex-1 items-center justify-center bg-black/40 px-6"
        onPress={close}
      >
        <Pressable
          className="w-full max-w-md gap-4 rounded-2xl bg-surface p-6 dark:bg-element-dark"
          onPress={(event) => event.stopPropagation()}
        >
          <Text className="text-lg font-bold text-content dark:text-content-dark">
            {title}
          </Text>
          <Text className="text-base leading-6 text-muted dark:text-muted-dark">
            {message}
          </Text>

          {error ? (
            <View className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
              <Text className="text-sm text-danger dark:text-danger-dark">
                {error}
              </Text>
            </View>
          ) : null}

          <View className="flex-row gap-3">
            <Pressable
              className={`flex-1 items-center justify-center rounded-xl border border-selected py-3 active:opacity-70 dark:border-selected-dark ${
                isSubmitting ? "opacity-50" : ""
              }`}
              onPress={close}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting }}
            >
              <Text className="text-base font-semibold text-content dark:text-content-dark">
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-danger py-3 active:opacity-80 dark:bg-danger-dark ${
                isSubmitting ? "opacity-50" : ""
              }`}
              onPress={handleConfirm}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityState={{
                disabled: isSubmitting,
                busy: isSubmitting,
              }}
            >
              {isSubmitting ? <ActivityIndicator color="#ffffff" /> : null}
              <Text className="text-base font-semibold text-white">
                {isSubmitting ? busyLabel : confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}