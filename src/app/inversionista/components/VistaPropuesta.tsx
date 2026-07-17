import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Boton from '@/components/shared/Boton';
import BotonAtras from '@/components/shared/BotonAtras';
import Calificacion from '@/components/shared/Calificacion';
import DisclaimerBanner from '@/components/shared/DisclaimerBanner';
import EstadoBadge from '@/components/shared/EstadoBadge';
import { Cargando, ErrorEstado } from '@/components/shared/Estados';
import ExplicacionIA from '@/components/shared/ExplicacionIA';
import SelectorInstrumento from '@/components/shared/SelectorInstrumento';
import { useAuth } from '@/context/AuthContext';
import { useColores } from '@/context/ThemeContext';
import { ApiError } from '@/services/http';
import type { InvestorStackParamList } from '@/types/navigation';
import { fechaHora, plazo, porcentaje, puntos, usd } from '@/utils/formato';

import DonutPortafolio from './DonutPortafolio';
import { getTasas } from '../services/catalogApi';
import { editarAsignacion, getPropuesta, refutarPropuesta } from '../services/investorApi';
import { getOrdenDePropuesta } from '../services/ordersApi';
import type { TasaInstrumento } from '../types/catalogo';
import type { AssetAllocation, PortfolioProposal } from '../types/inversionista';
import type { Orden } from '../types/orden';

/** Los dos estados en los que un asesor ya firmó. 'edited' cuenta: la firmó Y la corrigió
 *  con su nombre, así que está más revisada, no menos. */
const FIRMADAS = ['approved', 'edited'];

/** Una línea mientras se edita: el % es texto porque lo está escribiendo el usuario. */
interface LineaEnEdicion {
  code: string;
  nombre: string;
  detalle: string;
  porcentaje: string;
}

const RIESGO: Record<string, string> = {
  bajo: 'Riesgo bajo',
  medio: 'Riesgo medio',
  alto: 'Riesgo alto',
};

function TarjetaProducto({ linea, color }: { linea: AssetAllocation; color: string }) {
  return (
    <View className="gap-3 rounded-2xl border border-surface-border bg-surface-background p-5">
      <View className="flex-row items-start gap-3">
        <View className="mt-1.5 h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <View className="flex-1 gap-1">
          <Text className="text-body-md font-bold text-text-primary">{linea.nombre}</Text>
          <Text className="text-caption text-text-muted">
            {RIESGO[linea.riesgo] ?? linea.riesgo} · {plazo(linea.plazo_dias)}
          </Text>
        </View>
      </View>

      {/* El % y los USD, juntos. Los USD los calculó Postgres, no el LLM ni el front. */}
      <View className="flex-row items-baseline gap-2 rounded-2xl bg-surface-canvas px-4 py-3">
        <Text className="text-display font-bold text-text-primary">
          {porcentaje(linea.porcentaje)}
        </Text>
        <Text className="text-body-md text-text-secondary">· {usd(linea.monto_asignado)}</Text>
      </View>

      <Calificacion
        institucion={linea.institucion}
        calificacion={linea.calificacion}
        fuente={linea.calificacion_fuente}
        fecha={linea.calificacion_fecha}
      />

      {linea.retorno_esperado != null ? (
        <Text className="text-caption text-text-muted">
          Retorno estimado referencial: {porcentaje(linea.retorno_esperado)} anual. No es un
          rendimiento garantizado.
        </Text>
      ) : null}
    </View>
  );
}

/** Las salidas al pie de la propuesta: mismo alto, mismo chevron, misma jerarquía. */
function FilaAccion({
  icono,
  titulo,
  detalle,
  onPress,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  detalle: string;
  onPress: () => void;
}) {
  const colores = useColores();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-row items-center gap-3 rounded-2xl border border-brand-primary bg-surface-background px-5 py-4"
    >
      <Ionicons name={icono} size={20} color={colores.primario} />
      <View className="flex-1">
        <Text className="text-body-md font-bold text-brand-primary">{titulo}</Text>
        <Text className="text-caption text-text-secondary">{detalle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colores.primario} />
    </TouchableOpacity>
  );
}

interface Props {
  /** La subcuenta a mostrar. Sin él, la propuesta de la sesión más reciente. */
  sessionId?: string;
  titulo?: string;
}

