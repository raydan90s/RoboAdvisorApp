import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
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

import BotonAtras from '@/components/shared/BotonAtras';
import { Cargando, ErrorEstado } from '@/components/shared/Estados';
import { ApiError } from '@/services/http';
import type { InvestorStackParamList } from '@/types/navigation';
import { montoANumero, montoConSeparadores } from '@/utils/formato';
import { useColores } from '@/context/ThemeContext';

import FormularioPreguntas from '../components/FormularioPreguntas';
import { crearPerfil, getPreguntas } from '../services/investorApi';
import type { Pregunta } from '../types/inversionista';

type Props = NativeStackScreenProps<InvestorStackParamList, 'Cuestionario'>;

/**
 * HU1: el cuestionario de perfilamiento.
 *
 * Las 5 preguntas y sus opciones **las sirve la BD** (`GET /api/investor/questions`).
 * No están hardcodeadas acá: si mañana se agrega una opción o cambia su puntaje, esta
 * pantalla la muestra sola. Y el puntaje tampoco se calcula acá — se mandan los códigos
 * de las respuestas y `scoring_rules` hace el resto.
 */
export default function CuestionarioPage({ navigation }: Props) {
  const colores = useColores();
  const [preguntas, setPreguntas] = useState<Pregunta[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [monto, setMonto] = useState('');
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setErrorCarga(null);
    setPreguntas(null);
    try {
      setPreguntas(await getPreguntas());
    } catch (e) {
      setErrorCarga(
        e instanceof ApiError ? e.message : 'No se pudo cargar el cuestionario.',
      );
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const montoNumero = montoANumero(monto);
  const faltanRespuestas = (preguntas ?? []).filter((p) => !respuestas[p.code]).length;
  const puedeEnviar =
    montoNumero > 0 && preguntas != null && faltanRespuestas === 0 && !enviando;

  async function onSubmit() {
    if (!puedeEnviar) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      // El backend responde con el perfilamiento ya puntuado. Reemplazamos la pantalla
      // (no la apilamos) para que "atrás" desde la propuesta no vuelva al cuestionario
      // que el usuario ya contestó.
      await crearPerfil({ monto: montoNumero, respuestas });
      navigation.replace('Propuesta');
    } catch (e) {
      setErrorEnvio(
        e instanceof ApiError ? e.message : 'No se pudo enviar el cuestionario.',
      );
      setEnviando(false);
    }
  }

  if (errorCarga) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <ErrorEstado mensaje={errorCarga} onReintentar={cargar} />
      </SafeAreaView>
    );
  }

  if (!preguntas) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <Cargando mensaje="Cargando el cuestionario…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-background">

      <View className="flex-row items-center gap-3 border-b border-surface-border px-5 py-4">
        <BotonAtras onPress={navigation.goBack} />
        <Text className="text-heading font-bold text-text-primary">Tu perfil</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1 bg-surface-canvas"
          contentContainerClassName="px-5 py-6 gap-6"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-body text-text-secondary">
            Cinco preguntas y el monto que quieres invertir. Con eso se calcula tu perfil
            de riesgo según reglas publicadas — podrás ver exactamente cómo influyó cada
            respuesta.
          </Text>

          {/* Monto: sin él la propuesta serían porcentajes flotando en el aire. */}
          <View className="gap-2 rounded-2xl border border-surface-border bg-surface-background p-5">
            <Text className="text-caption font-bold uppercase text-text-secondary">
              Monto a invertir (USD)
            </Text>
            <TextInput
              value={monto}
              onChangeText={(texto) => setMonto(montoConSeparadores(texto))}
              placeholder="20.000"
              placeholderTextColor={colores.textoMuted}
              keyboardType="numeric"
              inputMode="decimal"
              className="rounded-2xl border border-surface-border bg-surface-elevated px-4 py-4 text-display font-bold text-text-primary"
            />
            {monto.length > 0 && montoNumero <= 0 ? (
              <Text className="text-caption text-state-error">
                Ingresa un monto mayor que cero.
              </Text>
            ) : null}
          </View>

          <FormularioPreguntas
            preguntas={preguntas}
            respuestas={respuestas}
            onElegir={(preguntaCode, opcionCode) =>
              setRespuestas((prev) => ({ ...prev, [preguntaCode]: opcionCode }))
            }
          />

          {errorEnvio ? (
            <View className="rounded-2xl bg-stateAlpha-errorSoft px-4 py-3">
              <Text className="text-body text-state-error">{errorEnvio}</Text>
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
              <ActivityIndicator color={colores.textoSobrePrimario} />
            ) : (
              <Text
                className={`text-body-md font-bold ${
                  puedeEnviar ? 'text-text-onPrimary' : 'text-text-muted'
                }`}
              >
                {faltanRespuestas > 0
                  ? `Faltan ${faltanRespuestas} respuesta${faltanRespuestas > 1 ? 's' : ''}`
                  : 'Calcular mi perfil'}
              </Text>
            )}
          </TouchableOpacity>

          <Text className="pb-4 text-center text-caption text-text-muted">
            Tu propuesta pasará por la revisión de un asesor humano antes de cualquier
            operación.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
