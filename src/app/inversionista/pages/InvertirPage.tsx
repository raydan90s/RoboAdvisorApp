import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Boton from '@/components/shared/Boton';
import { ErrorEstado } from '@/components/shared/Estados';
import { useColores } from '@/context/ThemeContext';
import { ApiError } from '@/services/http';
import type { InvestorStackParamList } from '@/types/navigation';
import { porcentaje, usd } from '@/utils/formato';

import { confirmarOrden, invertir } from '../services/ordersApi';
import type { Orden } from '../types/orden';

/** Cuánto tarda en "responder" cada banco en pantalla. */
const PASO_MS = 700;

/**
 * Que el escalonado lo ponga el front y no el servidor es deliberado: es tiempo de
 * animación, no un dato. El backend confirma las N líneas en una sola llamada y en
 * milisegundos — inventar una latencia allá para que acá se vea bonito sería meter una
 * mentira en el sistema para arreglar un problema de la pantalla.
 */
function useRevelado(total: number, activo: boolean): number {
  const [revelados, setRevelados] = useState(0);

  useEffect(() => {
    if (!activo || total === 0) return;
    setRevelados(0);

    const timers = Array.from({ length: total }, (_, i) =>
      setTimeout(() => setRevelados(i + 1), PASO_MS * (i + 1)),
    );
    return () => timers.forEach(clearTimeout);
  }, [total, activo]);

  return revelados;
}

type Fase = 'cursando' | 'conectando' | 'listo' | 'error';

function FilaBanco({
  linea,
  confirmada,
}: {
  linea: Orden['lineas'][number];
  confirmada: boolean;
}) {
  const colores = useColores();

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-surface-border bg-surface-background px-4 py-3.5">
      <View
        className={`h-9 w-9 items-center justify-center rounded-xl ${
          confirmada ? 'bg-stateAlpha-successSoft' : 'bg-surface-secondary'
        }`}
      >
        {confirmada ? (
          <Ionicons name="checkmark" size={18} color={colores.exito} />
        ) : (
          <ActivityIndicator size="small" color={colores.textoMuted} />
        )}
      </View>

      <View className="flex-1 gap-0.5">
        <Text className="text-body-md font-bold text-text-primary" numberOfLines={1}>
          {linea.institucion ?? linea.instrumento_nombre}
        </Text>
        <Text className="text-caption text-text-muted" numberOfLines={1}>
          {confirmada
            ? // La referencia es lo que prueba que este banco respondió. Mientras no
              // llega, no se inventa un texto que sugiera que ya pasó algo.
              `Ref. ${linea.bank_reference}`
            : 'Conectando…'}
        </Text>
      </View>

      <Text className="text-body-md font-bold text-text-primary">{usd(linea.monto)}</Text>
    </View>
  );
}

/**
 * «Invertir ahora»: el momento en que una propuesta firmada se vuelve N órdenes.
 *
 * La pantalla existe porque el hecho que cuenta no cabe en un spinner. Una cartera
 * diversificada en tres instituciones son **tres instrucciones distintas**, cada una a un
 * banco distinto y con su propia referencia — y eso es justo lo que un depósito en una
 * sola ventanilla no puede hacer. Verlas confirmarse una por una es el argumento.
 *
 * El flujo son dos llamadas, no una, porque son dos hechos distintos:
 *   1. `invertir()`      → la orden nace `sent`. El cliente decidió; el banco no sabe nada.
 *   2. `confirmarOrden()` → el banco acusa y cada línea recibe su referencia.
 * Entre las dos está el momento en que al asesor le entra el aviso en su pantalla.
 *
 * Ojo con el `useRef`: entrar dos veces (o que React monte el efecto dos veces en dev)
 * NO puede cursar dos órdenes. El backend igual lo impide —hay un UNIQUE en
 * `investment_orders.proposal_id`— pero acá el segundo intento recibiría un 409 y el
 * usuario vería un error rojo por hacer algo perfectamente normal.
 */
