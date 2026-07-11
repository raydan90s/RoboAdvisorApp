import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import AgentSheet from './AgentSheet';

/**
 * El botón flotante que abre el asistente. Autocontenido: se suelta en cualquier
 * pantalla del inversionista y él solo maneja la hoja modal.
 *
 * Si se le pasa `sessionId`, la conversación es sobre esa subcuenta (lo usa el botón
 * "conversar sobre esta subcuenta"); sin él, el backend toma la sesión más reciente.
 */
export default function AgenteFab({
  sessionId,
  bottom = 24,
}: {
  sessionId?: string;
  /** Separación desde abajo. Se sube cuando la pantalla tiene una barra sticky. */
  bottom?: number;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setAbierto(true)}
        activeOpacity={0.85}
        accessibilityLabel="Abrir el asistente"
        style={{
          position: 'absolute',
          right: 20,
          bottom,
          shadowColor: '#1E3A8A',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
        }}
        className="h-14 w-14 items-center justify-center rounded-full bg-brand-primary"
      >
        <Ionicons name="sparkles" size={24} color="#FFFFFF" />
        {/* Puntito de acento: da la sensación de "vivo". */}
        <View className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full border-2 border-brand-primary bg-brand-accent" />
      </TouchableOpacity>

      <AgentSheet visible={abierto} onClose={() => setAbierto(false)} sessionId={sessionId} />
    </>
  );
}
