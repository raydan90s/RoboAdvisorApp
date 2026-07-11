import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cargando, ErrorEstado, Vacio } from '@/components/shared/Estados';
import { ApiError } from '@/services/http';
import { fechaHora } from '@/utils/formato';

import { getAuditoria } from '../services/advisorApi';
import type { EventoAuditoria } from '../types/asesor';

/**
 * `audit_log` guarda el par (`entity_type`, `action`) —"proposal/created",
 * "advisor_review/approved"—, así que la etiqueta depende de los dos: `created` solo
 * significa algo junto a la entidad que se creó.
 *
 * Si aparece un par que no está acá, se muestra el código crudo. Un log de auditoría
 * prefiere un `foo/bar` feo antes que una etiqueta inventada que diga lo que no pasó.
 */
const ETIQUETAS: Record<string, string> = {
  'proposal/created': 'Propuesta generada',
  'advisor_review/approved': 'Propuesta aprobada',
  'advisor_review/edited': 'Asignación editada por el asesor',
  'advisor_review/rejected': 'Propuesta rechazada',
};

const COLORES: Record<string, string> = {
  'advisor_review/approved': 'bg-brand-accent',
  'advisor_review/rejected': 'bg-state-error',
  'advisor_review/edited': 'bg-brand-primary',
};

/**
 * HU3, criterio 3: **fecha, versión de reglas y responsable de cada decisión.**
 *
 * Es `v_audit_timeline` pintado tal cual. La pantalla no interpreta ni resume: si un
 * evento trae `metadata`, se muestra lo que ese metadata dice. Un log de auditoría que
 * el front reinterpreta deja de ser evidencia.
 */
export default function AuditoriaPage() {
  const [eventos, setEventos] = useState<EventoAuditoria[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setEventos(await getAuditoria());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la auditoría.');
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

      <View className="border-b border-surface-border px-5 py-4">
        <Text className="text-heading font-bold text-text-primary">Auditoría</Text>
        <Text className="text-caption text-text-secondary">
          Cada decisión, con su fecha, su responsable y la versión de reglas vigente.
        </Text>
      </View>

      {error ? (
        <ErrorEstado mensaje={error} onReintentar={cargar} />
      ) : !eventos ? (
        <Cargando mensaje="Cargando la auditoría…" />
      ) : eventos.length === 0 ? (
        <Vacio titulo="Todavía no hay eventos registrados" />
      ) : (
        <ScrollView
          className="flex-1 bg-surface-canvas"
          contentContainerClassName="px-5 py-6 gap-3"
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={refrescar} />
          }
        >
          {eventos.map((evento) => {
            const clave = `${evento.entity_type}/${evento.action}`;
            const version = evento.metadata?.rules_version;

            return (
              <View
                key={evento.id}
                className="flex-row gap-3 rounded-2xl border border-surface-border bg-surface-background p-5"
              >
                <View
                  className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
                    COLORES[clave] ?? 'bg-surface-divider'
                  }`}
                />

                <View className="flex-1 gap-1">
                  <Text className="text-body font-bold text-text-primary">
                    {ETIQUETAS[clave] ?? clave}
                  </Text>
                  <Text className="text-caption text-text-secondary">
                    {fechaHora(evento.created_at)}
                    {evento.actor_nombre ? ` · ${evento.actor_nombre}` : ''}
                    {evento.actor_rol ? ` (${evento.actor_rol})` : ''}
                  </Text>
                  <Text className="text-caption text-text-muted">
                    {evento.entity_type} · {evento.platform}
                    {typeof version === 'string' ? ` · reglas ${version}` : ''}
                  </Text>
                </View>
              </View>
            );
          })}

          <View className="h-4" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
