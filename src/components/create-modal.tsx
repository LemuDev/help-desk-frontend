import { FormModal, type FormField } from "@/components/form-modal";

type CreateModalProps<ValuesT, ResultT> = {
  isVisible: boolean;
  title: string;
  submitLabel?: string;
  fields: FormField<ValuesT>[];
  /** Los valores por defecto de un registro nuevo. */
  initialValues: ValuesT;
  /** El `POST`. Recibe todos los valores, con los `text` ya recortados. */
  submit: (values: ValuesT) => Promise<ResultT>;
  onClose: () => void;
  onCreated: (result: ResultT) => void;
};

/**
 * Alta generica sobre `FormModal`: envia el formulario entero y, al crear,
 * vuelve a los valores por defecto para el siguiente.
 */
export function CreateModal<ValuesT extends Record<string, unknown>, ResultT>({
  submitLabel = "Crear",
  onCreated,
  ...props
}: CreateModalProps<ValuesT, ResultT>) {
  return (
    <FormModal
      {...props}
      submitLabel={submitLabel}
      busyLabel="Creando..."
      onDone={onCreated}
    />
  );
}