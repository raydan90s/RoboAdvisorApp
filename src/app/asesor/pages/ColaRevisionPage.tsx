import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cargando, ErrorEstado, Vacio } from '@/components/shared/Estados';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/http';
import type { AdvisorStackParamList } from '@/types/navigation';
import { fechaHora, usd } from '@/utils/formato';

import { getCola } from '../services/advisorApi';
import type { ColaItem } from '../types/asesor';

/**
 * HU3: la cola de propuestas que esperan decisión.
 *
 * La vista `v_advisor_review_queue` solo lista `pending_review`, así que decidir una
 * propuesta la saca de acá sola. Por eso se relee al volver a la pantalla: si no, el
 * asesor seguiría viendo la tarjeta que acaba de aprobar.
 */
export default function ColaRevisionPage() {
  const navigation = useNavigation<NativeStackNavigationProp<AdvisorStackParamList>>();
  const { user, logout } = useAuth();

  const [cola, setCola] = useState<ColaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setCola(await getCola());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la cola.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-background" edges={['top']}>
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between border-b border-surface-border px-5 py-4">
        <View className="flex-1 pr-3">
          <Text className="text-heading font-bold text-text-primary">
            Cola de revisión
          </Text>
          <Text className="text-caption text-text-secondary">{user?.name} · Asesor</Text>
        </View>
        <TouchableOpacity onPress={logout} activeOpacity={0.85}>
          <Text className="text-body font-bold text-brand-primary">Salir</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <ErrorEstado mensaje={error} onReintentar={cargar} />
      ) : !cola ? (
        <Cargando mensaje="Cargando la cola…" />
      ) : cola.length === 0 ? (
        <Vacio
          titulo="No hay propuestas pendientes"
          detalle="Cuando un cliente se perfile, su propuesta aparecerá acá para tu revisión."
        />
      ) : (
        <ScrollView
          className="flex-1 bg-surface-canvas"
          contentContainerClassName="px-5 py-6 gap-4"
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={refrescar} />
          }
        >
          <Text className="text-body text-text-secondary">
            {cola.length} propuesta{cola.length > 1 ? 's' : ''} esperando tu decisión.
            Ninguna se ejecuta hasta que la apruebes.
          </Text>

          {cola.map((item) => (
            <TouchableOpacity
              key={item.proposal_id}
              onPress={() =>
                navigation.navigate('DetallePropuesta', {
                  proposalId: item.proposal_id,
                })
              }
              activeOpacity={0.85}
              className="gap-3 rounded-2xl border border-surface-border bg-surface-background p-5"
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-1">
                  <Text className="text-body-md font-bold text-text-primary">
                    {item.investor_nombre}
                  </Text>
                  <Text className="text-caption text-text-muted">
                    {item.cedula_ruc ?? 'Sin cédula registrada'} ·{' '}
                    {fechaHora(item.creada_en)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#A1A1AA" />
              </View>

              <View className="flex-row items-center gap-2">
                <View className="rounded-full bg-brandAlpha-primarySoft px-3 py-1">
                  <Text className="text-caption font-bold capitalize text-brand-primary">
                    {item.perfil_riesgo ?? 'sin perfil'}
                  </Text>
                </View>
                {item.puntaje != null ? (
                  <Text className="text-caption text-text-secondary">
                    {item.puntaje} / 15 puntos
                  </Text>
                ) : null}
              </View>

              <Text className="text-display font-bold text-text-primary">
                {usd(item.monto_total)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
