import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
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

import { getTasas } from '@/app/inversionista/services/catalogApi';
import type { TasaInstrumento } from '@/app/inversionista/types/catalogo';
import BotonAtras from '@/components/shared/BotonAtras';
import Calificacion from '@/components/shared/Calificacion';
import EstadoBadge from '@/components/shared/EstadoBadge';
import { Cargando, ErrorEstado } from '@/components/shared/Estados';
import ExplicacionIA from '@/components/shared/ExplicacionIA';
import SelectorInstrumento from '@/components/shared/SelectorInstrumento';
import { COLORES } from '@/constants/colores';
import { ApiError } from '@/services/http';
import type { AdvisorStackParamList } from '@/types/navigation';
import { fechaHora, plazo, porcentaje, usd } from '@/utils/formato';

import { getPropuesta, revisarPropuesta } from '../services/advisorApi';
import type { Decision, PropuestaDetalle } from '../types/asesor';

/** Una línea mientras el asesor la edita: el % es texto porque lo está escribiendo. */
interface LineaEdicion {
  code: string;
  nombre: string;
  detalle: string;
  porcentaje: string;
}

type Props = NativeStackScreenProps<AdvisorStackParamList, 'DetallePropuesta'>;

const DECISIONES: Record<Decision, string> = {
  approved: 'aprobada',
  edited: 'editada',
  rejected: 'rechazada',
};

/**
 * HU3: lo que ve el asesor antes de decidir, y las tres decisiones.
 *
 * Dos reglas del backend que esta pantalla **no reimplementa, solo acompaña**:
 *
 * - Los porcentajes editados deben sumar exactamente 100 y los códigos tienen que existir
 *   en el catálogo. Acá se muestra la suma en vivo para no hacerle perder un viaje al
 *   asesor, pero quien valida de verdad es el servidor. Si algún día divergen, gana el
 *   servidor: el catálogo es tan cerrado para el asesor como para el LLM.
 * - Una propuesta se decide **una sola vez** (`select … for update` + 409). Ese 409 no se
 *   reintenta: se le muestra al asesor, porque significa que alguien más ya decidió.
 *
 * Los USD de una edición los recalcula Postgres. Acá no se multiplica nada.
 */
