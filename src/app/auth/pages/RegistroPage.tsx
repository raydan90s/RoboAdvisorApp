import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { COLORES } from '@/constants/colores';
import { ApiError } from '@/services/http';
import type { AuthStackParamList } from '@/types/navigation';

import Aviso from '../components/Aviso';
import CampoTexto from '../components/CampoTexto';
import PantallaAuth from '../components/PantallaAuth';
import { register } from '../services/authApi';
import { esCorreoValido } from '../utils/correo';

type Props = NativeStackScreenProps<AuthStackParamList, 'Registro'>;

const MIN_PASSWORD = 8;

export default function RegistroPage({ navigation }: Props) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const correo = email.trim().toLowerCase();

  // El correo se valida ACÁ además de en el backend, y no por desconfianza del backend:
  // es para no gastar un viaje de red (y un correo real) en un "juan@" que nunca iba a
  // llegar a ningún buzón. El 422 de Pydantic es la red de seguridad, no la primera línea.
  const puedeEnviar =
    nombre.trim().length >= 2 &&
    esCorreoValido(correo) &&
    password.length >= MIN_PASSWORD &&
    password === confirmacion &&
    !enviando;

  function validar(): string | null {
    if (nombre.trim().length < 2) return 'Escribe tu nombre completo.';
    if (!esCorreoValido(correo)) return 'Ese correo no parece válido. Revísalo.';
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
    try {
      await register({
        nombre: nombre.trim(),
        email: correo,
        password,
        cedula_ruc: cedula.trim() || undefined,
      });

      // El registro NO deja logueado: la cuenta existe pero está bloqueada hasta que el
      // usuario devuelva el código que acaba de recibir. `replace` y no `navigate` para
      // que "atrás" no vuelva a un formulario ya enviado.
      navigation.replace('VerificarCorreo', { email: correo });
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'No se pudo crear la cuenta. Intenta de nuevo.',
      );
      setEnviando(false);
    }
  }

  return (
    <PantallaAuth
      atras
      titulo="Crea tu cuenta"
      bajada="Te enviaremos un código de 6 dígitos para confirmar que el correo es tuyo."
    >
      <View className="gap-4">
        <CampoTexto
          etiqueta="Nombre completo"
          icono="person-outline"
          value={nombre}
          onChangeText={(v) => {
            setNombre(v);
            if (error) setError(null);
          }}
          placeholder="Juan Pérez"
          autoCapitalize="words"
          textContentType="name"
          editable={!enviando}
          conError={!!error}
        />

        <CampoTexto
          etiqueta="Correo"
          icono="mail-outline"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (error) setError(null);
          }}
          placeholder="tu@correo.ec"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!enviando}
          conError={!!error}
          ayuda="Ahí llega tu código. Tiene que ser un correo al que entres."
        />

        <CampoTexto
          etiqueta="Cédula o RUC (opcional)"
          icono="card-outline"
          value={cedula}
          onChangeText={setCedula}
          placeholder="0912345678"
          keyboardType="number-pad"
          editable={!enviando}
        />

        <CampoTexto
          etiqueta="Contraseña"
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
              Crear cuenta
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={puedeEnviar ? '#FFFFFF' : COLORES.textoMuted}
            />
          </>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-center gap-1">
        <Text className="text-body text-text-secondary">¿Ya tienes cuenta?</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          disabled={enviando}
        >
          <Text className="text-body font-bold text-brand-mid">Inicia sesión</Text>
        </TouchableOpacity>
      </View>
    </PantallaAuth>
  );
}
