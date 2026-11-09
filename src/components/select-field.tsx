import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { useTheme } from "@/hooks/use-theme";

export type SelectOption<ValueT> = { value: ValueT; label: string };

type CommonProps<ValueT> = {
  /** El titulo de la hoja que se abre. */
  title: string;
  options: SelectOption<ValueT>[];
  placeholder?: string;
  emptyLabel?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
};

type SingleProps<ValueT> = CommonProps<ValueT> & {
  multiple?: false;
  value: ValueT | null;
  onChange: (value: ValueT | null) => void;
  /** Deja quitar la eleccion (valor `null`). */
  clearable?: boolean;
};

type MultipleProps<ValueT> = CommonProps<ValueT> & {
  multiple: true;
  value: ValueT[];
  onChange: (value: ValueT[]) => void;
};

/** Con mas opciones que esto, la hoja lleva buscador. */
const SEARCH_THRESHOLD = 6;

/**
 * Un `<select>`: el campo muestra lo elegido y al tocarlo sube una hoja con
 * las opciones. Para listas que crecen (empresas, sucursales, roles), donde
 * los chips de todas a la vez no se pueden recorrer.
 *
 * En simple, elegir cierra la hoja. En multiple cada fila se marca y desmarca,
 * y se cierra con "Listo".
 */
export function SelectField<ValueT extends string | number>(
  props: SingleProps<ValueT> | MultipleProps<ValueT>,
) {
  const {
    title,
    options,
    placeholder = "Seleccionar",
    emptyLabel = "No hay opciones.",
    isLoading = false,
    isDisabled = false,
  } = props;
  const theme = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected: ValueT[] = props.multiple
    ? props.value
    : props.value === null
      ? []
      : [props.value];
  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label);

  const normalizedQuery = normalize(query.trim());
  const visible = normalizedQuery
    ? options.filter((option) =>
        normalize(option.label).includes(normalizedQuery),
      )
    : options;

  function open() {
    setQuery("");
    setIsOpen(true);
  }

  function pick(value: ValueT) {
    if (props.multiple) {
      props.onChange(
        props.value.includes(value)
          ? props.value.filter((current) => current !== value)
          : [...props.value, value],
      );
      return;
    }
    props.onChange(props.clearable && value === props.value ? null : value);
    setIsOpen(false);
  }

  function clear() {
    if (props.multiple) props.onChange([]);
    else props.onChange(null);
  }

  const canClear =
    selected.length > 0 && (props.multiple || Boolean(props.clearable));

  return (
    <>
      <Pressable
        className={`flex-row items-center gap-2 rounded-xl border border-selected bg-element px-4 py-3 active:opacity-70 dark:border-selected-dark dark:bg-surface-dark ${
          isDisabled ? "opacity-50" : ""
        }`}
        onPress={open}
        disabled={isDisabled || isLoading}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${selectedLabels.join(", ") || placeholder}`}
        accessibilityState={{ disabled: isDisabled, expanded: isOpen }}
      >
        <Text
          className={`flex-1 text-base ${
            selectedLabels.length > 0
              ? "text-content dark:text-content-dark"
              : "text-muted dark:text-muted-dark"
          }`}
          numberOfLines={1}
        >
          {selectedLabels.length > 0 ? selectedLabels.join(", ") : placeholder}
        </Text>
        {props.multiple && selected.length > 1 ? (
          <View className="rounded-full bg-brand px-2 py-0.5 dark:bg-brand-dark">
            <Text className="text-xs font-semibold text-white">
              {selected.length}
            </Text>
          </View>
        ) : null}
        {isLoading ? (
          <ActivityIndicator size="small" />
        ) : (
          <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
        )}
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Tocar fuera cierra; la hoja no propaga el toque. */}
          <Pressable
            className="flex-1 justify-end bg-black/40"
            onPress={() => setIsOpen(false)}
          >
            <Pressable
              className="max-h-[80%] rounded-t-2xl bg-surface pb-8 dark:bg-element-dark"
              onPress={(event) => event.stopPropagation()}
            >
              <View className="flex-row items-center gap-3 border-b border-selected px-6 py-4 dark:border-selected-dark">
                <Text className="flex-1 text-lg font-bold text-content dark:text-content-dark">
                  {title}
                </Text>
                {canClear ? (
                  <Pressable
                    onPress={clear}
                    accessibilityRole="button"
                    hitSlop={8}
                  >
                    <Text className="text-sm font-semibold text-brand dark:text-brand-dark">
                      Quitar
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => setIsOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  hitSlop={8}
                >
                  <Ionicons name="close" size={24} color={theme.text} />
                </Pressable>
              </View>

              {options.length > SEARCH_THRESHOLD ? (
                <View className="px-6 pt-4">
                  <View className="flex-row items-center gap-2 rounded-xl border border-selected bg-element px-3 dark:border-selected-dark dark:bg-surface-dark">
                    <Ionicons
                      name="search"
                      size={18}
                      color={theme.textSecondary}
                    />
                    <TextInput
                      className="flex-1 py-3 text-base text-content dark:text-content-dark"
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Buscar"
                      placeholderTextColor={theme.textSecondary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      accessibilityLabel={`Buscar en ${title}`}
                    />
                  </View>
                </View>
              ) : null}

              <FlatList
                data={visible}
                keyExtractor={(option) => String(option.value)}
                contentContainerClassName="px-6 py-2"
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text className="py-4 text-sm text-muted dark:text-muted-dark">
                    {normalizedQuery
                      ? `Nada que coincida con "${query.trim()}".`
                      : emptyLabel}
                  </Text>
                }
                renderItem={({ item }) => {
                  const isSelected = selected.includes(item.value);
                  return (
                    <Pressable
                      className="flex-row items-center gap-3 border-b border-selected py-4 active:opacity-60 dark:border-selected-dark"
                      onPress={() => pick(item.value)}
                      accessibilityRole={props.multiple ? "checkbox" : "radio"}
                      accessibilityState={
                        props.multiple
                          ? { checked: isSelected }
                          : { selected: isSelected }
                      }
                    >
                      <Ionicons
                        name={
                          props.multiple
                            ? isSelected
                              ? "checkbox"
                              : "square-outline"
                            : isSelected
                              ? "radio-button-on"
                              : "radio-button-off"
                        }
                        size={22}
                        color={isSelected ? theme.text : theme.textSecondary}
                      />
                      <Text
                        className={`flex-1 text-base ${
                          isSelected
                            ? "font-semibold text-content dark:text-content-dark"
                            : "text-content dark:text-content-dark"
                        }`}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                }}
              />

              {props.multiple ? (
                <View className="px-6 pt-2">
                  <Pressable
                    className="items-center rounded-xl bg-brand py-4 active:opacity-80 dark:bg-brand-dark"
                    onPress={() => setIsOpen(false)}
                    accessibilityRole="button"
                  >
                    <Text className="text-base font-semibold text-white">
                      {selected.length > 0
                        ? `Listo (${selected.length})`
                        : "Listo"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

/** Sin mayusculas ni tildes, como la busqueda de la API. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
