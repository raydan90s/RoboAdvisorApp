import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

import { useColores } from '@/context/ThemeContext';

import type { AgentChatResponse, SourceChip } from '../services/agentApi';
import SourceChips from './SourceChips';

/** Un mensaje del hilo. El asistente puede traer fuentes citables. */
export interface Mensaje {
  id: string;
  role: 'user' | 'assistant';
  texto: string;
  sources?: SourceChip[];
  /** Qué modelo redactó la respuesta (gpt-4o-mini, gemini-…, plantilla, refuse). */
  modelo?: string;
  /** La ruta del router (ver `agentApi.ts`): "bancario" | "asesoria" | "mixto" | … */
  ruta?: AgentChatResponse['ruta'];
  /** Mientras se espera la respuesta del backend: muestra los puntitos. */
  pending?: boolean;
  /** La respuesta fue un error de red/servidor, no del agente. */
  error?: boolean;
}

/** Tres puntitos que laten mientras el asistente "escribe". */
function TypingDots() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const animaciones = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(d, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ]),
      ),
    );
    animaciones.forEach((a) => a.start());
    return () => animaciones.forEach((a) => a.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="flex-row items-center gap-1 py-1">
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={{ opacity: d }}
          className="h-2 w-2 rounded-full bg-text-muted"
        />
      ))}
    </View>
  );
}

/** Avatar del asistente: cuadrito con brillo, en el azul de marca. */
function AvatarAsistente() {
  const colores = useColores();

  return (
    <View className="h-8 w-8 items-center justify-center rounded-xl bg-brandAlpha-primarySoft">
      <Ionicons name="sparkles" size={15} color={colores.primario} />
    </View>
  );
}

export default function Burbuja({ mensaje }: { mensaje: Mensaje }) {
  const esUsuario = mensaje.role === 'user';

  if (esUsuario) {
    return (
      <View className="mb-3 flex-row justify-end">
        <View className="max-w-[82%] rounded-2xl rounded-br-md bg-brand-primary px-4 py-2.5">
          <Text className="text-body text-text-onPrimary">{mensaje.texto}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-3 flex-row items-end gap-2">
      <AvatarAsistente />
      <View className="max-w-[82%] flex-1">
        <View
          className={`self-start rounded-2xl rounded-bl-md border border-transparent px-4 py-2.5 ${
            mensaje.error ? 'bg-stateAlpha-errorSoft' : 'bg-surface-secondary'
          }`}
        >
          {mensaje.pending ? (
            <TypingDots />
          ) : (
            <Text
              className={`text-body ${mensaje.error ? 'text-state-error' : 'text-text-primary'}`}
            >
              {mensaje.texto}
            </Text>
          )}
        </View>

        {mensaje.sources?.length ? <SourceChips sources={mensaje.sources} /> : null}
      </View>
    </View>
  );
}
