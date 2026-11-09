import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { SelectField } from "@/components/select-field";
import { useTheme } from "@/hooks/use-theme";
import { toApiError } from "@/lib/api";
import { can } from "@/lib/permissions";
import {
  ACTION_LABELS,
  RESOURCE_LABELS,
  SLUG_MAX_LENGTH,
  SLUG_PATTERN,
  groupPermissions,
  sameIds,
  slugify,
  type PermissionGroup,
} from "@/lib/role-form";
import { fetchCompanies } from "@/services/companies";
import {
  createRole,
  deleteRole,
  fetchPermissions,
  updateRole,
} from "@/services/roles";
import { useAuthStore } from "@/store/auth-store";
import type { Company, Permission, Role, RoleUpdate } from "@/types";
import { Action, Resource } from "@/types";

/** El tope de `size` de la API (`PageParams`): con mas, las ultimas no salen. */
const PICKER_SIZE = 50;
/** `Description` en `app/modules/auth/schemas.py`. */
const DESCRIPTION_MAX_LENGTH = 255;

type RoleFormModalProps = {
  /** Sin rol es un alta; con rol, su edicion. */
  role?: Role;
  onClose: () => void;
  /** Tras crear, guardar o borrar: la lista tiene que recargar. */
  onDone: () => void;
};

/**
 * Alta y edicion de un rol, como hoja que sube desde abajo. No va sobre
 * `FormModal` porque los permisos no son un `choice`: son una seleccion
 * multiple agrupada por recurso, donde `<recurso>:manage` cubre al resto
 * (`Role.grants()`), y eso no cabe en sus campos.
 *
 * Lee el rol al montarse: se monta solo cuando hace falta y con `key={id}`,
 * igual que `EditModal`.
 *
 * Las reglas de un rol de sistema (`RoleController.update_role`) se adelantan
 * aqui para no llegar al 409: nombre y slug fijos, y sin boton de borrar.
 */
