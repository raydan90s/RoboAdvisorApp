import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cargando, ErrorEstado, Vacio } from '@/components/shared/Estados';
import { ApiError } from '@/services/http';
import type { AdvisorStackParamList, AdvisorTabParamList } from '@/types/navigation';
import { fechaHora } from '@/utils/formato';

import EventoAuditoriaModal from '../components/EventoAuditoriaModal';
import { getAuditoria } from '../services/advisorApi';
import type { EventoAuditoria } from '../types/asesor';

/**
 * `audit_log` guarda el par (`entity_type`, `action`) —"proposal/created",
 * "proposal/approved"—, así que la etiqueta depende de los dos: `created` solo significa
 * algo junto a la entidad que se creó.
 *
 * Los pares `advisor_review/*` son los que escribe `seed.sql`; los `proposal/*` los que
 * escribe el backend en vivo (`advisor_controller.revisar`). Los dos existen en la misma
 * base, así que los dos se etiquetan.
 *
 * Si aparece un par que no está acá, se muestra el código crudo —y también se puede
 * filtrar por él—. Un log de auditoría prefiere un `foo/bar` feo antes que una etiqueta
 * inventada que diga lo que no pasó.
 */
const EVENTOS: Record<string, { etiqueta: string; chip: string; color: string }> = {
  // La pantalla ya no lista este par (ver `DECIDIDAS`), pero el mapa sigue siendo el
  // diccionario de lo que `audit_log` puede decir: borrarlo de acá no borra el evento.
  'proposal/created': {
    etiqueta: 'Propuesta generada',
    chip: 'Generadas',
    color: 'bg-brand-mid',
  },
  'proposal/approved': {
    etiqueta: 'Propuesta aprobada',
    chip: 'Aprobadas',
    color: 'bg-brand-accent',
  },
  'proposal/edited': {
    etiqueta: 'Asignación editada por el asesor',
    chip: 'Editadas',
    color: 'bg-brand-primary',
  },
  'proposal/rejected': {
    etiqueta: 'Propuesta rechazada',
    chip: 'Rechazadas',
    color: 'bg-state-error',
  },
  'advisor_review/approved': {
    etiqueta: 'Propuesta aprobada',
    chip: 'Aprobadas',
    color: 'bg-brand-accent',
  },
  'advisor_review/edited': {
    etiqueta: 'Asignación editada por el asesor',
    chip: 'Editadas',
    color: 'bg-brand-primary',
  },
  'advisor_review/rejected': {
    etiqueta: 'Propuesta rechazada',
    chip: 'Rechazadas',
    color: 'bg-state-error',
  },
};

/**
 * Las acciones que esta pantalla lista: **las que ya se decidieron.**
 *
 * `created` queda afuera a propósito. Una propuesta generada y sin decidir es, exactamente,
 * una propuesta pendiente — y las pendientes ya tienen su pantalla: la Cola de revisión.
 * Acá llenaban el timeline con trabajo por hacer, no con trabajo hecho.
 *
 * `rejected` sí entra: se decidió, y no está en la Cola. "Ya pasó" no quiere decir "salió
 * bien".
 *
 * Ojo con lo que esto cuesta: el evento `proposal/created` es el único que registra **cuándo
 * se generó** cada propuesta y con qué puntaje. Al no listarlo, la auditoría deja de poder
 * responder "¿cuándo nació esta propuesta?" desde esta pantalla. Sigue en `audit_log` y en
 * el endpoint; lo que se esconde es la fila, no el hecho.
 */
const DECIDIDAS = ['approved', 'edited', 'rejected'];

/** Las dos entidades cuyo `entity_id` es un `proposal_id`: desde ellas se abre el detalle. */
const ENTIDADES_PROPUESTA = ['proposal', 'advisor_review'];

const clave = (e: EventoAuditoria) => `${e.entity_type}/${e.action}`;
const etiquetaDe = (e: EventoAuditoria) => EVENTOS[clave(e)]?.etiqueta ?? clave(e);

/**
 * El chip agrupa por **lo que pasó**, no por el par crudo: una aprobación es una
 * aprobación la haya escrito el backend (`proposal/approved`) o el seed
 * (`advisor_review/approved`). Sin esto salían dos chips "Aprobadas".
 */
