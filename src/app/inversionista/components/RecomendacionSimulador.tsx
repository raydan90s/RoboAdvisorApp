import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import SourceChips from '@/app/agente/components/SourceChips';
import type { SimuladorResponse } from '@/app/agente/services/agentApi';
import { COLORES } from '@/constants/colores';

interface Props {
  recomendacion: SimuladorResponse | null;
  cargando: boolean;
  error: string | null;
  /** Deshabilitado mientras no haya un monto válido que simular. */
  habilitado: boolean;
  onPedir: () => void;
}

/**
 * La recomendación de IA del simulador.
 *
 * El reparto de trabajo es el mismo de siempre y acá se ve literal: **el motor elige y la
 * IA explica**. La opción recomendada la marca el backend (`recomendado` en la fila del
 * catálogo) y es la que la tarjeta de arriba destaca; este texto solo la pone en palabras
 * y, si el usuario se cambió a otro banco o a otro fondo, dice qué gana y qué cede.
 *
 * No se pide sola: es un botón. Una llamada al LLM por cada tecla del monto sería cara y,
 * peor, dejaría en pantalla un consejo que habla de cifras que ya cambiaron. Por eso el
 * texto se borra en cuanto el usuario mueve el monto, el plazo o la selección: una
 * recomendación vieja al lado de números nuevos es la forma más fácil de mentir sin
 * inventar nada.
 */
export default function RecomendacionSimulador({
  recomendacion,
  cargando,
  error,
  habilitado,
  onPedir,
}: Props) {
  if (cargando) {
    return (
      <View className="flex-row items-center gap-3 rounded-2xl bg-brandAlpha-primarySoft p-5">
        <ActivityIndicator color={COLORES.primario} />
        <Text className="text-body text-text-secondary">
          Analizando las opciones del catálogo…
        </Text>
      </View>
    );
  }

  if (!recomendacion) {
    return (
      <View className="gap-3 rounded-2xl bg-brandAlpha-primarySoft p-5">
        <View className="flex-row items-center gap-2">
          <Ionicons name="sparkles" size={16} color={COLORES.primario} />
          <Text className="text-caption font-bold uppercase text-brand-primary">
            Recomendación con IA
          </Text>
        </View>
        <Text className="text-body leading-5 text-text-secondary">
          El asistente compara todas las opciones del catálogo con tu monto y tu perfil, y
          te explica cuál conviene y por qué.
        </Text>

        {error ? (
          <View className="rounded-xl bg-stateAlpha-errorSoft px-3 py-2">
            <Text className="text-caption text-state-error">{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={onPedir}
          disabled={!habilitado}
          activeOpacity={0.85}
          accessibilityRole="button"
          className={`flex-row items-center justify-center gap-2 rounded-xl py-3 ${
            habilitado ? 'bg-brand-primary' : 'bg-surface-secondary'
          }`}
        >
          <Ionicons
            name="sparkles"
            size={15}
            color={habilitado ? '#FFFFFF' : COLORES.textoMuted}
          />
          <Text
            className={`text-body font-bold ${
              habilitado ? 'text-text-onPrimary' : 'text-text-muted'
            }`}
          >
            {error ? 'Reintentar' : 'Recomiéndame una opción'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // La plantilla determinista es una respuesta legítima (el proveedor de IA puede estar
  // caído o haber alucinado dos veces), pero el usuario merece saber que la escribió el
  // motor y no el modelo. No se disfraza.
  const esPlantilla = recomendacion.modelo === 'plantilla-determinista';
  const parrafos = recomendacion.texto.split('\n').filter((l) => l.trim().length > 0);

  return (
    <View className="gap-3 rounded-2xl bg-brandAlpha-primarySoft p-5">
      <View className="flex-row items-center gap-2">
        <Ionicons name="sparkles" size={16} color={COLORES.primario} />
        <Text className="flex-1 text-caption font-bold uppercase text-brand-primary">
          Recomendación con IA
        </Text>
        <TouchableOpacity
          onPress={onPedir}
          activeOpacity={0.7}
          accessibilityRole="button"
          className="flex-row items-center gap-1"
        >
          <Ionicons name="refresh" size={13} color={COLORES.primario} />
          <Text className="text-caption font-bold text-brand-primary">Otra vez</Text>
        </TouchableOpacity>
      </View>

      {parrafos.map((linea, i) => (
        <Text key={i} className="text-body leading-5 text-text-primary">
          {linea}
        </Text>
      ))}

      <SourceChips sources={recomendacion.sources} />

      <View className="flex-row items-center gap-1.5 border-t border-brandAlpha-primaryMedium pt-2">
        <Ionicons
          name={recomendacion.guardrail_passed ? 'shield-checkmark' : 'alert-circle'}
          size={12}
          color={recomendacion.guardrail_passed ? COLORES.exito : COLORES.advertencia}
        />
        <Text className="flex-1 text-caption text-text-muted">
          {recomendacion.guardrail_passed
            ? 'Cada cifra citada existe en el catálogo: el validador del banco revisó el texto.'
            : 'El texto no pasó el validador del banco.'}
          {esPlantilla ? ' Lo escribió el motor, no el modelo.' : ` · ${recomendacion.modelo}`}
        </Text>
      </View>
    </View>
  );
}
