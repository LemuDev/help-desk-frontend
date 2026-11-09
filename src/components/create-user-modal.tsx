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
} from "react-native";

import { SelectField } from "@/components/select-field";
import { useTheme } from "@/hooks/use-theme";
import { toApiError } from "@/lib/api";
import { can, isCustomer } from "@/lib/permissions";
import type { UserKind } from "@/lib/user-form";
import { fetchBranches, fetchCompanies } from "@/services/companies";
import { fetchRoles } from "@/services/roles";
import { createUser } from "@/services/users";
import { useAuthStore } from "@/store/auth-store";
import type { Branch, Company, Role, User } from "@/types";
import { Action, Resource } from "@/types";

/** El tope de `size` de la API (`PageParams`): con mas, las ultimas no salen. */
const PICKER_SIZE = 50;

type CreateUserModalProps = {
  isVisible: boolean;
  /** Personal (seccion Usuarios) o cliente (seccion Clientes). */
  kind: UserKind;
  onClose: () => void;
  onCreated: (user: User) => void;
};

/**
 * Alta de usuario (`POST /users`), como hoja que sube desde abajo.
 *
 * `kind` fija `is_worker`: personal (`true`) o cliente (`false`), segun la
 * seccion desde la que se crea. `is_superuser` se salta todos los permisos y
 * solo lo ve un superusuario, y solo al crear personal; la API tambien lo
 * rechaza (`UserController._guard_flags`) si no lo pide un superusuario.
 *
 * Empresa (obligatoria) y sucursal son solo de clientes: el personal atiende a
 * todas. Salen, igual que los roles, solo si el usuario puede leerlos.
 */
