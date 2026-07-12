import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/http';
import type { AuthStackParamList } from '@/types/navigation';

import Aviso from '../components/Aviso';
import CampoCodigo, { LARGO_CODIGO } from '../components/CampoCodigo';
import CampoTexto from '../components/CampoTexto';
import PantallaAuth from '../components/PantallaAuth';
import { useReenvio } from '../hooks/useReenvio';
import { olvideContrasena, restablecerContrasena } from '../services/authApi';

type Props = NativeStackScreenProps<AuthStackParamList, 'RestablecerContrasena'>;

const MIN_PASSWORD = 8;

/**
 * Paso 2 de la recuperación: el código del correo + la contraseña nueva.
 *
 * No se pide la contraseña anterior: quien la olvidó no la tiene. Lo que autoriza el
 * cambio es haber leído el buzón — el mismo hecho con el que nació la cuenta.
 *
 * El backend devuelve el token: cambiar la contraseña deja al usuario adentro, y
 * RootNavigator remonta el árbol al haber sesión. Por eso esta pantalla no navega.
 */
export default function RestablecerContrasenaPage({ route }: Props) {
  const { email } = route.params;
  const { signIn } = useAuth();

  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Se llega acá con un código recién enviado, así que el cooldown arranca corriendo:
  // reenviar de inmediato invalidaría el que va en camino (cada envío mata al anterior).
  const envio = useReenvio(() => olvideContrasena(email));
  const iniciarEspera = envio.iniciarEspera;
  useEffect(() => {
    iniciarEspera();
  }, [iniciarEspera]);

  const puedeEnviar =
    codigo.length === LARGO_CODIGO &&
    password.length >= MIN_PASSWORD &&
    password === confirmacion &&
    !enviando;

  function validar(): string | null {
    if (codigo.length !== LARGO_CODIGO) return 'Escribe el código de 6 dígitos.';
    if (password.length < MIN_PASSWORD)
      return `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`;
    if (password !== confirmacion) return 'Las dos contraseñas no coinciden.';
    return null;
  }

  async function onSubmit() {
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }

    setEnviando(true);
    setError(null);
    envio.limpiarAviso();
    try {
      await signIn(await restablecerContrasena({ email, codigo, password }));
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'No se pudo cambiar la contraseña. Intenta de nuevo.',
      );
      setEnviando(false);
    }
  }

  return (
    <PantallaAuth
      atras
      titulo="Elige una contraseña nueva"
      bajada={`Escribe el código que enviamos a ${email} y tu contraseña nueva.`}
    >
      <View className="gap-4">
        <CampoCodigo
          valor={codigo}
          onCambiar={(v) => {
            setCodigo(v);
            if (error) setError(null);
          }}
          conError={!!error}
          editable={!enviando}
        />

        <CampoTexto
          etiqueta="Contraseña nueva"
          icono="lock-closed-outline"
          esPassword
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (error) setError(null);
          }}
          placeholder="••••••••"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          editable={!enviando}
          conError={!!error}
          ayuda={`Mínimo ${MIN_PASSWORD} caracteres.`}
        />

        <CampoTexto
          etiqueta="Repite la contraseña"
          icono="lock-closed-outline"
          esPassword
          value={confirmacion}
          onChangeText={(v) => {
            setConfirmacion(v);
            if (error) setError(null);
          }}
          placeholder="••••••••"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          onSubmitEditing={onSubmit}
          returnKeyType="go"
          editable={!enviando}
          conError={!!error}
        />
      </View>

      {error ? <Aviso texto={error} /> : null}
      {envio.error ? <Aviso texto={envio.error} /> : null}
      {envio.aviso && !error ? <Aviso texto={envio.aviso} tipo="info" /> : null}

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
              Cambiar contraseña y entrar
            </Text>
            <Ionicons
              name="checkmark"
              size={18}
              color={puedeEnviar ? '#FFFFFF' : '#A1A1AA'}
            />
          </>
        )}
      </TouchableOpacity>

      <View className="items-center gap-1">
        <Text className="text-body text-text-secondary">¿No te llegó? Revisa el spam.</Text>
        <TouchableOpacity
          onPress={envio.reenviar}
          disabled={envio.restante > 0 || envio.enviando || enviando}
          accessibilityRole="button"
        >
          <Text
            className={`text-body font-bold ${
              envio.restante > 0 ? 'text-text-muted' : 'text-brand-mid'
            }`}
          >
            {envio.enviando
              ? 'Enviando…'
              : envio.restante > 0
                ? `Reenviar código en ${envio.restante}s`
                : 'Reenviar código'}
          </Text>
        </TouchableOpacity>
      </View>
    </PantallaAuth>
  );
}
