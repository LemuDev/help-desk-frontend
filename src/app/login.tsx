import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/use-theme";
import { API_URL } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

export default function LoginScreen() {
  const theme = useTheme();
  const passwordRef = useRef<TextInput>(null);

  const login = useAuthStore((state) => state.login);
  const clearError = useAuthStore((state) => state.clearError);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const error = useAuthStore((state) => state.error);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    // Si entra, el guard de `_layout` cambia y el router lleva a `index` solo.
    await login({ username: username.trim(), password });
  }

  /** Escribir borra el error anterior: deja de referirse a lo que hay en pantalla. */
  function handleChange(setter: (value: string) => void) {
    return (value: string) => {
      if (error) clearError();
      setter(value);
    };
  }

  const inputClass =
    "rounded-xl border border-selected bg-element px-4 py-3.5 text-base text-content " +
    "dark:border-selected-dark dark:bg-element-dark dark:text-content-dark";

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full max-w-[420px] self-center">
            <Text className="text-3xl font-bold text-content dark:text-content-dark">
              Helpdesk
            </Text>
            <Text className="mt-2 text-base text-muted dark:text-muted-dark">
              Entra con tu usuario para gestionar los tickets.
            </Text>

            {error ? (
              <View className="mt-6 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
                <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text>
              </View>
            ) : null}

            <View className="mt-6 gap-4">
              <View className="gap-2">
                <Text className="text-sm font-medium text-muted dark:text-muted-dark">
                  Usuario
                </Text>
                <TextInput
                  className={inputClass}
                  value={username}
                  onChangeText={handleChange(setUsername)}
                  placeholder="admin"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  returnKeyType="next"
                  editable={!isSubmitting}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>

              <View className="gap-2">
                <Text className="text-sm font-medium text-muted dark:text-muted-dark">
                  Contrasena
                </Text>
                <View className="relative justify-center">
                  <TextInput
                    ref={passwordRef}
                    className={`${inputClass} pr-14`}
                    value={password}
                    onChangeText={handleChange(setPassword)}
                    placeholder="••••••••"
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="go"
                    editable={!isSubmitting}
                    onSubmitEditing={handleSubmit}
                  />
                  <Pressable
                    className="absolute right-3 px-2 py-1"
                    hitSlop={8}
                    onPress={() => setShowPassword((value) => !value)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? "Ocultar contrasena" : "Mostrar contrasena"
                    }
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={22}
                      color={theme.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            <Pressable
              className={`mt-7 flex-row items-center justify-center gap-2 rounded-xl bg-brand py-4 active:opacity-80 dark:bg-brand-dark ${
                canSubmit ? "" : "opacity-50"
              }`}
              disabled={!canSubmit}
              onPress={handleSubmit}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
            >
              {isSubmitting ? <ActivityIndicator color="#ffffff" /> : null}
              <Text className="text-base font-semibold text-white">
                {isSubmitting ? "Entrando..." : "Entrar"}
              </Text>
            </Pressable>

            <Text className="mt-6 text-center text-xs text-muted dark:text-muted-dark">
              API: {API_URL}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