/**
 * HU2: la propuesta. Donut + una tarjeta por producto con emisor, calificación (con su
 * fuente), el % y los USD, y el texto que redactó Gemini.
 *
 * La primera visita **genera** la propuesta en el backend: ahí es donde corre el LLM y su
 * guardarraíl, así que la espera puede ser de varios segundos. Si Gemini falla, el backend
 * igual devuelve la explicación determinista — esta pantalla nunca se queda sin texto, y
 * nunca muestra un número que el LLM haya inventado.
 *
 * Es un componente y no una pantalla porque la usan dos rutas: `Propuesta` (la cartera
 * única, sin `sessionId`) y `SubcuentaDetalle` (una subcuenta concreta). Son la misma
 * pantalla mirando distintas sesiones.
 */
export default function VistaPropuesta({ sessionId, titulo = 'Tu propuesta' }: Props) {
  const colores = useColores();
  const navigation =
    useNavigation<NativeStackNavigationProp<InvestorStackParamList>>();
  const { user } = useAuth();
  const [propuesta, setPropuesta] = useState<PortfolioProposal | null>(null);
  const [error, setError] = useState<string | null>(null);

  // La orden de esta propuesta, si ya se cursó. `null` no es un error: es lo que decide si
  // se pinta "Invertir ahora" o "Ver mi comprobante". `undefined` = todavía no se sabe, y
  // mientras tanto no se pinta ninguno de los dos — ofrecer invertir algo ya invertido
  // sería prometer un 409.
  const [orden, setOrden] = useState<Orden | null | undefined>(undefined);

  // --- Edición: el cliente agrega/quita fondos; el servidor valida y recalcula ---
  const [editando, setEditando] = useState(false);
  const [lineas, setLineas] = useState<LineaEnEdicion[]>([]);
  const [catalogo, setCatalogo] = useState<TasaInstrumento[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  // --- Refutación: el cliente devuelve la decisión firmada a la cola del asesor ---
  const [refutando, setRefutando] = useState(false);
  const [motivoRefutacion, setMotivoRefutacion] = useState('');
  const [enviandoRefutacion, setEnviandoRefutacion] = useState(false);
  const [errorRefutacion, setErrorRefutacion] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!user) return;
    setError(null);
    // No se borra la propuesta que ya está en pantalla: en las recargas al volver el foco
    // eso sería un parpadeo a "Armando tu propuesta…" cada vez. El spinner es solo para
    // la primera carga, cuando todavía no hay nada que mostrar.
    try {
      const p = await getPropuesta(user.id, sessionId);
      setPropuesta(p);

      // Solo tiene sentido preguntar por la orden de una propuesta que se puede invertir:
      // una en revisión no tiene ninguna, y sería un request por gusto en cada foco.
      if (FIRMADAS.includes(p.estado)) {
        try {
          setOrden(await getOrdenDePropuesta(p.proposal_id));
        } catch {
          // Que falle esta consulta no puede tumbar la propuesta: la pantalla vale
          // aunque no sepamos si ya se invirtió. Se cae a "sin orden conocida" y no se
          // ofrece invertir — el backend es el que decide de todos modos.
          setOrden(null);
        }
      } else {
        setOrden(null);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar tu propuesta.');
    }
  }, [user, sessionId]);

  // Al foco y no solo al montar: si el cliente entró a "Cómo se calculó" y corrigió su
  // perfil, el servidor rehizo esta propuesta. Volver atrás tiene que mostrar la nueva,
  // no la que se cargó antes de editarla. El GET no regenera nada: lee lo guardado.
  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  async function abrirEdicion(p: PortfolioProposal) {
    setLineas(
      p.allocations.map((l) => ({
        code: l.instrumento_code,
        nombre: l.nombre,
        detalle: l.institucion ? `${l.institucion} · ${l.calificacion ?? ''}` : '',
        porcentaje: String(l.porcentaje),
      })),
    );
    setErrorEdicion(null);
    setEditando(true);
    // El catálogo llega con la elegibilidad del perfil ya marcada por el servidor.
    if (!catalogo) {
      try {
        setCatalogo((await getTasas()).tasas);
      } catch {
        setCatalogo([]);
      }
    }
  }

  const suma = lineas.reduce(
    (total, l) => total + (Number(l.porcentaje.replace(',', '.')) || 0),
    0,
  );
  const sumaValida = Math.abs(suma - 100) < 0.005 && lineas.length > 0;

  async function enviarRefutacion(p: PortfolioProposal) {
    const texto = motivoRefutacion.trim();
    if (!texto || enviandoRefutacion) return;
    setErrorRefutacion(null);
    setEnviandoRefutacion(true);
    try {
      await refutarPropuesta(p.proposal_id, texto);
      setRefutando(false);
      setMotivoRefutacion('');
      // La propuesta volvió a `pending_review`: recargar hace desaparecer la tarjeta de
      // la firma y reaparecer "Editar mi mezcla" — el mismo estado que pinta el GET.
      await cargar();
    } catch (e) {
      // El servidor puede responder 409 (ya se invirtió, o el estado cambió debajo).
      setErrorRefutacion(
        e instanceof ApiError ? e.message : 'No se pudo enviar tu refutación.',
      );
    } finally {
      setEnviandoRefutacion(false);
    }
  }

  async function guardarEdicion(p: PortfolioProposal) {
    if (!sumaValida || guardando) return;
    setErrorEdicion(null);
    setGuardando(true);
    try {
      const actualizada = await editarAsignacion(
        p.proposal_id,
        lineas.map((l) => ({
          instrumento_code: l.code,
          porcentaje: Number(l.porcentaje.replace(',', '.')),
        })),
      );
      setPropuesta(actualizada);
      setEditando(false);
    } catch (e) {
      // El servidor puede rechazar por elegibilidad: su mensaje trae la regla.
      setErrorEdicion(
        e instanceof ApiError ? e.message : 'No se pudo guardar tu asignación.',
      );
    } finally {
      setGuardando(false);
    }
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <ErrorEstado mensaje={error} onReintentar={cargar} />
      </SafeAreaView>
    );
  }

  if (!propuesta) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <Cargando mensaje="Armando tu propuesta…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-background">

      <View className="flex-row items-center gap-3 border-b border-surface-border px-5 py-4">
        {navigation.canGoBack() ? <BotonAtras onPress={navigation.goBack} /> : null}
        <Text className="flex-1 text-heading font-bold text-text-primary" numberOfLines={1}>
          {titulo}
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-surface-canvas"
        contentContainerClassName="px-5 py-6 gap-4"
      >
        {/* HU2-3: fijo, no descartable. */}
        <DisclaimerBanner />

        <View className="gap-4 rounded-2xl border border-surface-border bg-surface-background p-5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="gap-1">
              <Text className="text-caption font-bold uppercase text-text-secondary">
                Perfil {propuesta.perfil_riesgo}
              </Text>
              <Text className="text-caption text-text-muted">
                {puntos(propuesta.puntaje, propuesta.puntaje_max)} ·{' '}
                {RIESGO[propuesta.riesgo_esperado] ?? propuesta.riesgo_esperado}
              </Text>
            </View>
            <EstadoBadge estado={propuesta.estado} />
          </View>

          <DonutPortafolio
            allocations={propuesta.allocations}
            centro={usd(propuesta.monto_total)}
            etiquetaCentro="Total"
          />

          {propuesta.retorno_esperado_anual != null ? (
            <Text className="text-center text-caption text-text-muted">
              Retorno estimado del portafolio: {porcentaje(propuesta.retorno_esperado_anual)}{' '}
              anual (referencial).
            </Text>
          ) : null}
        </View>

        {/* El único texto del LLM en toda la pantalla; los números que cita salieron del
            prompt, ya calculados, y el guardarraíl verificó que no inventara otros. Llega
            como un párrafo largo: `ExplicacionIA` lo abre en resumen + detalle. */}
        {propuesta.explicacion ? <ExplicacionIA texto={propuesta.explicacion} /> : null}

        {/* --- El paso que antes no existía ---
            Va acá, después de la explicación y antes del detalle, porque el orden es el
            argumento: primero entiendes qué te proponen y quién lo firmó, y recién ahí
            inviertes. Un botón arriba del todo sería la caja negra que este producto
            existe para no ser.

            Solo aparece si un asesor firmó (`FIRMADAS`). Mientras está en revisión no hay
            botón, y eso NO es una decisión de esta pantalla: el backend responde 409 y hay
            un trigger en Postgres que rechaza la orden. Acá solo se refleja. */}
        {FIRMADAS.includes(propuesta.estado) && orden !== undefined ? (
          orden ? (
            <FilaAccion
              icono="receipt-outline"
              titulo="Ver mi comprobante"
              detalle={`Ya invertiste ${usd(orden.monto_total)} en ${orden.lineas.length} ${
                orden.lineas.length === 1 ? 'institución' : 'instituciones'
              }.`}
              onPress={() =>
                navigation.navigate('Comprobante', { orderId: orden.order_id })
              }
            />
          ) : (
            <View className="gap-3 rounded-2xl border border-brand-primary bg-surface-background p-5">
              {/* Con nombre y fecha, no "un asesor". Es la diferencia entre "esto lo
                  aprobó el sistema" y "esta persona respondió por tu cartera" — y el
                  cliente tiene que verlo ANTES de invertir, no en el comprobante. */}
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-brandAlpha-primarySoft">
                  <Ionicons name="shield-checkmark" size={18} color={colores.exito} />
                </View>
                <View className="flex-1">
                  <Text className="text-caption text-text-muted">
                    {propuesta.estado === 'edited'
                      ? 'Revisada y ajustada por'
                      : 'Revisada y aprobada por'}
                  </Text>
                  <Text className="text-body-md font-bold text-text-primary">
                    {propuesta.advisor_nombre ?? 'Un asesor de Brokeate'}
                  </Text>
                  {propuesta.firmada_en ? (
                    <Text className="text-caption text-text-muted">
                      Asesor de Brokeate · {fechaHora(propuesta.firmada_en)}
                    </Text>
                  ) : (
                    <Text className="text-caption text-text-muted">Asesor de Brokeate</Text>
                  )}
                </View>
              </View>

              <Text className="text-caption leading-4 text-text-secondary">
                Al invertir, tu cartera se convierte en una orden por cada institución. No
                pagas nada: la comisión la paga la institución.
              </Text>
              <Boton
                titulo="Invertir ahora"
                onPress={() =>
                  navigation.navigate('Invertir', { proposalId: propuesta.proposal_id })
                }
              />

              {/* --- Refutar: la plata es del cliente ---
                  El asesor firma, pero la firma no obliga: mientras no haya una orden
                  cursada, el cliente puede devolver la decisión a la cola con su motivo.
                  Va DENTRO de la tarjeta de la firma porque es la respuesta a esa firma:
                  "esta persona respondió por tu cartera — ¿y si no estás de acuerdo?". */}
              {!refutando ? (
                <TouchableOpacity
                  onPress={() => {
                    setErrorRefutacion(null);
                    setRefutando(true);
                  }}
                  activeOpacity={0.85}
                  className="flex-row items-center justify-center gap-2 rounded-2xl border border-surface-border py-4"
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={18}
                    color={colores.textoMuted}
                  />
                  <Text className="text-body-md font-bold text-text-secondary">
                    No estoy de acuerdo
                  </Text>
                </TouchableOpacity>
              ) : (
                <View className="gap-3 border-t border-surface-border pt-4">
                  <Text className="text-body-md font-bold text-text-primary">
                    Cuéntale al asesor qué no te convence
                  </Text>
                  <Text className="text-caption leading-4 text-text-secondary">
                    Tu propuesta volverá a revisión: podrás editar tu mezcla y el asesor
                    decidirá de nuevo con tu motivo a la vista. Su decisión anterior queda
                    en el historial.
                  </Text>
                  <TextInput
                    value={motivoRefutacion}
                    onChangeText={setMotivoRefutacion}
                    placeholder="Ej.: prefiero más liquidez y menos plazo fijo…"
                    placeholderTextColor={colores.textoMuted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    className="min-h-20 rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-body text-text-primary"
                  />

                  {errorRefutacion ? (
                    <View className="rounded-2xl bg-stateAlpha-errorSoft px-4 py-3">
                      <Text className="text-body text-state-error">{errorRefutacion}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    onPress={() => void enviarRefutacion(propuesta)}
                    disabled={!motivoRefutacion.trim() || enviandoRefutacion}
                    activeOpacity={0.85}
                    className={`items-center rounded-2xl py-4 ${
                      motivoRefutacion.trim() ? 'bg-brand-primary' : 'bg-surface-secondary'
                    }`}
                  >
                    {enviandoRefutacion ? (
                      <ActivityIndicator color={colores.textoSobrePrimario} />
                    ) : (
                      <Text
                        className={`text-body-md font-bold ${
                          motivoRefutacion.trim() ? 'text-text-onPrimary' : 'text-text-muted'
                        }`}
                      >
                        Devolver al asesor
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setRefutando(false)}
                    disabled={enviandoRefutacion}
                    activeOpacity={0.7}
                    className="items-center py-1"
                  >
                    <Text className="text-body text-text-secondary">Cancelar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )
        ) : null}

        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-caption font-bold uppercase text-text-secondary">
            Productos
          </Text>
          {/* Solo mientras el asesor no ha decidido: una decisión no se pisa (HU3). */}
          {propuesta.estado === 'pending_review' && !editando ? (
            <TouchableOpacity
              onPress={() => void abrirEdicion(propuesta)}
              activeOpacity={0.7}
              className="flex-row items-center gap-1"
            >
              <Ionicons name="create-outline" size={16} color={colores.primario} />
              <Text className="text-body font-bold text-brand-primary">Editar mi mezcla</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!editando ? (
          propuesta.allocations.map((linea, i) => (
            <TarjetaProducto
              key={linea.instrumento_code}
              linea={linea}
              color={colores.grafico[i % colores.grafico.length]}
            />
          ))
        ) : (
          <>
            {lineas.map((linea) => (
              <View
                key={linea.code}
                className="gap-3 rounded-2xl border border-surface-border bg-surface-background p-4"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-body-md font-bold text-text-primary">
                      {linea.nombre}
                    </Text>
                    {linea.detalle ? (
                      <Text className="text-caption text-text-muted">{linea.detalle}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      setLineas((prev) => prev.filter((l) => l.code !== linea.code))
                    }
                    className="h-8 w-8 items-center justify-center rounded-xl bg-stateAlpha-errorSoft"
                  >
                    <Ionicons name="close" size={18} color={colores.error} />
                  </TouchableOpacity>
                </View>
                <View className="flex-row items-center gap-3">
                  <TextInput
                    value={linea.porcentaje}
                    onChangeText={(texto) =>
                      setLineas((prev) =>
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

            <View
              className={`rounded-2xl px-5 py-3 ${
                sumaValida ? 'bg-stateAlpha-successSoft' : 'bg-stateAlpha-errorSoft'
              }`}
            >
              <Text
                className={`text-body font-bold ${
                  sumaValida ? 'text-state-success' : 'text-state-error'
                }`}
              >
                Suma: {porcentaje(suma)}
                {sumaValida ? ' — válida' : ' — debe ser exactamente 100%'}
              </Text>
            </View>

            <Text className="mt-1 text-caption font-bold uppercase text-text-secondary">
              Agregar del catálogo
            </Text>
            {catalogo === null ? (
              <ActivityIndicator color={colores.primario} />
            ) : (
              <SelectorInstrumento
                tasas={catalogo}
                excluir={lineas.map((l) => l.code)}
                onAgregar={(tasa) =>
                  setLineas((prev) => [
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

            {errorEdicion ? (
              <View className="rounded-2xl bg-stateAlpha-errorSoft px-4 py-3">
                <Text className="text-body text-state-error">{errorEdicion}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={() => void guardarEdicion(propuesta)}
              disabled={!sumaValida || guardando}
              activeOpacity={0.85}
              className={`items-center rounded-2xl py-4 ${
                sumaValida ? 'bg-brand-primary' : 'bg-surface-secondary'
              }`}
            >
              {guardando ? (
                <ActivityIndicator color={colores.textoSobrePrimario} />
              ) : (
                <Text
                  className={`text-body-md font-bold ${
                    sumaValida ? 'text-text-onPrimary' : 'text-text-muted'
                  }`}
                >
                  Guardar mi mezcla
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setEditando(false)}
              disabled={guardando}
              activeOpacity={0.7}
              className="items-center py-2"
            >
              <Text className="text-body text-text-secondary">Cancelar la edición</Text>
            </TouchableOpacity>

            <Text className="text-caption text-text-muted">
              Tu mezcla sigue siendo una propuesta: un asesor la revisa antes de que exista
              cualquier efecto, y solo puedes usar productos admitidos para tu perfil.
            </Text>
          </>
        )}

        <View className="mt-2 gap-3">
          {/* HU1-3: el usuario tiene que poder ver cómo se llegó a su perfil. */}
          <FilaAccion
            icono="help-circle-outline"
            titulo="¿Cómo se calculó mi perfil?"
            detalle="Respuesta por respuesta, con las reglas a la vista."
            onPress={() =>
              navigation.navigate('ComoSeCalculo', { sessionId: propuesta.session_id })
            }
          />

          {/* El monto sale de la propuesta, no de la ruta: es el único lugar donde ya
              está cargado. Con él, las tasas llegan con el interés ya calculado —y si la
              propuesta no tiene monto, el comparador abre igual, solo que sin cifras. */}
          <FilaAccion
            icono="swap-horizontal-outline"
            titulo="Comparar con el catálogo"
            detalle={
              propuesta.monto_total != null
                ? `Qué tasa daría ${usd(propuesta.monto_total)} en cada producto.`
                : 'Las tasas aprobadas, y cuáles admite tu perfil.'
            }
            onPress={() =>
              navigation.navigate('Comparador', {
                monto: propuesta.monto_total ?? undefined,
              })
            }
          />

          {/* La pregunta que el cliente se hace y casi nunca puede hacer: "¿y tú qué ganas
              con esto?". Está al lado de la propuesta, no escondida en un menú de ajustes,
              porque es parte de entender la recomendación. */}
          <FilaAccion
            icono="shield-checkmark-outline"
            titulo="¿Cómo gana Brokeate?"
            detalle="Con quién tenemos convenio y cuánto cobramos. Tú no pagas nada."
            onPress={() => navigation.navigate('Convenios')}
          />
        </View>

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
