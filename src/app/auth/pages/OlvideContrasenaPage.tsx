import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';

import { COLORES } from '@/constants/colores';
import { ApiError } from '@/services/http';
import type { AuthStackParamList } from '@/types/navigation';

import Aviso from '../components/Aviso';
import CampoTexto from '../components/CampoTexto';
import PantallaAuth from '../components/PantallaAuth';
import { olvideContrasena } from '../services/authApi';
import { esCorreoValido } from '../utils/correo';

type Props = NativeStackScreenProps<AuthStackParamList, 'OlvideContrasena'>;

/**
 * Paso 1 de la recuperación: pedir el código.
 *
 * Ojo con la UX: el backend responde lo MISMO exista o no la cuenta (para no revelar
 * quién está registrado), así que esta pantalla siempre avanza a `RestablecerContrasena`.
 * Que el correo no exista se descubre después, cuando el código nunca llega — que es
 * exactamente el comportamiento correcto, aunque parezca menos "servicial".
 */
export default function OlvideContrasenaPage({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const correo = email.trim().toLowerCase();
  const puedeEnviar = esCorreoValido(correo) && !enviando;

  async function onSubmit() {
    if (!esCorreoValido(correo)) {
      setError('Ese correo no parece válido. Revísalo.');
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      await olvideContrasena(correo);
      navigation.navigate('RestablecerContrasena', { email: correo });
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'No se pudo enviar el código. Intenta de nuevo.',
      );
      setEnviando(false);
    }
  }

  return (
    <PantallaAuth
      atras
      titulo="¿Olvidaste tu contraseña?"
      bajada="Escribe tu correo y te enviamos un código de 6 dígitos para elegir una nueva."
    >
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
        onSubmitEditing={onSubmit}
        returnKeyType="go"
        editable={!enviando}
        conError={!!error}
        ayuda="El correo con el que te registraste."
      />

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
              Enviarme el código
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={puedeEnviar ? '#FFFFFF' : COLORES.textoMuted}
            />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        disabled={enviando}
      >
        <Text className="text-center text-body font-bold text-brand-mid">
          Volver a iniciar sesión
        </Text>
      </TouchableOpacity>
    </PantallaAuth>
  );
}
