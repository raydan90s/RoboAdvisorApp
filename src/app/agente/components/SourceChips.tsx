import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

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
};

export default function SourceChips({ sources }: { sources: SourceChip[] }) {
  const [abierto, setAbierto] = useState<string | null>(null);

  if (!sources.length) return null;

  return (
    <View className="mt-2 gap-2">
      <View className="flex-row flex-wrap gap-1.5">
        {sources.map((s) => {
          const activo = abierto === s.record_id;
          return (
            <TouchableOpacity
              key={`${s.table}-${s.record_id}`}
              activeOpacity={0.7}
              onPress={() => setAbierto(activo ? null : s.record_id)}
              className={`flex-row items-center gap-1 rounded-full border px-2.5 py-1 ${
                activo
                  ? 'border-brand-primary bg-brandAlpha-primaryMedium'
                  : 'border-brandAlpha-primaryMedium bg-brandAlpha-primarySoft'
              }`}
            >
              <Ionicons name="document-text-outline" size={11} color="#1E3A8A" />
              <Text className="text-caption font-semibold text-brand-primary">
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
                  <Ionicons name="shield-checkmark-outline" size={13} color="#84CC16" />
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
