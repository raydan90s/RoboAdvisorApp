import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import type { AuthStackParamList } from '@/types/navigation';

import { login } from '../services/authApi';

type Campo = 'email' | 'password';
type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginPage({ navigation }: Props) {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [enfocado, setEnfocado] = useState<Campo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const puedeEnviar = email.trim().length > 0 && password.length > 0 && !enviando;

  async function onSubmit() {
    if (!puedeEnviar) return;
    const correo = email.trim().toLowerCase();

    setEnviando(true);
    setError(null);
    try {
      // El rol viene en la respuesta: RootNavigator reacciona solo y monta el
      // navegador del inversionista o el del asesor.
      await signIn(await login({ email: correo, password }));
    } catch (e) {
      // 403 = la cuenta existe y la contraseña es correcta, pero el correo nunca se
      // verificó. El backend ya reenvió el código antes de rebotar, así que no se muestra
      // un error muerto: se lleva al usuario a escribirlo. Distinguirlo del 403 de "cuenta
      // desactivada" por el status a secas sería ambiguo, de ahí el chequeo del mensaje —
      // que es contrato con `CORREO_SIN_VERIFICAR` del auth_controller.
      if (e instanceof ApiError && e.statusCode === 403 && /verificad/i.test(e.message)) {
        setEnviando(false);
        navigation.navigate('VerificarCorreo', { email: correo });
        return;
      }

      setError(
        e instanceof ApiError ? e.message : 'No se pudo iniciar sesión. Intenta de nuevo.',
      );
      setEnviando(false);
    }
  }

  // El borde del campo enfocado se tiñe de marca; si hubo error, los dos campos
  // quedan en rojo porque el backend no dice cuál de los dos falló.
  function claseCampo(campo: Campo) {
    const borde = error
      ? 'border-state-error'
      : enfocado === campo
        ? 'border-brand-primary bg-surface-background'
        : 'border-surface-border bg-surface-elevated';
    return `flex-row items-center gap-3 rounded-2xl border px-4 ${borde}`;
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="grow justify-center px-6 py-8 gap-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center">
            <Image
              source={require('../../../../assets/images/logoSinFondo.png')}
              resizeMode="contain"
              className="h-56 w-56"
              accessibilityLabel="Brokeate"
            />
          </View>

          <View className="gap-5">
            <View className="gap-1">
              <Text className="text-display font-bold text-text-primary">
                Inicia sesión
              </Text>
              <Text className="text-body text-text-secondary">
                Entra para ver tu propuesta de inversión, o para revisar la cola de
                propuestas si eres asesor.
              </Text>
            </View>

            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-caption font-bold uppercase text-text-secondary">
                  Correo
                </Text>
                <View className={claseCampo('email')}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={enfocado === 'email' ? '#1E3A8A' : '#A1A1AA'}
                  />
                  <TextInput
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      if (error) setError(null);
                    }}
                    onFocus={() => setEnfocado('email')}
                    onBlur={() => setEnfocado(null)}
                    placeholder="tu@correo.ec"
                    placeholderTextColor="#A1A1AA"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    editable={!enviando}
                    className="flex-1 py-4 text-body-md text-text-primary"
                  />
                </View>
              </View>

              <View className="gap-2">
                <Text className="text-caption font-bold uppercase text-text-secondary">
                  Contraseña
                </Text>
                <View className={claseCampo('password')}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={enfocado === 'password' ? '#1E3A8A' : '#A1A1AA'}
                  />
                  <TextInput
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      if (error) setError(null);
                    }}
                    onFocus={() => setEnfocado('password')}
                    onBlur={() => setEnfocado(null)}
                    placeholder="••••••••"
                    placeholderTextColor="#A1A1AA"
                    secureTextEntry={!verPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    onSubmitEditing={onSubmit}
                    returnKeyType="go"
                    editable={!enviando}
                    className="flex-1 py-4 text-body-md text-text-primary"
                  />
                  <TouchableOpacity
                    onPress={() => setVerPassword((v) => !v)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={
                      verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                  >
                    <Ionicons
                      name={verPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#71717A"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('OlvideContrasena')}
                disabled={enviando}
                accessibilityRole="button"
                className="self-end"
              >
                <Text className="text-body font-bold text-brand-mid">
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <View className="flex-row items-center gap-2 rounded-2xl bg-stateAlpha-errorSoft px-4 py-3">
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text className="flex-1 text-body text-state-error">{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={onSubmit}
              disabled={!puedeEnviar}
              activeOpacity={0.85}
              accessibilityRole="button"
              className={`h-14 flex-row items-center justify-center gap-2 rounded-2xl ${
                puedeEnviar ? 'bg-brand-primary' : 'bg-surface-secondary'
              }`}
            >
              {enviando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text
                    className={`text-body-md font-bold ${
                      puedeEnviar ? 'text-text-onPrimary' : 'text-text-muted'
                    }`}
                  >
                    Iniciar sesión
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={puedeEnviar ? '#FFFFFF' : '#A1A1AA'}
                  />
                </>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center gap-1">
              <Text className="text-body text-text-secondary">¿No tienes cuenta?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Registro')}
                disabled={enviando}
                accessibilityRole="button"
              >
                <Text className="text-body font-bold text-brand-mid">Crea una</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text className="text-center text-caption text-text-muted">
            Brokeate no ejecuta órdenes ni maneja tu dinero. Las propuestas son
            referenciales y las revisa un asesor.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