export function RoleFormModal({ role, onClose, onDone }: RoleFormModalProps) {
  const theme = useTheme();
  const currentUser = useAuthStore((state) => state.user);
  const isEdit = role !== undefined;
  const isSystem = Boolean(role?.is_system);
  // La empresa solo se elige al crear: `RoleUpdate` no la acepta.
  const canPickCompany =
    !isEdit && can(currentUser, Resource.company, Action.read);
  const canDelete =
    isEdit && !isSystem && can(currentUser, Resource.role, Action.delete);

  const [name, setName] = useState(role?.name ?? "");
  const [slug, setSlug] = useState(role?.slug ?? "");
  // Mientras no se toque, el slug sigue al nombre. Al editar ya tiene el suyo.
  const [isSlugTouched, setIsSlugTouched] = useState(isEdit);
  const [description, setDescription] = useState(role?.description ?? "");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(role?.permissions.map((permission) => permission.id)),
  );

  const [catalog, setCatalog] = useState<{
    groups: PermissionGroup[];
    isLoading: boolean;
    error: string | null;
  }>({ groups: [], isLoading: true, error: null });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    fetchPermissions()
      .then(
        (permissions) =>
          isCurrent &&
          setCatalog({
            groups: groupPermissions(permissions),
            isLoading: false,
            error: null,
          }),
      )
      .catch(
        (cause) =>
          isCurrent &&
          setCatalog({
            groups: [],
            isLoading: false,
            error: toApiError(cause).message,
          }),
      );
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!canPickCompany) return;
    let isCurrent = true;
    fetchCompanies({ size: PICKER_SIZE })
      .then((page) => isCurrent && setCompanies(page.items))
      .catch((cause) => isCurrent && setError(toApiError(cause).message));
    return () => {
      isCurrent = false;
    };
  }, [canPickCompany]);

  function changeName(text: string) {
    setName(text);
    if (!isSlugTouched) setSlug(slugify(text));
  }

  function changeSlug(text: string) {
    setIsSlugTouched(true);
    setSlug(text.toLowerCase());
  }

  function toggle(permission: Permission) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(permission.id)) next.delete(permission.id);
      else next.add(permission.id);
      return next;
    });
  }

  /**
   * `manage` ya concede todo el recurso: al marcarlo se quitan las acciones
   * sueltas, que solo serian ruido en el rol.
   */
  function toggleManage(group: PermissionGroup) {
    const manage = group.manage;
    if (!manage) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(manage.id)) {
        next.delete(manage.id);
      } else {
        next.add(manage.id);
        for (const permission of group.actions) next.delete(permission.id);
      }
      return next;
    });
  }

  const trimmedName = name.trim();
  const trimmedSlug = slug.trim();
  const trimmedDescription = description.trim();

  /** Al editar, solo lo que cambio: lo que no viene se queda como esta. */
  function changes(): RoleUpdate {
    if (!role) return {};
    const result: RoleUpdate = {};
    if (trimmedName !== role.name) result.name = trimmedName;
    if (trimmedSlug !== role.slug) result.slug = trimmedSlug;
    // Vacia = `null`, que en `RoleUpdate` borra la descripcion.
    if (trimmedDescription !== (role.description ?? "")) {
      result.description = trimmedDescription || null;
    }
    const current = role.permissions.map((permission) => permission.id);
    if (!sameIds(selected, current)) result.permission_ids = [...selected];
    return result;
  }

  // Los mismos limites que `RoleCreate`: asi el 422 casi nunca llega.
  const isSlugValid =
    trimmedSlug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(trimmedSlug);
  const isValid =
    trimmedName.length > 0 &&
    isSlugValid &&
    trimmedDescription.length <= DESCRIPTION_MAX_LENGTH;
  const canSubmit =
    isValid &&
    !isSubmitting &&
    !catalog.isLoading &&
    (!isEdit || Object.keys(changes()).length > 0);

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (role) {
        await updateRole(role.id, changes());
      } else {
        await createRole({
          name: trimmedName,
          slug: trimmedSlug,
          description: trimmedDescription || null,
          company_id: companyId,
          permission_ids: [...selected],
        });
      }
      onDone();
    } catch (cause) {
      setError(toApiError(cause).message);
      setIsSubmitting(false);
    }
  }

  /** Dos toques: `Alert` no hace nada en web, asi que se confirma en el boton. */
  async function handleDelete() {
    if (!role || isSubmitting) return;
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      await deleteRole(role.id);
      onDone();
    } catch (cause) {
      // El 409 tipico: el rol aun tiene usuarios asignados.
      setError(toApiError(cause).message);
      setIsConfirmingDelete(false);
      setIsSubmitting(false);
    }
  }

  function close() {
    if (isSubmitting) return;
    onClose();
  }

  const inputClass =
    "rounded-xl border border-selected bg-element px-4 py-3 text-base text-content " +
    "dark:border-selected-dark dark:bg-surface-dark dark:text-content-dark";
  const lockedClass = isSystem ? " opacity-50" : "";

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
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
                {isEdit ? "Editar rol" : "Nuevo rol"}
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

              {isSystem ? (
                <Text className="text-sm text-muted dark:text-muted-dark">
                  Rol de sistema: solo se pueden cambiar la descripcion y los
                  permisos.
                </Text>
              ) : null}

              <Field label="Nombre" hint="Maximo 100 caracteres.">
                <TextInput
                  className={inputClass + lockedClass}
                  value={name}
                  onChangeText={changeName}
                  maxLength={100}
                  editable={!isSubmitting && !isSystem}
                />
              </Field>

              <Field
                label="Slug"
                hint={
                  slug.length > 0 && !isSlugValid
                    ? "Solo minusculas, digitos y guiones (- o _) entre palabras."
                    : "Identificador estable, unico en su empresa."
                }
              >
                <TextInput
                  className={inputClass + lockedClass}
                  value={slug}
                  onChangeText={changeSlug}
                  maxLength={SLUG_MAX_LENGTH}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting && !isSystem}
                />
              </Field>

              <Field label="Descripcion" hint="Opcional. Maximo 255 caracteres.">
                <TextInput
                  className={inputClass + " min-h-20"}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholderTextColor={theme.textSecondary}
                  editable={!isSubmitting}
                />
              </Field>

              {canPickCompany ? (
                <Field
                  label="Empresa"
                  hint="Sin empresa, el rol es global. No se puede cambiar despues."
                >
                  <SelectField
                    title="Empresa"
                    placeholder="Global (sin empresa)"
                    emptyLabel="No hay empresas."
                    options={companies.map(({ id, name }) => ({
                      value: id,
                      label: name,
                    }))}
                    value={companyId}
                    onChange={setCompanyId}
                    clearable
                    isDisabled={isSubmitting}
                  />
                </Field>
              ) : null}

              <Field
                label={`Permisos (${selected.size})`}
                hint={`"${ACTION_LABELS.manage}" concede cualquier accion sobre el recurso.`}
              >
                {catalog.isLoading ? (
                  <ActivityIndicator className="self-start" />
                ) : catalog.error ? (
                  <Text className="text-sm text-danger dark:text-danger-dark">
                    {catalog.error}
                  </Text>
                ) : (
                  <View className="gap-3">
                    {catalog.groups.map((group) => (
                      <PermissionGroupRow
                        key={group.resource}
                        group={group}
                        selected={selected}
                        isDisabled={isSubmitting}
                        onToggle={toggle}
                        onToggleManage={() => toggleManage(group)}
                      />
                    ))}
                  </View>
                )}
              </Field>

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
                  {isSubmitting
                    ? isEdit
                      ? "Guardando..."
                      : "Creando..."
                    : isEdit
                      ? "Guardar"
                      : "Crear rol"}
                </Text>
              </Pressable>

              {canDelete ? (
                <Pressable
                  className={`items-center rounded-xl border py-4 active:opacity-70 ${
                    isConfirmingDelete
                      ? "border-danger bg-danger/10"
                      : "border-danger/40"
                  } ${isSubmitting ? "opacity-50" : ""}`}
                  disabled={isSubmitting}
                  onPress={handleDelete}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isSubmitting }}
                >
                  <Text className="text-base font-semibold text-danger dark:text-danger-dark">
                    {isConfirmingDelete
                      ? "Toca otra vez para borrarlo"
                      : "Borrar rol"}
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Un recurso con sus acciones. Con `manage` marcado las demas salen marcadas
 * pero apagadas: estan concedidas, aunque no como permiso propio.
 */