export function CreateUserModal({
  isVisible,
  kind,
  onClose,
  onCreated,
}: CreateUserModalProps) {
  const theme = useTheme();
  const currentUser = useAuthStore((state) => state.user);

  // Personal = no cliente, la misma regla que `isCustomer()`.
  const isStaff = kind === "staff";
  const canGrantSuperuser = isStaff && Boolean(currentUser?.is_superuser);
  const canPickCompany = can(currentUser, Resource.company, Action.read);
  const canPickBranch = can(currentUser, Resource.branch, Action.read);
  const canPickRoles = can(currentUser, Resource.role, Action.read);
  // El admin de una empresa (un cliente) crea siempre en la suya: la API la
  // fuerza, y fijarla aqui deja elegir sucursal sin `company:read`.
  const ownCompanyId = isCustomer(currentUser) ? (currentUser?.company_id ?? null) : null;

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [companyId, setCompanyId] = useState<number | null>(ownCompanyId);
  const [branchId, setBranchId] = useState<number | null>(null);
  // Uno solo por ahora, aunque `role_ids` admite varios: se envia como lista de uno.
  const [roleId, setRoleId] = useState<number | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisible || !canPickCompany) return;
    let isCurrent = true;
    fetchCompanies({ size: PICKER_SIZE })
      .then((page) => isCurrent && setCompanies(page.items))
      .catch((cause) => isCurrent && setError(toApiError(cause).message));
    return () => {
      isCurrent = false;
    };
  }, [isVisible, canPickCompany]);

  // Todos de una vez y se filtran por empresa aqui: asi cambiar de empresa no
  // vuelve a pedirlos.
  useEffect(() => {
    if (!isVisible || !canPickRoles) return;
    let isCurrent = true;
    fetchRoles({ size: PICKER_SIZE })
      .then((page) => isCurrent && setRoles(page.items))
      .catch((cause) => isCurrent && setError(toApiError(cause).message));
    return () => {
      isCurrent = false;
    };
  }, [isVisible, canPickRoles]);

  // `UserController._resolve_roles` no comprueba la empresa del rol: se ofrecen
  // solo los globales y los de la empresa elegida, para no darle a alguien un
  // rol de otra empresa.
  const availableRoles = roles.filter(
    (role) => role.company_id === null || role.company_id === companyId,
  );

  // Cambiar de empresa invalida la sucursal: la API rechaza una de otra empresa.
  useEffect(() => {
    if (companyId === null || !canPickBranch) return;
    let isCurrent = true;
    fetchBranches(companyId, { size: PICKER_SIZE })
      .then((page) => isCurrent && setBranches(page.items))
      .catch((cause) => isCurrent && setError(toApiError(cause).message));
    return () => {
      isCurrent = false;
    };
  }, [companyId, canPickBranch]);

  function selectCompany(next: number | null) {
    setCompanyId(next);
    setBranchId(null);
    setBranches([]);
    // Un rol de la empresa anterior ya no vale; uno global se queda.
    setRoleId((current) =>
      roles.some(
        (role) =>
          role.id === current &&
          (role.company_id === null || role.company_id === next),
      )
        ? current
        : null,
    );
  }

  function reset() {
    setFullName("");
    setUsername("");
    setPassword("");
    setIsSuperuser(false);
    setIsActive(true);
    setCompanyId(ownCompanyId);
    setBranchId(null);
    setBranches([]);
    setRoleId(null);
    setError(null);
  }

  function close() {
    if (isSubmitting) return;
    reset();
    onClose();
  }

  // Los mismos minimos que `UserCreate`: asi el 422 casi nunca llega. Un
  // cliente siempre es de una empresa; sin `company:read` no hay selector, asi
  // que no se le puede exigir.
  const canSubmit =
    username.trim().length >= 3 &&
    fullName.trim().length > 0 &&
    password.length >= 8 &&
    (isStaff || !canPickCompany || companyId !== null) &&
    !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const user = await createUser({
        username: username.trim(),
        full_name: fullName.trim(),
        password,
        is_active: isActive,
        is_worker: isStaff,
        is_superuser: isSuperuser,
        company_id: companyId,
        branch_id: branchId,
        role_ids: roleId === null ? [] : [roleId],
      });
      reset();
      onCreated(user);
    } catch (cause) {
      setError(toApiError(cause).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "rounded-xl border border-selected bg-element px-4 py-3 text-base text-content " +
    "dark:border-selected-dark dark:bg-surface-dark dark:text-content-dark";

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
                {isStaff ? "Nuevo usuario" : "Nuevo cliente"}
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

              <Field label="Nombre completo">
                <TextInput
                  className={inputClass}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholderTextColor={theme.textSecondary}
                  editable={!isSubmitting}
                />
              </Field>

              <Field label="Usuario" hint="Minimo 3 caracteres">
                <TextInput
                  className={inputClass}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              </Field>

              <Field label="Contrasena" hint="Minimo 8 caracteres">
                <TextInput
                  className={inputClass}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  editable={!isSubmitting}
                />
              </Field>

              {canGrantSuperuser ? (
                <SwitchRow
                  label="Superusuario"
                  hint="Se salta todos los permisos."
                  value={isSuperuser}
                  onChange={setIsSuperuser}
                  isDisabled={isSubmitting}
                />
              ) : null}

              {canPickCompany && !isStaff ? (
                <Field label="Empresa" hint="Obligatoria.">
                  <SelectField
                    title="Empresa"
                    placeholder="Elegir empresa"
                    emptyLabel="No hay empresas."
                    options={companies.map(({ id, name }) => ({
                      value: id,
                      label: name,
                    }))}
                    value={companyId}
                    onChange={selectCompany}
                    isDisabled={isSubmitting}
                  />
                </Field>
              ) : null}

              {canPickBranch && !isStaff && companyId !== null ? (
                <Field label="Sucursal" hint="Opcional.">
                  <SelectField
                    title="Sucursal"
                    placeholder="Sin sucursal"
                    emptyLabel="Esta empresa no tiene sucursales."
                    options={branches.map(({ id, name }) => ({
                      value: id,
                      label: name,
                    }))}
                    value={branchId}
                    onChange={setBranchId}
                    clearable
                    isDisabled={isSubmitting}
                  />
                </Field>
              ) : null}

              {canPickRoles ? (
                <Field
                  label="Rol"
                  hint={
                    isStaff
                      ? "Opcional. Solo globales: el personal no es de ninguna empresa."
                      : companyId === null
                      ? "Opcional. Elige una empresa para ver tambien sus roles."
                      : "Opcional. Globales y de la empresa elegida."
                  }
                >
                  <SelectField
                    title="Rol"
                    placeholder="Sin rol"
                    emptyLabel="No hay roles."
                    options={availableRoles.map(({ id, name }) => ({
                      value: id,
                      label: name,
                    }))}
                    value={roleId}
                    onChange={setRoleId}
                    clearable
                    isDisabled={isSubmitting}
                  />
                </Field>
              ) : null}

              <SwitchRow
                label="Cuenta activa"
                value={isActive}
                onChange={setIsActive}
                isDisabled={isSubmitting}
              />

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
                    ? "Creando..."
                    : isStaff
                      ? "Crear usuario"
                      : "Crear cliente"}
                </Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
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

function SwitchRow({
  label,
  hint,
  value,
  onChange,
  isDisabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  isDisabled: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <View className="flex-1 gap-1">
        <Text className="text-sm font-medium text-muted dark:text-muted-dark">
          {label}
        </Text>
        {hint ? (
          <Text className="text-xs text-muted dark:text-muted-dark">{hint}</Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onChange} disabled={isDisabled} />
    </View>
  );
}
