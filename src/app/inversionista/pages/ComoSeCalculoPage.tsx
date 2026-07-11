import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cargando, ErrorEstado } from '@/components/shared/Estados';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/http';
import type { InvestorStackParamList } from '@/types/navigation';
import { usd } from '@/utils/formato';

import { getBreakdown } from '../services/investorApi';
import type { ProfilingBreakdown } from '../types/inversionista';

type Props = NativeStackScreenProps<InvestorStackParamList, 'ComoSeCalculo'>;

/**
 * HU1, criterio 3: **el usuario entiende cómo influyó cada respuesta en su perfil.**
 *
 * Todo lo de esta pantalla sale de `v_profiling_breakdown`: los puntos de cada opción,
 * el umbral que decidió el perfil, la versión de reglas y la regla de elegibilidad por
 * calificación. El front no reproduce ni una sola de esas reglas — si mañana cambian los
 * puntajes en `scoring_rules`, esta pantalla cambia sola. Esa es justamente la prueba de
 * que las reglas son la fuente de verdad y no un número escrito a mano.
 */
export default function ComoSeCalculoPage({ navigation, route }: Props) {
  const { user } = useAuth();
  const sessionId = route.params?.sessionId;

  const [datos, setDatos] = useState<ProfilingBreakdown | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!user) return;
    setError(null);
    setDatos(null);
    try {
      setDatos(await getBreakdown(user.id, sessionId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el desglose.');
    }
  }, [user, sessionId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <ErrorEstado mensaje={error} onReintentar={cargar} />
      </SafeAreaView>
    );
  }

  if (!datos) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <Cargando mensaje="Cargando el desglose…" />
      </SafeAreaView>
    );
  }

  const total = datos.respuestas.reduce((suma, r) => suma + r.puntos, 0);

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <StatusBar style="dark" />

      <View className="flex-row items-center gap-3 border-b border-surface-border px-5 py-4">
        <TouchableOpacity onPress={navigation.goBack} activeOpacity={0.7}>
          <Text className="text-body font-bold text-brand-primary">Atrás</Text>
        </TouchableOpacity>
        <Text className="text-heading font-bold text-text-primary">Cómo se calculó</Text>
      </View>

      <ScrollView
        className="flex-1 bg-surface-canvas"
        contentContainerClassName="px-5 py-6 gap-4"
      >
        {/* La versión de reglas, visible. Sin esto, "las reglas" son una promesa. */}
        <View className="flex-row items-center justify-between rounded-2xl border border-surface-border bg-surface-background px-5 py-4">
          <View className="gap-1">
            <Text className="text-caption uppercase text-text-secondary">
              Tu puntaje
            </Text>
            <Text className="text-hero font-bold text-text-primary">
              {datos.puntaje}
              <Text className="text-body-md font-bold text-text-muted"> / 15</Text>
            </Text>
          </View>
          <View className="items-end gap-1">
            <View className="rounded-full bg-brandAlpha-primarySoft px-3 py-1">
              <Text className="text-caption font-bold text-brand-primary">
                reglas {datos.rules_version}
              </Text>
            </View>
            {datos.monto != null ? (
              <Text className="text-caption text-text-muted">{usd(datos.monto)}</Text>
            ) : null}
          </View>
        </View>

        {/* Tabla respuesta → puntos. */}
        <View className="overflow-hidden rounded-2xl border border-surface-border bg-surface-background">
          <View className="flex-row justify-between bg-surface-secondary px-5 py-3">
            <Text className="text-caption font-bold uppercase text-text-secondary">
              Tu respuesta
            </Text>
            <Text className="text-caption font-bold uppercase text-text-secondary">
              Puntos
            </Text>
          </View>

          {datos.respuestas.map((fila) => (
            <View
              key={fila.question_code}
              className="flex-row items-center justify-between gap-4 border-t border-surface-border px-5 py-4"
            >
              <View className="flex-1 gap-1">
                <Text className="text-caption text-text-muted">{fila.question_text}</Text>
                <Text className="text-body font-bold text-text-primary">
                  {fila.option_label}
                </Text>
              </View>
              <View className="h-8 w-8 items-center justify-center rounded-full bg-brandAlpha-accentSoft">
                <Text className="text-body font-bold text-text-primary">
                  +{fila.puntos}
                </Text>
              </View>
            </View>
          ))}

          <View className="flex-row items-center justify-between border-t-2 border-surface-divider px-5 py-4">
            <Text className="text-body-md font-bold text-text-primary">Total</Text>
            <Text className="text-body-md font-bold text-text-primary">{total}</Text>
          </View>
        </View>

        {/* El umbral que convirtió el puntaje en perfil. */}
        <View className="gap-2 rounded-2xl bg-brandAlpha-primarySoft p-5">
          <Text className="text-caption font-bold uppercase text-brand-primary">
            El umbral
          </Text>
          <Text className="text-body leading-5 text-text-primary">
            Un puntaje entre{' '}
            <Text className="font-bold">
              {datos.umbral_min} y {datos.umbral_max}
            </Text>{' '}
            corresponde al perfil{' '}
            <Text className="font-bold">{datos.perfil_nombre ?? datos.perfil_code}</Text>.
            Tu puntaje de <Text className="font-bold">{datos.puntaje}</Text> cae en ese
            rango.
          </Text>
        </View>

        {/* La regla de elegibilidad: por qué tu perfil no puede tocar ciertos productos. */}
        {datos.regla_institucion ? (
          <View className="gap-2 rounded-2xl border border-surface-border bg-surface-background p-5">
            <View className="flex-row items-center gap-2">
              <Ionicons name="shield-checkmark-outline" size={16} color="#1E3A8A" />
              <Text className="text-caption font-bold uppercase text-text-secondary">
                Solidez del emisor
              </Text>
            </View>
            <Text className="text-body leading-5 text-text-primary">
              {datos.regla_institucion}
            </Text>
            <Text className="text-caption text-text-muted">
              Por eso tu propuesta solo incluye productos de instituciones que cumplen esa
              calificación mínima. Las calificaciones son referenciales y se muestran
              siempre con su calificadora y su fecha.
            </Text>
          </View>
        ) : null}

        <Text className="pb-4 text-center text-caption text-text-muted">
          Estas reglas están publicadas y versionadas ({datos.rules_version}). Ninguna
          cifra de esta pantalla la escribió un modelo de lenguaje.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
