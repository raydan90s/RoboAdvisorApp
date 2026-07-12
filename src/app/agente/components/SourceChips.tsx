import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';

import { useColores } from '@/context/ThemeContext';

import type { SourceChip } from '../services/agentApi';

/**
 * Los "source chips": debajo de cada respuesta del asistente, de dónde salió cada dato.
 *
 * Es el diferenciador del proyecto y la respuesta visual al criterio de antialucinación:
 * cada afirmación de la IA se puede verificar con un tap. El chip ya trae su `label`
 * listo (lo arma el backend); al tocarlo se abre el detalle con la tabla de origen.
 */

// Nombre legible de la tabla que respalda el dato.
const FUENTE: Record<string, string> = {
  proposal_items: 'De tu propuesta',
  scoring_rules: 'De las reglas de tu perfil',
  instruments: 'Del catálogo de productos',
  institutions: 'Del catálogo de emisores',
  // Mercados externos (Rutas B/C): fuera del catálogo del banco, por eso el nombre
  // de la fuente lo dice explícito en vez de sonar a producto propio.
  alpha_vantage: 'De Alpha Vantage (mercado externo, no es del banco)',
  // Noticias (Ruta D): titular de un medio externo. El chip abre la nota original.
  gnews: 'Noticia — abre la fuente',
};

// Los chips de mercado se pintan en ámbar (mismo lenguaje visual que la burbuja) en
// vez del azul de marca: refuerzan que el dato es una simulación, no del catálogo.
const esFuenteExterna = (table: string) => table === 'alpha_vantage';

// Los chips de noticia NO abren un detalle: llevan directo a la nota original.
const esNoticia = (table: string) => table === 'gnews';

export default function SourceChips({ sources }: { sources: SourceChip[] }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const colores = useColores();

  if (!sources.length) return null;

  return (
    <View className="mt-2 gap-2">
      <View className="flex-row flex-wrap gap-1.5">
        {sources.map((s) => {
          const activo = abierto === s.record_id;
          const externa = esFuenteExterna(s.table);
          const noticia = esNoticia(s.table);
          const abrir = () => {
            // Una noticia lleva directo a su fuente; el resto abre el detalle inline.
            if (noticia && s.record_id.startsWith('http')) {
              void Linking.openURL(s.record_id);
            } else {
              setAbierto(activo ? null : s.record_id);
            }
          };
          return (
            <TouchableOpacity
              key={`${s.table}-${s.record_id}`}
              activeOpacity={0.7}
              onPress={abrir}
              className={`flex-row items-center gap-1 rounded-full border px-2.5 py-1 ${
                externa
                  ? activo
                    ? 'border-state-warning bg-stateAlpha-warningSoft'
                    : 'border-state-warning bg-stateAlpha-warningSoft'
                  : activo
                    ? 'border-brand-primary bg-brandAlpha-primaryMedium'
                    : 'border-brandAlpha-primaryMedium bg-brandAlpha-primarySoft'
              }`}
            >
              <Ionicons
                name={
                  noticia ? 'open-outline' : externa ? 'trending-up-outline' : 'document-text-outline'
                }
                size={11}
                color={externa ? colores.advertencia : colores.primario}
              />
              <Text
                className={`text-caption font-semibold ${externa ? 'text-state-warning' : 'text-brand-primary'}`}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {abierto
        ? sources
            .filter((s) => s.record_id === abierto)
            .map((s) => (
              <View
                key={`detalle-${s.table}-${s.record_id}`}
                className="gap-1 rounded-xl border border-surface-border bg-surface-elevated p-3"
              >
                <View className="flex-row items-center gap-1.5">
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={13}
                    color={colores.exito}
                  />
                  <Text className="text-caption font-bold uppercase text-text-secondary">
                    {FUENTE[s.table] ?? 'Dato verificado'}
                  </Text>
                </View>
                <Text className="text-body text-text-primary">{s.label}</Text>
                <Text className="text-caption text-text-muted">
                  Fuente: {s.table} · {s.record_id}
                </Text>
              </View>
            ))
        : null}
    </View>
  );
}