export default function DetallePropuestaPage({ navigation, route }: Props) {
  const { proposalId } = route.params;

  const [detalle, setDetalle] = useState<PropuestaDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [comentario, setComentario] = useState('');
  const [editando, setEditando] = useState(false);
  /** Las líneas que el asesor está armando: puede quitar, agregar y reponderar. */
  const [lineasEdicion, setLineasEdicion] = useState<LineaEdicion[]>([]);
  const [catalogo, setCatalogo] = useState<TasaInstrumento[] | null>(null);

  const [enviando, setEnviando] = useState<Decision | null>(null);
  const [errorDecision, setErrorDecision] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    setDetalle(null);
    try {
      setDetalle(await getPropuesta(proposalId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la propuesta.');
    }
  }, [proposalId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function abrirEdicion(d: PropuestaDetalle) {
    setLineasEdicion(
      d.allocations.map((l) => ({
        code: l.instrumento_code,
        nombre: l.nombre,
        detalle: `${l.institucion} · ${l.calificacion}`,
        porcentaje: String(l.porcentaje),
      })),
    );
    setEditando(true);
    // El catálogo completo: el asesor puede usar cualquier producto aprobado (a
    // diferencia del cliente, a quien el servidor le exige elegibilidad).
    if (!catalogo) {
      try {
        setCatalogo((await getTasas()).tasas);
      } catch {
        setCatalogo([]);
      }
    }
  }

  const sumaEditada = lineasEdicion.reduce(
    (total, linea) => total + (Number(linea.porcentaje.replace(',', '.')) || 0),
    0,
  );

  async function decidir(decision: Decision) {
    if (!detalle || enviando) return;
    setErrorDecision(null);
    setEnviando(decision);
    try {
      await revisarPropuesta(proposalId, {
        decision,
        comments: comentario.trim() || undefined,
        edited_allocation:
          decision === 'edited'
            ? lineasEdicion.map((l) => ({
                instrumento_code: l.code,
                porcentaje: Number(l.porcentaje.replace(',', '.')),
              }))
            : undefined,
      });
      // Decidida, la propuesta sale de la cola. Volver alcanza: ColaRevisionPage relee
      // al recuperar el foco, así que la tarjeta desaparece sola.
      navigation.goBack();
    } catch (e) {
      setErrorDecision(
        e instanceof ApiError ? e.message : 'No se pudo registrar la decisión.',
      );
      setEnviando(null);
    }
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <ErrorEstado mensaje={error} onReintentar={cargar} />
      </SafeAreaView>
    );
  }

  if (!detalle) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <Cargando mensaje="Cargando la propuesta…" />
      </SafeAreaView>
    );
  }

  const yaDecidida = detalle.estado !== 'pending_review';
  const rechazoSinComentario = comentario.trim().length === 0;
  const edicionValida = Math.abs(sumaEditada - 100) < 0.005 && lineasEdicion.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <StatusBar style="dark" />

      <View className="flex-row items-center gap-3 border-b border-surface-border px-5 py-4">
        <BotonAtras onPress={navigation.goBack} />
        <Text className="flex-1 text-heading font-bold text-text-primary" numberOfLines={1}>
          {detalle.investor_nombre}
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1 bg-surface-canvas"
          contentContainerClassName="px-5 py-6 gap-4"
          keyboardShouldPersistTaps="handled"
        >
          {/* Ficha del cliente */}
          <View className="gap-3 rounded-2xl border border-surface-border bg-surface-background p-5">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-caption text-text-muted">
                  {detalle.investor_email ?? 'Sin correo'} ·{' '}
                  {detalle.cedula_ruc ?? 'Sin cédula'}
                </Text>
                <Text className="text-display font-bold text-text-primary">
                  {usd(detalle.monto_total)}
                </Text>
                <Text className="text-body text-text-secondary">
                  Perfil <Text className="font-bold capitalize">{detalle.perfil_riesgo}</Text>
                  {detalle.puntaje != null ? ` · ${detalle.puntaje} / 15 puntos` : ''}
                </Text>
              </View>
              <EstadoBadge estado={detalle.estado} />
            </View>

            <Text className="text-caption text-text-muted">
              Creada el {fechaHora(detalle.creada_en)}
            </Text>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ComoSeCalculo', {
                  investorId: detalle.investor_id,
                  sessionId: detalle.session_id,
                })
              }
              activeOpacity={0.85}
              className="flex-row items-center justify-between rounded-2xl bg-surface-canvas px-4 py-3"
            >
              <Text className="text-body font-bold text-brand-primary">
                Ver cómo se calculó su perfil
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#14375E" />
            </TouchableOpacity>
          </View>

          {/* Banderas: comparaciones contra la base, sin IA. Es el resumen que la HU3
              le debe al asesor, y por eso va arriba de los productos. */}
          {detalle.banderas.length > 0 ? (
            <View className="gap-2 rounded-2xl bg-stateAlpha-warningSoft p-5">
              <View className="flex-row items-center gap-2">
                <Ionicons name="flag" size={16} color="#C77700" />
                <Text className="text-caption font-bold uppercase text-text-primary">
                  Puntos de atención
                </Text>
              </View>
              {detalle.banderas.map((bandera) => (
                <Text key={bandera} className="text-body leading-5 text-text-primary">
                  • {bandera}
                </Text>
              ))}
              <Text className="text-caption text-text-secondary">
                Detectados por comparación directa contra el catálogo y las reglas. No
                intervino el modelo de lenguaje.
              </Text>
            </View>
          ) : null}

          {/* Productos */}
          <Text className="mt-2 text-caption font-bold uppercase text-text-secondary">
            Asignación propuesta
          </Text>

          {!editando
            ? detalle.allocations.map((linea) => (
                <View
                  key={linea.instrumento_code}
                  className="gap-3 rounded-2xl border border-surface-border bg-surface-background p-5"
                >
                  <View className="gap-1">
                    <Text className="text-body-md font-bold text-text-primary">
                      {linea.nombre}
                    </Text>
                    <Text className="text-caption text-text-muted">
                      {linea.instrumento_code} · {plazo(linea.plazo_dias)}
                      {linea.monto_minimo != null
                        ? ` · mínimo de acceso ${usd(linea.monto_minimo)}`
                        : ''}
                    </Text>
                  </View>

                  <Calificacion
                    institucion={linea.institucion}
                    calificacion={linea.calificacion}
                    fuente={linea.calificacion_fuente}
                    fecha={linea.calificacion_fecha}
                  />

                  <View className="flex-row items-baseline gap-2 rounded-2xl bg-surface-canvas px-4 py-3">
                    <Text className="text-title font-bold text-text-primary">
                      {porcentaje(linea.porcentaje)}
                    </Text>
                    <Text className="text-body text-text-secondary">
                      · {usd(linea.monto_asignado)}
                    </Text>
                  </View>
                </View>
              ))
            : lineasEdicion.map((linea) => (
                <View
                  key={linea.code}
                  className="gap-3 rounded-2xl border border-surface-border bg-surface-background p-4"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-body-md font-bold text-text-primary">
                        {linea.nombre}
                      </Text>
                      <Text className="text-caption text-text-muted">{linea.detalle}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        setLineasEdicion((prev) =>
                          prev.filter((l) => l.code !== linea.code),
                        )
                      }
                      className="h-8 w-8 items-center justify-center rounded-xl bg-stateAlpha-errorSoft"
                    >
                      <Ionicons name="close" size={18} color={COLORES.error} />
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <TextInput
                      value={linea.porcentaje}
                      onChangeText={(texto) =>
                        setLineasEdicion((prev) =>
                          prev.map((l) =>
                            l.code === linea.code ? { ...l, porcentaje: texto } : l,
                          ),
                        )
                      }
                      keyboardType="numeric"
                      inputMode="decimal"
                      className="w-24 rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-body-md font-bold text-text-primary"
                    />
                    <Text className="text-body text-text-secondary">
                      % — los USD los recalcula el sistema
                    </Text>
                  </View>
                </View>
              ))}

          {editando ? (
            <>
              <View
                className={`rounded-2xl px-5 py-3 ${
                  edicionValida ? 'bg-stateAlpha-successSoft' : 'bg-stateAlpha-errorSoft'
                }`}
              >
                <Text
                  className={`text-body font-bold ${
                    edicionValida ? 'text-state-success' : 'text-state-error'
                  }`}
                >
                  Suma: {porcentaje(sumaEditada)}
                  {edicionValida ? ' — válida' : ' — debe ser exactamente 100%'}
                </Text>
              </View>

              <Text className="mt-1 text-caption font-bold uppercase text-text-secondary">
                Agregar del catálogo
              </Text>
              {catalogo === null ? (
                <ActivityIndicator color={COLORES.primario} />
              ) : (
                <SelectorInstrumento
                  tasas={catalogo}
                  excluir={lineasEdicion.map((l) => l.code)}
                  onAgregar={(tasa) =>
                    setLineasEdicion((prev) => [
                      ...prev,
                      {
                        code: tasa.code,
                        nombre: tasa.producto,
                        detalle: `${tasa.institucion} · ${tasa.calificacion}`,
                        porcentaje: '',
                      },
                    ])
                  }
                />
              )}
            </>
          ) : null}

          {/* El texto del LLM, marcado como tal: el asesor tiene que saber qué leyó su
              cliente y quién lo escribió. Se muestra resumido, pero al expandir aparece
              íntegro —disclaimer incluido—: acá no se audita un resumen nuestro, se audita
              el texto que el cliente tuvo delante. */}
          {detalle.explicacion ? (
            <ExplicacionIA
              texto={detalle.explicacion}
              titulo="Explicación que vio el cliente"
              conservarDisclaimer
            />
          ) : null}

          {/* Historial: fecha · versión de reglas · responsable. El criterio de la HU3. */}
          {detalle.revisiones.length > 0 ? (
            <View className="gap-3 rounded-2xl border border-surface-border bg-surface-background p-5">
              <Text className="text-caption font-bold uppercase text-text-secondary">
                Historial de revisión
              </Text>
              {detalle.revisiones.map((r) => (
                <View key={r.review_id} className="gap-1 border-t border-surface-border pt-3">
                  <Text className="text-body font-bold capitalize text-text-primary">
                    {DECISIONES[r.decision]} por {r.advisor_nombre ?? 'un asesor'}
                  </Text>
                  <Text className="text-caption text-text-muted">
                    {fechaHora(r.decided_at)} · reglas {r.rules_version ?? '—'}
                  </Text>
                  {r.comments ? (
                    <Text className="text-body text-text-secondary">{r.comments}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {/* Decisión */}
          {yaDecidida ? (
            <View className="rounded-2xl border border-surface-border bg-surface-background p-5">
              <Text className="text-body text-text-secondary">
                Esta propuesta ya fue decidida. Una decisión no se sobrescribe: si hace
                falta cambiarla, el cliente debe perfilarse de nuevo.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              <Text className="mt-2 text-caption font-bold uppercase text-text-secondary">
                Tu decisión
              </Text>

              <TextInput
                value={comentario}
                onChangeText={setComentario}
                placeholder="Comentario (obligatorio si rechazas)"
                placeholderTextColor="#A1A1AA"
                multiline
                className="min-h-20 rounded-2xl border border-surface-border bg-surface-background px-4 py-3 text-body text-text-primary"
              />

              {errorDecision ? (
                <View className="rounded-2xl bg-stateAlpha-errorSoft px-4 py-3">
                  <Text className="text-body text-state-error">{errorDecision}</Text>
                </View>
              ) : null}

              {editando ? (
                <>
                  <TouchableOpacity
                    onPress={() => decidir('edited')}
                    disabled={!edicionValida || enviando !== null}
                    activeOpacity={0.85}
                    className={`items-center rounded-2xl py-4 ${
                      edicionValida ? 'bg-brand-primary' : 'bg-surface-secondary'
                    }`}
                  >
                    {enviando === 'edited' ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text
                        className={`text-body-md font-bold ${
                          edicionValida ? 'text-text-onPrimary' : 'text-text-muted'
                        }`}
                      >
                        Guardar asignación editada
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setEditando(false)}
                    activeOpacity={0.7}
                    className="items-center py-2"
                  >
                    <Text className="text-body text-text-secondary">
                      Cancelar la edición
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => decidir('approved')}
                    disabled={enviando !== null}
                    activeOpacity={0.85}
                    className="items-center rounded-2xl bg-brand-accent py-4"
                  >
                    {enviando === 'approved' ? (
                      <ActivityIndicator color="#18181B" />
                    ) : (
                      <Text className="text-body-md font-bold text-text-onAccent">
                        Aprobar
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => void abrirEdicion(detalle)}
                    disabled={enviando !== null}
                    activeOpacity={0.85}
                    className="items-center rounded-2xl border border-brand-primary py-4"
                  >
                    <Text className="text-body-md font-bold text-brand-primary">
                      Editar la asignación
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => decidir('rejected')}
                    disabled={rechazoSinComentario || enviando !== null}
                    activeOpacity={0.85}
                    className={`items-center rounded-2xl py-4 ${
                      rechazoSinComentario ? 'bg-surface-secondary' : 'bg-state-error'
                    }`}
                  >
                    {enviando === 'rejected' ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text
                        className={`text-body-md font-bold ${
                          rechazoSinComentario ? 'text-text-muted' : 'text-text-onPrimary'
                        }`}
                      >
                        {rechazoSinComentario
                          ? 'Rechazar (escribe un comentario)'
                          : 'Rechazar'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          <View className="h-4" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
