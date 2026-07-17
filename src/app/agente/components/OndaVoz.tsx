import { useEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';

/**
 * La onda que prueba que el micrófono está oyendo.
 *
 * No es decorativa: `nivel` viene del evento `volumechange` de
 * `expo-speech-recognition`, o sea del volumen REAL del micrófono. Si el usuario se
 * calla, las barras caen; si el teléfono no está capturando, se quedan planas. Eso lo
 * vuelve un diagnóstico además de un adorno — una onda que baila sola con el micrófono
 * muerto sería peor que no tener animación, porque mentiría.
 *
 * El movimiento sale de multiplicar dos cosas: el nivel (tu voz) por una oscilación
 * propia de cada barra (el "baile"). Sin la oscilación, todas las barras subirían y
 * bajarían idénticas, como un volumen, no como una voz.
 *
 * Todo corre con `useNativeDriver`: `nivel` es un Animated.Value que el padre setea
 * ~10 veces por segundo. Si esto pasara por estado de React serían 10 renders/seg del
 * árbol entero.
 */

const BARRAS = 21;
/** Lo que se ve cuando no hay nada que oír: una línea, no un vacío. */
const PISO = 0.06;

/** Campana: las barras del centro llegan más alto que las de las puntas, como una voz
 *  vista en un osciloscopio. Sin esto es un ecualizador de barras parejas. */
function campana(i: number): number {
  const centro = (BARRAS - 1) / 2;
  const d = (i - centro) / centro; // -1 … 0 … 1
  return 0.25 + 0.75 * Math.cos((d * Math.PI) / 2) ** 2;
}

export default function OndaVoz({
  nivel,
  color,
  altura = 56,
}: {
  /** 0…1. El volumen del micrófono ya normalizado por el padre. */
  nivel: Animated.Value;
  color: string;
  /** Alto en px. Dentro de la barra del chat va chica (~26); suelta, grande. */
  altura?: number;
}) {
  // Una oscilación por barra, cada una con su propio período: es lo que hace que la
  // onda se lea como voz y no como un volumen subiendo en bloque.
  const osc = useRef(
    Array.from({ length: BARRAS }, () => new Animated.Value(0.55)),
  ).current;

  useEffect(() => {
    const bucles = osc.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: 260 + ((i * 37) % 220),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.55,
            duration: 300 + ((i * 53) % 260),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    bucles.forEach((b) => b.start());
    return () => bucles.forEach((b) => b.stop());
  }, [osc]);

  const escalas = useMemo(
    () =>
      osc.map((o, i) =>
        Animated.multiply(
          nivel.interpolate({
            inputRange: [0, 1],
            outputRange: [PISO, campana(i)],
            extrapolate: 'clamp',
          }),
          o,
        ),
      ),
    [nivel, osc],
  );

  return (
    <View
      className="flex-row items-center justify-center gap-1"
      style={{ height: altura }}
    >
      {escalas.map((escala, i) => (
        <Animated.View
          key={i}
          style={{
            height: altura,
            width: 3,
            borderRadius: 999,
            backgroundColor: color,
            // Las puntas más tenues: la onda se funde con el fondo en vez de cortarse.
            opacity: 0.35 + 0.65 * campana(i),
            transform: [{ scaleY: escala }],
          }}
        />
      ))}
    </View>
  );
}