function PermissionGroupRow({
  group,
  selected,
  isDisabled,
  onToggle,
  onToggleManage,
}: {
  group: PermissionGroup;
  selected: Set<number>;
  isDisabled: boolean;
  onToggle: (permission: Permission) => void;
  onToggleManage: () => void;
}) {
  const hasManage = group.manage !== undefined && selected.has(group.manage.id);
  const granted = hasManage
    ? group.actions.length
    : group.actions.filter((permission) => selected.has(permission.id)).length;

  return (
    <View className="gap-2 rounded-xl border border-selected px-3 py-3 dark:border-selected-dark">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-content dark:text-content-dark">
          {RESOURCE_LABELS[group.resource]}
        </Text>
        <Text className="text-xs text-muted dark:text-muted-dark">
          {granted}/{group.actions.length}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {group.manage ? (
          <Chip
            label={ACTION_LABELS.manage}
            isSelected={hasManage}
            isDisabled={isDisabled}
            onPress={onToggleManage}
          />
        ) : null}
        {group.actions.map((permission) => (
          <Chip
            key={permission.id}
            label={ACTION_LABELS[permission.action]}
            isSelected={hasManage || selected.has(permission.id)}
            isDisabled={isDisabled || hasManage}
            onPress={() => onToggle(permission)}
          />
        ))}
      </View>
    </View>
  );
}

function Chip({
  label,
  isSelected,
  isDisabled = false,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  isDisabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`rounded-full border px-4 py-2 active:opacity-70 ${
        isSelected
          ? "border-brand bg-brand dark:border-brand-dark dark:bg-brand-dark"
          : "border-selected dark:border-selected-dark"
      } ${isDisabled ? "opacity-50" : ""}`}
      disabled={isDisabled}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected, disabled: isDisabled }}
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
