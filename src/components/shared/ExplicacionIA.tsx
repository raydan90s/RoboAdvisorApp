import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { COLORES } from '@/constants/colores';
import { formatearExplicacion } from '@/utils/explicacion';

interface Props {
  texto: string;
  /** "Por qué esta propuesta" para el cliente; el asesor lee la misma explicación con otro rótulo. */
  titulo?: string;
  /** El asesor audita: al expandir tiene que ver el texto íntegro, disclaimer incluido. */
  conservarDisclaimer?: boolean;
}

/**
 * La explicación del LLM, legible.
 *
 * El backend la devuelve como un párrafo único de hasta ~130 palabras (y la plantilla de
 * respaldo, como una sola frase con toda la cartera encadenada). Puesta tal cual en la
 * pantalla era el bloque más largo de la app, justo arriba de las tarjetas que repiten los
 * mismos datos ya formateados — así que casi nadie lo iba a leer.
 *
 * Acá se muestra la primera frase y se guarda el resto tras "Ver explicación completa". El
 * texto no se reescribe ni se acorta con otras palabras: lo que se ve es literal, porque el
 * guardarraíl validó **ese** texto y no una paráfrasis nuestra. Eso importa doble en la
 * pantalla del asesor: lo que expande es, palabra por palabra, lo que leyó su cliente.
 */
export default function ExplicacionIA({
  texto,
  titulo = 'Por qué esta propuesta',
  conservarDisclaimer = false,
}: Props) {
  const { resumen, detalle } = useMemo(
    () => formatearExplicacion(texto, { conservarDisclaimer }),
    [texto, conservarDisclaimer]
  );
  const [abierto, setAbierto] = useState(false);

  if (!resumen) return null;

  const hayMas = detalle.length > 0;

  return (
    <View className="gap-3 rounded-2xl bg-brandAlpha-primarySoft p-5">
      <View className="flex-row items-center gap-2">
        <Ionicons name="sparkles" size={16} color={COLORES.primario} />
        <Text className="text-caption font-bold uppercase text-brand-primary">{titulo}</Text>
      </View>

      <Text className="text-body leading-5 text-text-primary">{resumen}</Text>

      {hayMas && abierto ? (
        <View className="gap-3">
          {detalle.map((bloque, i) =>
            bloque.tipo === 'parrafo' ? (
              <Text key={i} className="text-body leading-5 text-text-primary">
                {bloque.texto}
              </Text>
            ) : (
              <View key={i} className="gap-2">
                {bloque.items.map((item) => (
                  <View key={item} className="flex-row gap-2">
                    <Text className="text-body leading-5 text-brand-primary">•</Text>
                    <Text className="flex-1 text-body leading-5 text-text-primary">
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            )
          )}
        </View>
      ) : null}

      {hayMas ? (
        <TouchableOpacity
          onPress={() => setAbierto((v) => !v)}
          activeOpacity={0.7}
          accessibilityRole="button"
          className="flex-row items-center gap-1 self-start"
        >
          <Text className="text-caption font-bold text-brand-primary">
            {abierto ? 'Ver menos' : 'Ver explicación completa'}
          </Text>
          <Ionicons
            name={abierto ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={COLORES.primario}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
