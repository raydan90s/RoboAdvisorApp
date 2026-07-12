import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

import type { SourceChip } from '../services/agentApi';
import SourceChips from './SourceChips';

/** Un mensaje del hilo. El asistente puede traer fuentes citables. */
export interface Mensaje {
  id: string;
  role: 'user' | 'assistant';
  texto: string;
  sources?: SourceChip[];
  /** Qué modelo redactó la respuesta (gpt-4o-mini, gemini-…, plantilla, refuse). */
  modelo?: string;
  /**
   * La ruta del router: "bancario" | "mixto" | "externo" | "rechazo". "mixto" y
   * "externo" citan instrumentos de Alpha Vantage — FUERA del catálogo del banco —,
   * así que la burbuja se pinta distinto (borde ámbar + ícono de aviso).
   */
  ruta?: 'bancario' | 'mixto' | 'externo' | 'rechazo';
  /** Mientras se espera la respuesta del backend: muestra los puntitos. */
  pending?: boolean;
  /** La respuesta fue un error de red/servidor, no del agente. */
  error?: boolean;
}

// Etiqueta legible del modelo que contestó. Es la prueba visible de qué proveedor
// respondió cada turno.
function etiquetaModelo(modelo: string): string | null {
  if (modelo === 'refuse') return null; // rechazo por alcance: no viene de un modelo
  if (modelo === 'plantilla-determinista') return 'plantilla (sin IA)';
  return modelo;
}

/** true si la ruta cita mercados externos (Alpha Vantage), simulados y fuera del banco. */
function esRutaExterna(ruta?: Mensaje['ruta']): boolean {
  return ruta === 'mixto' || ruta === 'externo';
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
  return (
    <View className="h-8 w-8 items-center justify-center rounded-xl bg-brandAlpha-primarySoft">
      <Ionicons name="sparkles" size={15} color="#1E3A8A" />
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

  const externa = esRutaExterna(mensaje.ruta);

  return (
    <View className="mb-3 flex-row items-end gap-2">
      <AvatarAsistente />
      <View className="max-w-[82%] flex-1">
        <View
          className={`self-start rounded-2xl rounded-bl-md border px-4 py-2.5 ${
            mensaje.error
              ? 'border-transparent bg-stateAlpha-errorSoft'
              : externa
                ? 'border-state-warning bg-stateAlpha-warningSoft'
                : 'border-transparent bg-surface-secondary'
          }`}
        >
          {mensaje.pending ? (
            <TypingDots />
          ) : (
            <>
              {/* Aviso obligatorio de las Rutas B/C: instrumento simulado, fuera del
                  catálogo del banco. Va ANTES del texto para que no pase inadvertido. */}
              {externa ? (
                <View className="mb-1.5 flex-row items-center gap-1.5">
                  <Ionicons name="alert-circle" size={13} color="#C77700" />
                  <Text className="text-caption font-bold uppercase text-state-warning">
                    Simulación educativa · fuera del banco
                  </Text>
                </View>
              ) : null}
              <Text
                className={`text-body ${mensaje.error ? 'text-state-error' : 'text-text-primary'}`}
              >
                {mensaje.texto}
              </Text>
            </>
          )}
        </View>

        {/* Prueba de qué modelo contestó este turno. */}
        {!mensaje.pending && mensaje.modelo && etiquetaModelo(mensaje.modelo) ? (
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="hardware-chip-outline" size={10} color="#A1A1AA" />
            <Text className="text-caption text-text-muted">
              vía {etiquetaModelo(mensaje.modelo)}
            </Text>
          </View>
        ) : null}

        {mensaje.sources?.length ? <SourceChips sources={mensaje.sources} /> : null}
      </View>
    </View>
  );
}
