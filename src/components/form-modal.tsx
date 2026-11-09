import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { SelectField } from "@/components/select-field";
import { useTheme } from "@/hooks/use-theme";
import { toApiError } from "@/lib/api";

/**
 * Formulario generico, como hoja que sube desde abajo. Es la base de
 * `CreateModal` y `EditModal`: igual que `ItemList` con las listas, cada
 * pantalla solo describe sus campos y como se envian; carga de opciones,
 * validacion minima, errores de la API y reset van aqui.
 */

export type ChoiceValue = string | number;
export type ChoiceOption = { value: ChoiceValue; label: string };

/** Lo que tienen todos los campos. `name` es la clave en `ValuesT`. */
type BaseField<ValuesT> = {
  name: keyof ValuesT & string;
  label: string;
  hint?: string;
  /** No se pinta (ni carga sus opciones). Su valor se envia igual. */
  hidden?: boolean | ((values: ValuesT) => boolean);
};

export type FormField<ValuesT> = BaseField<ValuesT> &
  (
    | {
        type: "text";
        /** Sin llegar a esto (tras recortar) no se puede enviar. 0 = opcional. */
        minLength?: number;
        /**
         * Vacio tambien vale, aunque haya `minLength`. Para la contrasena al
         * editar: vacia = no cambiarla, escrita = con su minimo.
         */
        optional?: boolean;
        /** Recorta espacios antes de validar y enviar. Por defecto si. */
        trim?: boolean;
        secure?: boolean;
        /** Varias lineas, como un `<textarea>`: para textos largos. */
        multiline?: boolean;
        inputProps?: Pick<
          TextInputProps,
          | "autoCapitalize"
          | "autoComplete"
          | "textContentType"
          | "keyboardType"
          | "placeholder"
        >;
      }
    | { type: "switch" }
    | {
        type: "choice";
        /**
         * Lista fija, o un cargador. El cargador tiene que ser estable —una
         * funcion de modulo—, como `fetchPage` en `usePaginated`: se vuelve a
         * llamar solo cuando cambian los campos de `dependsOn`.
         */
        options:
          | ChoiceOption[]
          | ((values: ValuesT) => Promise<ChoiceOption[]>);
        /** Al cambiar alguno, este campo se vacia (`null`) y recarga. */
        dependsOn?: (keyof ValuesT & string)[];
        /** Tocar la opcion elegida la quita (valor `null`). */
        clearable?: boolean;
        /**
         * Sin elegir (`null`) no se puede enviar. Solo cuenta mientras el
         * campo se ve: oculto, su valor no lo puede cambiar nadie.
         */
        required?: boolean;
        emptyLabel?: string;
        /**
         * `chips` (por defecto) pinta todas las opciones a la vista: para
         * listas cortas y fijas. `select` las mete en una hoja con buscador
         * (`SelectField`): para las que crecen, como empresas o sucursales.
         */
        display?: "chips" | "select";
        /** Lo que dice el `select` sin nada elegido. */
        placeholder?: string;
      }
    | {
        /**
         * Varias opciones a la vez, siempre en hoja (`SelectField` multiple):
         * p.ej. las categorias de un producto. El valor es un array; vacio
         * vale. Sin `dependsOn`: ninguna lista multiple depende de otro campo.
         */
        type: "multichoice";
        options:
          | ChoiceOption[]
          | ((values: ValuesT) => Promise<ChoiceOption[]>);
        emptyLabel?: string;
        placeholder?: string;
      }
  );

export type FormModalProps<ValuesT, ResultT> = {
  isVisible: boolean;
  title: string;
  submitLabel: string;
  /** Lo que dice el boton mientras vuela la peticion. */
  busyLabel: string;
  fields: FormField<ValuesT>[];
  /** Con lo que arranca el formulario, y a lo que vuelve al cerrar o enviar. */
  initialValues: ValuesT;
  /** Recibe los valores con los `text` ya recortados. */
  submit: (values: ValuesT) => Promise<ResultT>;
  /** Condicion extra para habilitar el envio, sobre los valores ya recortados. */
  canSubmit?: (values: ValuesT) => boolean;
  onClose: () => void;
  onDone: (result: ResultT) => void;
};

