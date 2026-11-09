import { FormModal, type FormField } from "@/components/form-modal";

type EditModalProps<ValuesT, ResultT> = {
  isVisible: boolean;
  title: string;
  submitLabel?: string;
  fields: FormField<ValuesT>[];
  /** Los valores actuales del registro: con ellos arranca y contra ellos se compara. */
  initialValues: ValuesT;
  /**
   * El `PATCH`. Recibe solo los campos que cambiaron, con los `text` ya
   * recortados: lo que no viene se queda como esta en la API.
   */
  submit: (changes: Partial<ValuesT>) => Promise<ResultT>;
  onClose: () => void;
  onSaved: (result: ResultT) => void;
};

/**
 * Edicion generica sobre `FormModal`. Se diferencia del alta en dos cosas: el
 * formulario arranca con los valores del registro, y solo se envia lo que
 * cambio (sin cambios, el boton no se habilita).
 *
 * `FormModal` lee `initialValues` al montarse: para editar otro registro hay
 * que remontarlo, montandolo solo con un registro elegido o con `key={id}`.
 */
export function EditModal<ValuesT extends Record<string, unknown>, ResultT>({
  submitLabel = "Guardar",
  initialValues,
  submit,
  onSaved,
  ...props
}: EditModalProps<ValuesT, ResultT>) {
  return (
    <FormModal
      {...props}
      initialValues={initialValues}
      submitLabel={submitLabel}
      busyLabel="Guardando..."
      canSubmit={(values) =>
        Object.keys(changedValues(initialValues, values)).length > 0
      }
      submit={(values) => submit(changedValues(initialValues, values))}
      onDone={onSaved}
    />
  );
}

/** Los campos de `values` que difieren de `initial` (comparacion por valor). */
function changedValues<ValuesT extends Record<string, unknown>>(
  initial: ValuesT,
  values: ValuesT,
): Partial<ValuesT> {
  const changes: Partial<ValuesT> = {};
  for (const key of Object.keys(values) as (keyof ValuesT)[]) {
    if (!isSameValue(values[key], initial[key])) changes[key] = values[key];
  }
  return changes;
}

/**
 * Los arrays (un `multichoice`) son siempre un objeto nuevo: se comparan como
 * conjunto, porque `SelectField` anade al final y desmarcar y volver a marcar
 * solo cambia el orden.
 */
function isSameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item) => b.includes(item));
  }
  return Object.is(a, b);
}