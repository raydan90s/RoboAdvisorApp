import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useColores } from '@/context/ThemeContext';

/**
 * Gráfico de líneas genérico, a mano con `react-native-svg` (mismo enfoque que
 * `DonutPortafolio`): el proyecto no trae una librería de charts, y agregar una solo
 * para una serie de precios sería una dependencia nueva por un componente que cabe en
 * ~60 líneas de SVG. Funciona igual en Expo web y nativo.
 */

export interface LineChartPoint {
  /** Eje X: ya viene formateado para mostrar (ver `fechaCorta`/similar del caller). */
  label: string;
  value: number;
}

interface Props {
  points: LineChartPoint[];
  /** Por defecto, el azul de marca del tema activo. */
  color?: string;
  height?: number;
  formatValue?: (valor: number) => string;
}

const ALTURA_DEFAULT = 160;
const PADDING_VERTICAL = 14;

export default function LineChart({
  points,
  color,
  height = ALTURA_DEFAULT,
  formatValue = (v) => v.toFixed(2),
}: Props) {
  const [ancho, setAncho] = useState(0);
  const colores = useColores();
  const trazo = color ?? colores.primario;

  function onLayout(e: LayoutChangeEvent) {
    setAncho(e.nativeEvent.layout.width);
  }

  if (points.length < 2) {
    return (
      <View style={{ height }} className="items-center justify-center">
        <Text className="text-caption text-text-muted">
          Sin datos suficientes para graficar.
        </Text>
      </View>
    );
  }

  const valores = points.map((p) => p.value);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;

  const coords = points.map((p, i) => ({
    x: ancho > 0 ? (i / (points.length - 1)) * ancho : 0,
    y: PADDING_VERTICAL + (1 - (p.value - min) / rango) * (height - PADDING_VERTICAL * 2),
  }));

  const linea = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
  const ultimoPunto = coords[coords.length - 1];
  const area = `${linea} L${ultimoPunto.x.toFixed(1)},${height} L0,${height} Z`;

  const primero = points[0];
  const ultimo = points[points.length - 1];
  const subio = ultimo.value >= primero.value;

  return (
    <View>
      <View className="flex-row items-baseline justify-between px-1 pb-2">
        <Text className="text-caption text-text-muted">{primero.label}</Text>
        <Text className="text-caption text-text-muted">{ultimo.label}</Text>
      </View>

      <View onLayout={onLayout} style={{ height }}>
        {ancho > 0 ? (
          <Svg width={ancho} height={height}>
            <Defs>
              <LinearGradient id="lineChartArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={trazo} stopOpacity={0.18} />
                <Stop offset="1" stopColor={trazo} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={area} fill="url(#lineChartArea)" stroke="none" />
            <Path
              d={linea}
              stroke={trazo}
              strokeWidth={2.5}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <Circle cx={ultimoPunto.x} cy={ultimoPunto.y} r={4} fill={trazo} />
          </Svg>
        ) : null}
      </View>

      <View className="flex-row items-baseline justify-between px-1 pt-2">
        <Text className="text-caption text-text-muted">Mín. {formatValue(min)}</Text>
        <Text
          className={`text-caption font-bold ${subio ? 'text-state-success' : 'text-state-error'}`}
        >
          Máx. {formatValue(max)}
        </Text>
      </View>
    </View>
  );
}
