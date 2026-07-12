import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import ProviderSelector from '@/app/agente/components/ProviderSelector';
import SourceChips from '@/app/agente/components/SourceChips';
import { getProviders } from '@/app/agente/services/agentApi';
import type { ProviderInfo, SimuladorResponse } from '@/app/agente/services/agentApi';
import { useColores } from '@/context/ThemeContext';

interface Props {
  recomendacion: SimuladorResponse | null;
  cargando: boolean;
  error: string | null;
  /** Deshabilitado mientras no haya un monto válido que simular. */
  habilitado: boolean;
  /** Qué le falta al usuario para poder pedirla. Solo se ve con `habilitado` en false. */
  pista?: string;
  /** Pide la recomendación. `provider` = el motor de IA elegido (undefined = el default). */
  onPedir: (provider?: string) => void;
}

/**
 * La recomendación de IA sobre el catálogo. La comparten el simulador y el comparador:
 * las dos pantallas muestran las mismas filas de `/api/catalog/rates`, así que el consejo
 * que las explica es literalmente el mismo componente y el mismo endpoint.
 *
 * El reparto de trabajo es el de siempre y acá se ve literal: **el motor elige y la IA
 * explica**. La opción recomendada la marca el backend (`recomendado` en la fila del
 * catálogo) y es la que la pantalla destaca; este texto solo la pone en palabras y, si el
 * usuario se cambió a otro banco o a otro fondo, dice qué gana y qué cede.
 *
 * No se pide sola: es un botón. Una llamada al LLM por cada tecla del monto sería cara y,
 * peor, dejaría en pantalla un consejo que habla de cifras que ya cambiaron. Por eso quien
 * lo usa borra el texto en cuanto el usuario mueve el monto, el plazo o la selección: una
 * recomendación vieja al lado de números nuevos es la forma más fácil de mentir sin
 * inventar nada.
 */
export default function RecomendacionIA({
  recomendacion,
  cargando,
  error,
  habilitado,
  pista,
  onPedir,
}: Props) {
  const colores = useColores();
  // El motor de IA con el que se (re)genera esta recomendación. Mismo patrón que el
  // selector del chat: se puede correr la MISMA recomendación con otro motor.
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [proveedor, setProveedor] = useState<string | null>(null);

  const cargarProviders = useCallback(() => {
    getProviders()
      .then((lista) => {
        setProviders(lista);
        setProveedor((actual) => {
          if (actual && lista.some((p) => p.id === actual && p.disponible)) return actual;
          const def =
            lista.find((p) => p.es_default && p.disponible) ?? lista.find((p) => p.disponible);
          return def?.id ?? null;
        });
      })
      .catch(() => {
        /* si falla, el combo no aparece y se usa el default del backend */
      });
  }, []);

  useEffect(() => {
    cargarProviders();
  }, [cargarProviders]);

  // Cambiar de motor RE-EJECUTA la misma recomendación con ese motor (los datos no cambian).
  const cambiarMotor = (id: string) => {
    setProveedor(id);
    onPedir(id);
  };

  if (cargando) {
    return (
      <View className="flex-row items-center gap-3 rounded-2xl bg-brandAlpha-primarySoft p-5">
        <ActivityIndicator color={colores.primario} />
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
          <Ionicons name="sparkles" size={16} color={colores.primario} />
          <Text className="text-caption font-bold uppercase text-brand-primary">
            Recomendación con IA
          </Text>
        </View>
        {/* "las opciones de abajo", no "todo el catálogo": el comparador filtra por plazo
            y la IA solo ve lo filtrado. La frase tiene que ser cierta en las dos pantallas. */}
        <Text className="text-body leading-5 text-text-secondary">
          El asistente compara las opciones de abajo con tu monto y tu perfil, y te explica
          cuál conviene y por qué.
        </Text>

        {error ? (
          <View className="rounded-xl bg-stateAlpha-errorSoft px-3 py-2">
            <Text className="text-caption text-state-error">{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={() => onPedir(proveedor ?? undefined)}
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
            color={habilitado ? colores.textoSobrePrimario : colores.textoMuted}
          />
          <Text
            className={`text-body font-bold ${
              habilitado ? 'text-text-onPrimary' : 'text-text-muted'
            }`}
          >
            {error ? 'Reintentar' : 'Recomiéndame una opción'}
          </Text>
        </TouchableOpacity>

        {/* Un botón gris sin explicación es un callejón sin salida: se dice qué falta. */}
        {!habilitado && pista ? (
          <Text className="text-center text-caption text-text-muted">{pista}</Text>
        ) : null}
      </View>
    );
  }

  // La plantilla determinista es una respuesta legítima (el proveedor de IA puede estar
  // caído o haber alucinado dos veces): se avisa que la escribió el motor, sin nombrar el
  // modelo — qué proveedor contestó no se muestra por turno (se elige en el selector).
  const esPlantilla = recomendacion.modelo === 'plantilla-determinista';
  const parrafos = recomendacion.texto.split('\n').filter((l) => l.trim().length > 0);

  return (
    <View className="gap-3 rounded-2xl bg-brandAlpha-primarySoft p-5">
      <View className="flex-row flex-wrap items-center gap-2">
        <Ionicons name="sparkles" size={16} color={colores.primario} />
        <Text className="flex-1 text-caption font-bold uppercase text-brand-primary">
          Recomendación con IA
        </Text>
        {/* Combo de motor: correr la MISMA recomendación con otro modelo de IA. */}
        {providers.length ? (
          <ProviderSelector
            providers={providers}
            value={proveedor}
            onChange={cambiarMotor}
            onOpen={cargarProviders}
          />
        ) : null}
        <TouchableOpacity
          onPress={() => onPedir(proveedor ?? undefined)}
          activeOpacity={0.7}
          accessibilityRole="button"
          className="flex-row items-center gap-1"
        >
          <Ionicons name="refresh" size={13} color={colores.primario} />
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
          color={recomendacion.guardrail_passed ? colores.exito : colores.advertencia}
        />
        <Text className="flex-1 text-caption text-text-muted">
          {recomendacion.guardrail_passed
            ? 'Cada cifra citada existe en el catálogo: el validador del banco revisó el texto.'
            : 'El texto no pasó el validador del banco.'}
          {esPlantilla ? ' Lo escribió el motor, no el modelo.' : ''}
        </Text>
      </View>
    </View>
  );
}