export function FormModal<ValuesT extends Record<string, unknown>, ResultT>({
  isVisible,
  title,
  submitLabel,
  busyLabel,
  fields,
  initialValues,
  submit,
  canSubmit: extraCheck,
  onClose,
  onDone,
}: FormModalProps<ValuesT, ResultT>) {
  const theme = useTheme();

  const [values, setValues] = useState<ValuesT>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleFields = fields.filter((field) =>
    typeof field.hidden === "function" ? !field.hidden(values) : !field.hidden,
  );

  /**
   * Cambia un campo y vacia los que dependen de el, en cascada. A `null` y no
   * al valor inicial: al editar, el inicial (p.ej. la sucursal) seria de la
   * empresa anterior.
   */
  function setValue(name: keyof ValuesT & string, value: unknown) {
    setValues((current) => {
      const next = { ...current, [name]: value };
      const pending = [name];
      while (pending.length > 0) {
        const changed = pending.pop()!;
        for (const field of fields) {
          if (field.type === "choice" && field.dependsOn?.includes(changed)) {
            next[field.name] = null as ValuesT[typeof field.name];
            pending.push(field.name);
          }
        }
      }
      return next;
    });
  }

  function trimmed(): ValuesT {
    const result = { ...values };
    for (const field of fields) {
      if (field.type === "text" && field.trim !== false) {
        result[field.name] = String(
          values[field.name] ?? "",
        ).trim() as ValuesT[typeof field.name];
      }
    }
    return result;
  }

  function close() {
    if (isSubmitting) return;
    setValues(initialValues);
    setError(null);
    onClose();
  }

  // Los minimos del schema de la API: asi el 422 casi nunca llega.
  const prepared = trimmed();
  const canSubmit =
    !isSubmitting &&
    visibleFields.every((field) => {
      if (field.type === "choice") {
        return !field.required || prepared[field.name] != null;
      }
      if (field.type !== "text") return true;
      const length = String(prepared[field.name] ?? "").length;
      return (
        (field.optional && length === 0) || length >= (field.minLength ?? 0)
      );
    }) &&
    (extraCheck?.(prepared) ?? true);

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submit(prepared);
      setValues(initialValues);
      onDone(result);
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
      animationType="slide"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Tocar fuera cierra; la hoja no propaga el toque. */}
        <Pressable className="flex-1 justify-end bg-black/40" onPress={close}>
          <Pressable
            className="max-h-[90%] rounded-t-2xl bg-surface pb-8 dark:bg-element-dark"
            onPress={(event) => event.stopPropagation()}
          >
            <View className="flex-row items-center gap-3 border-b border-selected px-6 py-4 dark:border-selected-dark">
              <Text className="flex-1 text-lg font-bold text-content dark:text-content-dark">
                {title}
              </Text>
              <Pressable
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                hitSlop={8}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerClassName="gap-4 px-6 pt-4"
              keyboardShouldPersistTaps="handled"
            >
              {error ? (
                <View className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
                  <Text className="text-sm text-danger dark:text-danger-dark">
                    {error}
                  </Text>
                </View>
              ) : null}

              {visibleFields.map((field) => (
                <FieldInput
                  key={field.name}
                  field={field}
                  values={values}
                  isDisabled={isSubmitting}
                  onChange={(value) => setValue(field.name, value)}
                />
              ))}

              <Pressable
                className={`mt-2 flex-row items-center justify-center gap-2 rounded-xl bg-brand py-4 active:opacity-80 dark:bg-brand-dark ${
                  canSubmit ? "" : "opacity-50"
                }`}
                disabled={!canSubmit}
                onPress={handleSubmit}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: !canSubmit,
                  busy: isSubmitting,
                }}
              >
                {isSubmitting ? <ActivityIndicator color="#ffffff" /> : null}
                <Text className="text-base font-semibold text-white">
                  {isSubmitting ? busyLabel : submitLabel}
                </Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FieldInput<ValuesT extends Record<string, unknown>>({
  field,
  values,
  isDisabled,
  onChange,
}: {
  field: FormField<ValuesT>;
  values: ValuesT;
  isDisabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const theme = useTheme();
  const value = values[field.name];

  switch (field.type) {
    case "text":
      return (
        <Field label={field.label} hint={field.hint}>
          <TextInput
            className={
              "rounded-xl border border-selected bg-element px-4 py-3 text-base text-content " +
              "dark:border-selected-dark dark:bg-surface-dark dark:text-content-dark" +
              (field.multiline ? " min-h-32" : "")
            }
            value={String(value ?? "")}
            onChangeText={onChange}
            secureTextEntry={field.secure}
            multiline={field.multiline}
            // En web `numberOfLines` es lo que da la altura del `<textarea>`;
            // en Android, sin `textAlignVertical` el texto sale centrado.
            numberOfLines={field.multiline ? 5 : undefined}
            textAlignVertical={field.multiline ? "top" : undefined}
            autoCorrect={false}
            placeholderTextColor={theme.textSecondary}
            editable={!isDisabled}
            {...field.inputProps}
          />
        </Field>
      );

    case "switch":
      return (
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1 gap-1">
            <Text className="text-sm font-medium text-muted dark:text-muted-dark">
              {field.label}
            </Text>
            {field.hint ? (
              <Text className="text-xs text-muted dark:text-muted-dark">
                {field.hint}
              </Text>
            ) : null}
          </View>
          <Switch
            value={Boolean(value)}
            onValueChange={onChange}
            disabled={isDisabled}
          />
        </View>
      );

    case "choice":
      return (
        <Field label={field.label} hint={field.hint}>
          <ChoiceInput
            title={field.label}
            display={field.display ?? "chips"}
            placeholder={field.placeholder}
            clearable={Boolean(field.clearable)}
            isDisabled={isDisabled}
            options={field.options}
            dependencies={(field.dependsOn ?? []).map((name) => values[name])}
            values={values}
            selected={(value as ChoiceValue | null) ?? null}
            emptyLabel={field.emptyLabel}
            onChange={onChange}
          />
        </Field>
      );

    case "multichoice":
      return (
        <Field label={field.label} hint={field.hint}>
          <MultiChoiceInput
            title={field.label}
            placeholder={field.placeholder}
            isDisabled={isDisabled}
            options={field.options}
            values={values}
            selected={(value as ChoiceValue[] | null) ?? []}
            emptyLabel={field.emptyLabel}
            onChange={onChange}
          />
        </Field>
      );
  }
}

function MultiChoiceInput<ValuesT>({
  title,
  placeholder,
  isDisabled,
  options,
  values,
  selected,
  emptyLabel = "No hay opciones.",
  onChange,
}: {
  title: string;
  placeholder?: string;
  isDisabled: boolean;
  options: ChoiceOption[] | ((values: ValuesT) => Promise<ChoiceOption[]>);
  values: ValuesT;
  selected: ChoiceValue[];
  emptyLabel?: string;
  onChange: (value: ChoiceValue[]) => void;
}) {
  const { list, isLoading, error } = useChoiceOptions(options, [], values);

  if (error) {
    return (
      <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text>
    );
  }

  return (
    <SelectField
      multiple
      title={title}
      placeholder={placeholder}
      emptyLabel={emptyLabel}
      options={list}
      value={selected}
      onChange={onChange}
      isLoading={isLoading}
      isDisabled={isDisabled}
    />
  );
}

/**
 * Las opciones de un campo `choice` o `multichoice`: la lista fija tal cual, o
 * la del cargador, que se vuelve a llamar solo cuando cambian `dependencies`.
 */
function useChoiceOptions<ValuesT>(
  options: ChoiceOption[] | ((values: ValuesT) => Promise<ChoiceOption[]>),
  dependencies: unknown[],
  values: ValuesT,
) {
  const [loaded, setLoaded] = useState<{
    options: ChoiceOption[];
    isLoading: boolean;
    error: string | null;
  }>({ options: [], isLoading: true, error: null });

  const load = typeof options === "function" ? options : null;
  // Solo lo que declara `dependsOn` relanza la carga; el resto de `values` no.
  const dependencyKey = JSON.stringify(dependencies);

  useEffect(() => {
    if (!load) return;
    let isCurrent = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga contra la API, como `usePaginated`.
    setLoaded((current) => ({ ...current, isLoading: true, error: null }));
    load(values)
      .then(
        (result) =>
          isCurrent &&
          setLoaded({ options: result, isLoading: false, error: null }),
      )
      .catch(
        (cause) =>
          isCurrent &&
          setLoaded({
            options: [],
            isLoading: false,
            error: toApiError(cause).message,
          }),
      );
    return () => {
      isCurrent = false;
    };
    // `values` entra a proposito por `dependencyKey`: con el objeto entero
    // recargaria con cada tecla de otro campo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, dependencyKey]);

  return {
    list: load ? loaded.options : (options as ChoiceOption[]),
    isLoading: Boolean(load) && loaded.isLoading,
    error: load ? loaded.error : null,
  };
}

function ChoiceInput<ValuesT>({
  title,
  display,
  placeholder,
  clearable,
  isDisabled,
  options,
  dependencies,
  values,
  selected,
  emptyLabel = "No hay opciones.",
  onChange,
}: {
  title: string;
  display: "chips" | "select";
  placeholder?: string;
  clearable: boolean;
  isDisabled: boolean;
  options: ChoiceOption[] | ((values: ValuesT) => Promise<ChoiceOption[]>);
  dependencies: unknown[];
  values: ValuesT;
  selected: ChoiceValue | null;
  emptyLabel?: string;
  onChange: (value: ChoiceValue | null) => void;
}) {
  const { list, isLoading, error } = useChoiceOptions(
    options,
    dependencies,
    values,
  );

  if (error) {
    return (
      <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text>
    );
  }

  if (display === "select") {
    return (
      <SelectField
        title={title}
        placeholder={placeholder}
        emptyLabel={emptyLabel}
        options={list}
        value={selected}
        onChange={onChange}
        clearable={clearable}
        isLoading={isLoading}
        isDisabled={isDisabled}
      />
    );
  }

  if (isLoading)
    return <ActivityIndicator className="self-start" />;
  if (list.length === 0) {
    return (
      <Text className="text-sm text-muted dark:text-muted-dark">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {list.map(({ value, label }) => {
        const isSelected = value === selected;
        return (
          <Pressable
            key={value}
            className={`rounded-full border px-4 py-2 active:opacity-70 ${
              isSelected
                ? "border-brand bg-brand dark:border-brand-dark dark:bg-brand-dark"
                : "border-selected dark:border-selected-dark"
            }`}
            onPress={() =>
              onChange(clearable && value === selected ? null : value)
            }
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              className={
                isSelected
                  ? "text-sm font-medium text-white"
                  : "text-sm text-content dark:text-content-dark"
              }
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-muted dark:text-muted-dark">
        {label}
      </Text>
      {children}
      {hint ? (
        <Text className="text-xs text-muted dark:text-muted-dark">{hint}</Text>
      ) : null}
    </View>
  );
}