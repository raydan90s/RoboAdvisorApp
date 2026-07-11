import { Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import type { AssetAllocation } from '../types/inversionista';

/** Un color por línea. El orden es estable: la leyenda y el donut siempre coinciden. */
export const COLORES = ['#1E3A8A', '#84CC16', '#0891B2', '#7C3AED', '#D97706'];

interface DonutProps {
  allocations: AssetAllocation[];
  /** Se pinta en el centro: el monto total del que salen todos los porcentajes. */
  centro: string;
  etiquetaCentro: string;
}

const RADIO = 62;
const GROSOR = 22;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;
const LADO = (RADIO + GROSOR / 2) * 2;

/**
 * Los porcentajes vienen de `allocation_template_items` vía la API. Este componente los
 * dibuja; no los normaliza ni los redondea, porque hacerlo escondería un error de datos
 * (si no suman 100, se ve el hueco — y eso es preferible a un donut que miente).
 */
export default function DonutPortafolio({
  allocations,
  centro,
  etiquetaCentro,
}: DonutProps) {
  let acumulado = 0;

  return (
    <View className="items-center gap-4">
      <View className="items-center justify-center">
        <Svg width={LADO} height={LADO}>
          {/* -90°: el primer arco arranca arriba, no a las 3 en punto. */}
          <G rotation={-90} originX={LADO / 2} originY={LADO / 2}>
            <Circle
              cx={LADO / 2}
              cy={LADO / 2}
              r={RADIO}
              stroke="#F4F4F5"
              strokeWidth={GROSOR}
              fill="none"
            />
            {allocations.map((linea, i) => {
              const largo = (linea.porcentaje / 100) * CIRCUNFERENCIA;
              const offset = -(acumulado / 100) * CIRCUNFERENCIA;
              acumulado += linea.porcentaje;

              return (
                <Circle
                  key={linea.instrumento_code}
                  cx={LADO / 2}
                  cy={LADO / 2}
                  r={RADIO}
                  stroke={COLORES[i % COLORES.length]}
                  strokeWidth={GROSOR}
                  strokeDasharray={`${largo} ${CIRCUNFERENCIA - largo}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                  fill="none"
                />
              );
            })}
          </G>
        </Svg>

        <View className="absolute items-center">
          <Text className="text-caption uppercase text-text-muted">{etiquetaCentro}</Text>
          <Text className="text-title font-bold text-text-primary">{centro}</Text>
        </View>
      </View>

      <View className="w-full gap-2">
        {allocations.map((linea, i) => (
          <View key={linea.instrumento_code} className="flex-row items-center gap-2">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: COLORES[i % COLORES.length] }}
            />
            <Text className="flex-1 text-body text-text-secondary" numberOfLines={1}>
              {linea.nombre}
            </Text>
            <Text className="text-body font-bold text-text-primary">
              {linea.porcentaje}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