const chipDe = (e: EventoAuditoria) => EVENTOS[clave(e)]?.chip ?? clave(e);

/** Todo lo que el evento dice, aplanado: lo que se busca con la caja de texto. */
function textoBuscable(e: EventoAuditoria): string {
  return [
    etiquetaDe(e),
    e.actor_nombre,
    e.actor_rol,
    e.entity_type,
    e.entity_id,
    e.action,
    e.platform,
    e.metadata ? JSON.stringify(e.metadata) : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<AdvisorTabParamList, 'Auditoria'>,
  NativeStackScreenProps<AdvisorStackParamList>
>;

/**
 * HU3, criterio 3: **fecha, versión de reglas y responsable de cada decisión.**
 *
 * Es `v_audit_timeline` **restringido a las decisiones** (`DECIDIDAS`): lo que ya se
 * aprobó, se editó o se rechazó. Lo generado y aún sin decidir es la Cola de revisión, y
 * mezclar las dos cosas convertía esta pantalla en una segunda bandeja de pendientes.
 *
 * Salvo ese recorte, la pantalla no interpreta ni resume: si un evento trae `metadata`, se
 * muestra lo que ese metadata dice. Un log de auditoría que el front reinterpreta deja de
 * ser evidencia.
 *
 * Los filtros son **de vista, no de consulta**: el endpoint solo acepta `limite`, así que
 * se filtra sobre los eventos ya traídos. Por eso el contador dice siempre cuántas de
 * cuántas se están viendo: un filtro que esconde eventos sin decir cuántos escondió es
 * exactamente lo que una auditoría no puede permitirse.
 */
export default function AuditoriaPage({ navigation }: Props) {
  const [eventos, setEventos] = useState<EventoAuditoria[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const [filtro, setFiltro] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState<EventoAuditoria | null>(null);

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

  /**
   * El timeline de esta pantalla: las decisiones. Todo lo demás —hoy, las propuestas
   * generadas que siguen esperando— vive en la Cola, y contarlo acá sería contarlo dos
   * veces.
   */
  const decisiones = useMemo(
    () => (eventos ?? []).filter((e) => DECIDIDAS.includes(e.action)),
    [eventos],
  );

  /** Los chips salen de las decisiones que hay, no de una lista fija: si la base nunca
   *  registró un rechazo, no se ofrece filtrar por rechazos. */
  const chips = useMemo(() => {
    const vistos = new Map<string, number>();
    for (const evento of decisiones) {
      const texto = chipDe(evento);
      vistos.set(texto, (vistos.get(texto) ?? 0) + 1);
    }
    return [...vistos.entries()].map(([texto, total]) => ({ texto, total }));
  }, [decisiones]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return decisiones.filter(
      (e) =>
        (filtro === null || chipDe(e) === filtro) &&
        (texto === '' || textoBuscable(e).includes(texto)),
    );
  }, [decisiones, filtro, busqueda]);

  const filtrando = filtro !== null || busqueda.trim() !== '';

  return (
    <SafeAreaView className="flex-1 bg-surface-background" edges={['top']}>
      <StatusBar style="dark" />

      <View className="gap-3 border-b border-surface-border px-5 pb-4 pt-4">
        <View className="gap-1">
          <Text className="text-heading font-bold text-text-primary">Auditoría</Text>
          <Text className="text-caption text-text-secondary">
            Cada decisión ya tomada, con su fecha, su responsable y la versión de reglas
            vigente. Las propuestas que todavía esperan revisión están en la Cola.
          </Text>
        </View>

        {decisiones.length > 0 ? (
          <>
            <View className="flex-row items-center gap-2 rounded-2xl bg-surface-canvas px-4 py-2.5">
              <Ionicons name="search" size={16} color="#6B7280" />
              <TextInput
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar por responsable, entidad o versión"
                placeholderTextColor="#A1A1AA"
                autoCorrect={false}
                className="flex-1 text-body text-text-primary"
              />
              {busqueda !== '' ? (
                <TouchableOpacity
                  onPress={() => setBusqueda('')}
                  hitSlop={10}
                  accessibilityLabel="Limpiar la búsqueda"
                >
                  <Ionicons name="close-circle" size={16} color="#6B7280" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 pr-5"
            >
              <TouchableOpacity
                onPress={() => setFiltro(null)}
                activeOpacity={0.85}
                className={`rounded-full border px-3.5 py-1.5 ${
                  filtro === null
                    ? 'border-brand-primary bg-brand-primary'
                    : 'border-surface-border bg-surface-background'
                }`}
              >
                <Text
                  className={`text-caption font-bold ${
                    filtro === null ? 'text-text-onPrimary' : 'text-text-secondary'
                  }`}
                >
                  Todas · {decisiones.length}
                </Text>
              </TouchableOpacity>

              {chips.map((chip) => {
                const activo = filtro === chip.texto;
                return (
                  <TouchableOpacity
                    key={chip.texto}
                    onPress={() => setFiltro(activo ? null : chip.texto)}
                    activeOpacity={0.85}
                    className={`rounded-full border px-3.5 py-1.5 ${
                      activo
                        ? 'border-brand-primary bg-brand-primary'
                        : 'border-surface-border bg-surface-background'
                    }`}
                  >
                    <Text
                      className={`text-caption font-bold ${
                        activo ? 'text-text-onPrimary' : 'text-text-secondary'
                      }`}
                    >
                      {chip.texto} · {chip.total}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        ) : null}
      </View>

      {error ? (
        <ErrorEstado mensaje={error} onReintentar={cargar} />
      ) : !eventos ? (
        <Cargando mensaje="Cargando la auditoría…" />
      ) : decisiones.length === 0 ? (
        <Vacio titulo="Todavía no se ha decidido ninguna propuesta" />
      ) : (
        <ScrollView
          className="flex-1 bg-surface-canvas"
          contentContainerClassName="px-5 py-5 gap-3"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={refrescar} />
          }
        >
          <Text className="text-caption text-text-muted">
            {filtrando
              ? `${filtrados.length} de ${decisiones.length} decisiones`
              : `${decisiones.length} decisiones · de la más reciente a la más antigua`}
          </Text>

          {filtrados.length === 0 ? (
            <View className="items-center gap-2 rounded-2xl border border-surface-border bg-surface-background p-8">
              <Text className="text-body-md font-bold text-text-primary">
                Ninguna decisión coincide
              </Text>
              <Text className="text-center text-caption text-text-secondary">
                El filtro no cambia lo registrado: las {decisiones.length} decisiones siguen
                ahí.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setFiltro(null);
                  setBusqueda('');
                }}
                activeOpacity={0.85}
                className="mt-1 rounded-2xl bg-brand-primary px-5 py-2.5"
              >
                <Text className="text-body font-bold text-text-onPrimary">
                  Quitar los filtros
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtrados.map((evento) => {
              const k = clave(evento);
              const version = evento.metadata?.rules_version;

              return (
                <TouchableOpacity
                  key={evento.id}
                  onPress={() => setAbierto(evento)}
                  activeOpacity={0.85}
                  className="flex-row items-center gap-3 rounded-2xl border border-surface-border bg-surface-background p-5"
                >
                  <View
                    className={`h-2.5 w-2.5 self-start rounded-full ${
                      EVENTOS[k]?.color ?? 'bg-surface-divider'
                    } mt-1.5`}
                  />

                  <View className="flex-1 gap-1">
                    <Text className="text-body font-bold text-text-primary">
                      {EVENTOS[k]?.etiqueta ?? k}
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

                  <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
                </TouchableOpacity>
              );
            })
          )}

          <View className="h-4" />
        </ScrollView>
      )}

      <EventoAuditoriaModal
        evento={abierto}
        etiqueta={abierto ? etiquetaDe(abierto) : ''}
        esPropuesta={abierto !== null && ENTIDADES_PROPUESTA.includes(abierto.entity_type)}
        onCerrar={() => setAbierto(null)}
        onVerPropuesta={
          abierto && ENTIDADES_PROPUESTA.includes(abierto.entity_type)
            ? () => {
                const proposalId = abierto.entity_id;
                setAbierto(null);
                navigation.navigate('DetallePropuesta', { proposalId });
              }
            : undefined
        }
      />
    </SafeAreaView>
  );
}
