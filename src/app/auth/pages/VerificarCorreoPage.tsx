import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/http';
import type { AuthStackParamList } from '@/types/navigation';

import Aviso from '../components/Aviso';
import CampoCodigo, { LARGO_CODIGO } from '../components/CampoCodigo';
import PantallaAuth from '../components/PantallaAuth';
import { useReenvio } from '../hooks/useReenvio';
import { reenviarCodigo, verificarCorreo } from '../services/authApi';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerificarCorreo'>;

/**
 * El canje: 6 dígitos por una sesión.
 *
 * Se llega acá desde el registro, o desde un login con 403 (la cuenta existe pero su
 * correo nunca se probó — en ese caso el backend ya reenvió el código antes de rebotar).
 *
 * Al verificar, `signIn` guarda el token y RootNavigator remonta el árbol solo: esta
 * pantalla no navega a ningún lado.
 */
export default function VerificarCorreoPage({ route }: Props) {
  const { email } = route.params;
  const { signIn } = useAuth();

  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);

  // Se llega acá con un código recién enviado (por el registro o por el login que rebotó),
  // así que el cooldown arranca corriendo: reenviar de inmediato mataría el que va en camino.
  const envio = useReenvio(() => reenviarCodigo(email));
  const iniciarEspera = envio.iniciarEspera;
  useEffect(() => {
    iniciarEspera();
  }, [iniciarEspera]);

  const completo = codigo.length === LARGO_CODIGO;

  async function onVerificar(valor: string = codigo) {
    if (valor.length !== LARGO_CODIGO || verificando) return;
    setVerificando(true);
    setError(null);
    envio.limpiarAviso();
    try {
      await signIn(await verificarCorreo({ email, codigo: valor }));
      // No hay navegación: al haber token, RootNavigator monta el stack del inversionista.
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'No se pudo verificar el código. Intenta de nuevo.',
      );
      // El código quemado ya no sirve: se limpia para que el usuario no reintente el mismo.
      setCodigo('');
      setVerificando(false);
    }
  }

  return (
    <PantallaAuth
      atras
      titulo="Verifica tu correo"
      bajada={`Escribe el código de 6 dígitos que enviamos a ${email}. Vence en 15 minutos.`}
    >
      <CampoCodigo
        valor={codigo}
        onCambiar={(v) => {
          setCodigo(v);
          if (error) setError(null);
        }}
        // Al sexto dígito verifica solo: buscar el botón después de tipear el código es
        // un paso que nadie quiere dar.
        onCompleto={onVerificar}
        conError={!!error}
        editable={!verificando}
      />

      {error ? <Aviso texto={error} /> : null}
      {envio.error ? <Aviso texto={envio.error} /> : null}
      {envio.aviso && !error ? <Aviso texto={envio.aviso} tipo="info" /> : null}

      <TouchableOpacity
        onPress={() => onVerificar()}
        disabled={!completo || verificando}
        activeOpacity={0.85}
        accessibilityRole="button"
        className={`h-14 flex-row items-center justify-center gap-2 rounded-2xl ${
          completo && !verificando ? 'bg-brand-primary' : 'bg-surface-secondary'
        }`}
      >
        {verificando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text
              className={`text-body-md font-bold ${
                completo ? 'text-text-onPrimary' : 'text-text-muted'
              }`}
            >
              Verificar y entrar
            </Text>
            <Ionicons
              name="checkmark"
              size={18}
              color={completo ? '#FFFFFF' : '#A1A1AA'}
            />
          </>
        )}
      </TouchableOpacity>

      <View className="items-center gap-1">
        <Text className="text-body text-text-secondary">¿No te llegó? Revisa el spam.</Text>
        <TouchableOpacity
          onPress={envio.reenviar}
          disabled={envio.restante > 0 || envio.enviando || verificando}
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