export default function InvertirPage() {
  const colores = useColores();
  const navigation = useNavigation<NativeStackNavigationProp<InvestorStackParamList>>();
  const { proposalId } = useRoute<RouteProp<InvestorStackParamList, 'Invertir'>>().params;

  const [orden, setOrden] = useState<Orden | null>(null);
  const [fase, setFase] = useState<Fase>('cursando');
  const [error, setError] = useState<string | null>(null);

  // Dos refs con trabajos distintos:
  //  - `yaCurso`  evita cursar dos veces en paralelo (React monta el efecto dos veces en
  //    dev, y el usuario puede volver a entrar).
  //  - `ordenRef` recuerda la orden que YA salió, para que un reintento retome en vez de
  //    volver a invertir. No es estado porque no se pinta: se consulta.
  const yaCurso = useRef(false);
  const ordenRef = useRef<Orden | null>(null);

  const revelados = useRevelado(orden?.lineas.length ?? 0, fase === 'conectando');
  const listo = fase === 'listo';

  const cursar = useCallback(async () => {
    if (yaCurso.current) return;
    yaCurso.current = true;

    setError(null);
    setFase('cursando');
    try {
      // Reintentar NO puede volver a invertir. Si la orden ya salió y lo que falló fue la
      // confirmación (la red se cayó entre las dos llamadas), `invertir()` respondería 409
      // "esta propuesta ya fue invertida" y el usuario quedaría atrapado en un error del
      // que no hay salida — con su orden ya cursada del otro lado. Se retoma donde quedó.
      const enviada = ordenRef.current ?? (await invertir(proposalId));
      ordenRef.current = enviada;
      setOrden(enviada);
      setFase('conectando');

      // La confirmación se pide de una: lo que se escalona es el revelado, no la red.
      // Si esto tardara más que la animación, la pantalla espera — nunca al revés.
      // Es idempotente, así que reintentarla es seguro.
      const confirmada = await confirmarOrden(enviada.order_id);
      ordenRef.current = confirmada;
      setOrden(confirmada);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'No se pudo cursar tu orden. Intenta de nuevo.',
      );
      setFase('error');
      // Se habilita reintentar; `ordenRef` es lo que evita que ese reintento duplique.
      yaCurso.current = false;
    }
  }, [proposalId]);

  useEffect(() => {
    void cursar();
  }, [cursar]);

  // El comprobante recién se ofrece cuando el banco respondió Y la animación terminó de
  // mostrarlo: adelantarse sería contar el final antes de que se vea.
  useEffect(() => {
    if (
      orden?.estado === 'confirmed' &&
      revelados >= orden.lineas.length &&
      orden.lineas.length > 0
    ) {
      setFase('listo');
    }
  }, [orden, revelados]);

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <ErrorEstado mensaje={error} onReintentar={() => void cursar()} />
      </SafeAreaView>
    );
  }

  if (!orden) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-surface-background">
        <ActivityIndicator size="large" color={colores.primario} />
        <Text className="text-body text-text-secondary">Preparando tus órdenes…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-canvas">
      <ScrollView contentContainerClassName="px-5 py-6 gap-4">
        <View className="items-center gap-2 py-2">
          <View
            className={`h-16 w-16 items-center justify-center rounded-full ${
              listo ? 'bg-stateAlpha-successSoft' : 'bg-brandAlpha-primarySoft'
            }`}
          >
            <Ionicons
              name={listo ? 'checkmark-done' : 'swap-horizontal'}
              size={30}
              color={listo ? colores.exito : colores.primario}
            />
          </View>
          <Text className="text-heading font-bold text-text-primary">
            {listo ? 'Tu dinero está trabajando' : 'Conectando con tus instituciones'}
          </Text>
          <Text className="text-center text-body text-text-secondary">
            {listo
              ? `${orden.lineas.length} ${
                  orden.lineas.length === 1 ? 'orden confirmada' : 'órdenes confirmadas'
                }, cada una con su referencia.`
              : `Tu cartera se reparte en ${orden.lineas.length} ${
                  orden.lineas.length === 1 ? 'institución' : 'instituciones'
                }: cada una recibe su propia orden.`}
          </Text>
        </View>

        <View className="gap-2">
          {orden.lineas.map((linea, i) => (
            <FilaBanco
              key={linea.item_id}
              linea={linea}
              confirmada={linea.estado === 'confirmed' && i < revelados}
            />
          ))}
        </View>

        {/* Lo que se cobra, dicho acá y no solo en el comprobante: el usuario tiene que
            poder verlo ANTES de que la pantalla lo felicite. */}
        <View className="gap-3 rounded-2xl border border-surface-border bg-surface-background p-5">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-body-md text-text-primary">Tú pagas</Text>
            <Text className="text-body-md font-bold text-state-success">USD 0</Text>
          </View>

          <View className="h-px bg-surface-border" />

          {/* Con la cuenta a la vista, igual que en el comprobante. */}
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-body text-text-secondary">
                La institución le paga a Brokeate
              </Text>
              <Text className="text-caption text-text-muted">
                {porcentaje(orden.comision_bps / 100)} de {usd(orden.monto_total)}
              </Text>
            </View>
            <Text className="text-body-md font-bold text-text-primary">
              {usd(orden.comision_total)}
            </Text>
          </View>
        </View>

        {listo ? (
          <Boton
            titulo="Ver mi comprobante"
            onPress={() =>
              // `replace` y no `navigate`: volver atrás desde el comprobante tiene que
              // llevar a la propuesta, no a esta pantalla — que ya cumplió y que, si se
              // remontara, intentaría cursar una orden que ya existe.
              navigation.replace('Comprobante', { orderId: orden.order_id })
            }
          />
        ) : null}

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
