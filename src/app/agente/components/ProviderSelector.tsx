import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';

import type { ProviderInfo } from '../services/agentApi';

/**
 * Selector de proveedor de IA en el header del asistente. Cambia el modelo en tiempo
 * real: lo elegido viaja con cada mensaje. Solo se pueden elegir los que tienen key
 * (el backend nunca manda las keys, solo si existen).
 */

// Identidad visual de cada proveedor (nombre corto + color de marca).
const META: Record<string, { label: string; color: string }> = {
  google: { label: 'Gemini', color: '#4285F4' },
  openai: { label: 'OpenAI', color: '#10A37F' },
  anthropic: { label: 'Claude', color: '#D97757' },
};

const meta = (id: string) => META[id] ?? { label: id, color: '#71717A' };

interface Props {
  providers: ProviderInfo[];
  value: string | null;
  onChange: (id: string) => void;
  /** Se llama al abrir el menú: re-consulta el catálogo (disponibilidad en vivo). */
  onOpen?: () => void;
}

export default function ProviderSelector({ providers, value, onChange, onOpen }: Props) {
  const [abierto, setAbierto] = useState(false);

  const abrir = () => {
    onOpen?.();
    setAbierto(true);
  };

  if (!providers.length) return null;

  const activo = value ?? providers.find((p) => p.es_default)?.id ?? providers[0].id;
  const m = meta(activo);

  return (
    <>
      {/* Chip compacto: puntito de color + nombre + chevron */}
      <TouchableOpacity
        onPress={abrir}
        activeOpacity={0.7}
        className="flex-row items-center gap-1.5 rounded-full border border-surface-border bg-surface-secondary px-2.5 py-1.5"
      >
        <View style={{ backgroundColor: m.color }} className="h-2.5 w-2.5 rounded-full" />
        <Text className="text-caption font-semibold text-text-primary">{m.label}</Text>
        <Ionicons name="chevron-down" size={12} color="#71717A" />
      </TouchableOpacity>

      {/* Menú */}
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable
          onPress={() => setAbierto(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
          className="items-center justify-center px-8"
        >
          <View className="w-full max-w-sm gap-1 rounded-2xl bg-surface-background p-3">
            <Text className="px-2 py-1 text-caption font-bold uppercase text-text-secondary">
              Modelo de IA
            </Text>
            {providers.map((p) => {
              const pm = meta(p.id);
              const seleccionado = p.id === activo;
              return (
                <TouchableOpacity
                  key={p.id}
                  disabled={!p.disponible}
                  activeOpacity={0.7}
                  onPress={() => {
                    onChange(p.id);
                    setAbierto(false);
                  }}
                  className={`flex-row items-center gap-3 rounded-xl px-3 py-2.5 ${
                    seleccionado ? 'bg-brandAlpha-primarySoft' : ''
                  } ${!p.disponible ? 'opacity-40' : ''}`}
                >
                  <View
                    style={{ backgroundColor: pm.color }}
                    className="h-8 w-8 items-center justify-center rounded-xl"
                  >
                    <Ionicons name="sparkles" size={15} color="#FFFFFF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-body-md font-bold text-text-primary">{pm.label}</Text>
                    <Text className="text-caption text-text-muted">
                      {p.disponible ? p.modelo : 'Sin API key configurada'}
                    </Text>
                  </View>
                  {seleccionado ? (
                    <Ionicons name="checkmark-circle" size={20} color="#1E3A8A" />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
