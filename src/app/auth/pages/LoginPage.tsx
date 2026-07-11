import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/http';

import { login } from '../services/authApi';

export default function LoginPage() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const puedeEnviar = email.trim().length > 0 && password.length > 0 && !enviando;

  async function onSubmit() {
    if (!puedeEnviar) return;
    setEnviando(true);
    setError(null);
    try {
      // El rol viene en la respuesta: RootNavigator reacciona solo y monta el
      // navegador del inversionista o el del asesor.
      await signIn(await login({ email: email.trim(), password }));
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'No se pudo iniciar sesión. Intenta de nuevo.',
      );
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="grow justify-center px-6 py-10 gap-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-2">
            <Text className="text-hero font-bold text-text-primary">Robo-Advisor</Text>
            <Text className="text-body text-text-secondary">
              Ingresa para ver tu propuesta de inversión o revisar la cola de
              propuestas si eres asesor.
            </Text>
          </View>

          <View className="gap-4">
            <View className="gap-2">
              <Text className="text-caption font-bold uppercase text-text-secondary">
                Correo
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="tu@correo.ec"
                placeholderTextColor="#A1A1AA"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                className="rounded-2xl border border-surface-border bg-surface-elevated px-4 py-4 text-body-md text-text-primary"
              />
            </View>

            <View className="gap-2">
              <Text className="text-caption font-bold uppercase text-text-secondary">
                Contraseña
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#A1A1AA"
                secureTextEntry
                autoCapitalize="none"
                textContentType="password"
                onSubmitEditing={onSubmit}
                returnKeyType="go"
                className="rounded-2xl border border-surface-border bg-surface-elevated px-4 py-4 text-body-md text-text-primary"
              />
            </View>
          </View>

          {error ? (
            <View className="rounded-2xl bg-stateAlpha-errorSoft px-4 py-3">
              <Text className="text-body text-state-error">{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={onSubmit}
            disabled={!puedeEnviar}
            activeOpacity={0.85}
            className={`items-center justify-center rounded-2xl py-4 ${
              puedeEnviar ? 'bg-brand-primary' : 'bg-surface-secondary'
            }`}
          >
            {enviando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                className={`text-body-md font-bold ${
                  puedeEnviar ? 'text-text-onPrimary' : 'text-text-muted'
                }`}
              >
                Iniciar sesión
              </Text>
            )}
          </TouchableOpacity>

          {/* Cuentas sembradas por seed.sql — atajo para la demo y para los jueces. */}
          <View className="gap-2 rounded-2xl border border-surface-border bg-surface-canvas p-4">
            <Text className="text-caption font-bold uppercase text-text-secondary">
              Cuentas de demo
            </Text>
            {[
              { email: 'inversionista@demo.ec', rol: 'Inversionista (sin perfilar)' },
              { email: 'asesor@demo.ec', rol: 'Asesor' },
            ].map((cuenta) => (
              <TouchableOpacity
                key={cuenta.email}
                onPress={() => {
                  setEmail(cuenta.email);
                  setPassword('demo1234');
                }}
                activeOpacity={0.7}
                className="flex-row items-center justify-between py-1"
              >
                <Text className="text-body text-text-primary">{cuenta.email}</Text>
                <Text className="text-caption text-text-muted">{cuenta.rol}</Text>
              </TouchableOpacity>
            ))}
            <Text className="text-caption text-text-muted">Contraseña: demo1234</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
