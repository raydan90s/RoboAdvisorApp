import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColores } from '@/context/ThemeContext';
import { ApiError } from '@/services/http';

import {
  enviarMensaje,
  enviarMensajeHablado,
  getProviders,
  type ProviderInfo,
} from '../services/agentApi';
import { useHablar } from '../services/useHablar';
import BotonVoz from './BotonVoz';
import Burbuja, { type Mensaje } from './Burbuja';
import ProviderSelector from './ProviderSelector';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Subcuenta sobre la que se conversa. Sin ella, el backend usa la más reciente. */
  sessionId?: string;
}

// Preguntas de arranque: bajan la fricción y guían la demo hacia lo que el agente
// hace bien (explicar el perfil y la propuesta con fuentes).
const SUGERENCIAS = [
  '¿Cómo se calculó mi perfil?',
  '¿Por qué esta distribución?',
  '¿Qué riesgo tiene mi cartera?',
  '¿Cómo está el bitcoin hoy?',
];

const saludo = (): Mensaje => ({
  id: 'saludo',
  role: 'assistant',
  texto:
    'Hola 👋 Soy Broki, tu asistente en Brokeate. Puedo explicarte tu perfil de riesgo ' +
    'y tu propuesta de inversión, y mostrarte de dónde sale cada dato. ¿Qué te gustaría saber?',
});

let contador = 0;
const nuevoId = () => `m${++contador}`;

export default function AgentSheet({ visible, onClose, sessionId }: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([saludo()]);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [proveedor, setProveedor] = useState<string | null>(null);
  const [escuchando, setEscuchando] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const colores = useColores();
  const { hablar, callar, hablando, sinVoz } = useHablar();

  // Baja el scroll al último mensaje cada vez que llega uno.
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [mensajes]);

  // Re-consulta el catálogo (refleja cambios del .env sin reiniciar). Si el proveedor
  // elegido dejó de tener key, salta a uno disponible: nunca se queda uno inválido.
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
        /* si falla, el selector no aparece y se usa el default del .env */
      });
  }, []);

  // Al abrir el widget: catálogo fresco.
  useEffect(() => {
    if (visible) cargarProviders();
  }, [visible, cargarProviders]);

  // Cerrar el chat calla al asistente. El Modal solo se oculta —este componente sigue
  // montado—, así que sin esto la voz seguiría sonando sobre la pantalla de atrás.
  useEffect(() => {
    if (!visible) callar();
  }, [visible, callar]);

  const soloSaludo = mensajes.length === 1;

  /**
   * `hablado` cambia dos cosas: el turno queda etiquetado como voz en la auditoría del
   * backend, y la respuesta se lee en voz alta. Si escribiste, el teléfono se queda
   * callado — nadie quiere que su banco se ponga a hablar solo en el bus.
   */
  async function enviar(texto: string, hablado = false) {
    const t = texto.trim();
    if (!t || enviando) return;

    // Una pregunta nueva interrumpe la respuesta anterior: si no, el asistente sigue
    // leyendo lo viejo mientras ya está pensando lo nuevo.
    callar();

    const pendingId = nuevoId();
    setMensajes((m) => [
      ...m,
      { id: nuevoId(), role: 'user', texto: t },
      { id: pendingId, role: 'assistant', texto: '', pending: true },
    ]);
    setInput('');
    setEnviando(true);

    try {
      const r = hablado
        ? await enviarMensajeHablado(t, sessionId, proveedor ?? undefined)
        : await enviarMensaje(t, sessionId, proveedor ?? undefined);
      // Sin voz española instalada, el motor leería el español con fonemas en inglés:
      // se avisa una vez y la respuesta queda escrita, que es lo que importa.
      if (hablado && !sinVoz) hablar(r.texto);
      if (hablado && sinVoz) {
        setMensajes((m) => [
          ...m,
          {
            id: nuevoId(),
            role: 'assistant',
            texto:
              'Te respondo escrito: este teléfono no tiene una voz en español instalada ' +
              '(Ajustes → Idiomas → Salida de texto a voz).',
            error: true,
          },
        ]);
      }
      setMensajes((m) =>
        m.map((msg) =>
          msg.id === pendingId
            ? {
                id: pendingId,
                role: 'assistant',
                texto: r.texto,
                sources: r.sources,
                modelo: r.modelo,
                ruta: r.ruta,
              }
            : msg,
        ),
      );
    } catch (e) {
      const texto =
        e instanceof ApiError ? e.message : 'No pude responder ahora. Intenta de nuevo.';
      setMensajes((m) =>
        m.map((msg) =>
          msg.id === pendingId
            ? { id: pendingId, role: 'assistant', texto, error: true }
            : msg,
        ),
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colores.velo,
          }}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ height: '88%' }}
        >
          <SafeAreaView
            edges={['bottom']}
            className="flex-1 overflow-hidden rounded-t-3xl bg-surface-background"
          >
            {/* Handle + header */}
            <View className="items-center pt-2.5">
              <View className="h-1 w-10 rounded-full bg-surface-divider" />
            </View>
            <View className="flex-row items-center justify-between border-b border-surface-border px-4 py-3">
              <View className="flex-1 flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brandAlpha-primarySoft">
                  <Ionicons name="sparkles" size={18} color={colores.primario} />
                </View>
                <Text className="text-body-md font-bold text-text-primary">Broki</Text>
              </View>

              {/* Selector de modelo (tiempo real) + cerrar */}
              <View className="flex-row items-center gap-2">
                <ProviderSelector
                  providers={providers}
                  value={proveedor}
                  onChange={setProveedor}
                  onOpen={cargarProviders}
                />
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  className="h-8 w-8 items-center justify-center rounded-xl bg-surface-secondary"
                >
                  <Ionicons name="close" size={18} color={colores.textoMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Mensajes */}
            <ScrollView
              ref={scrollRef}
              className="flex-1 bg-surface-canvas"
              contentContainerClassName="px-4 py-4"
              keyboardShouldPersistTaps="handled"
            >
              {mensajes.map((m) => (
                <Burbuja key={m.id} mensaje={m} />
              ))}

              {soloSaludo ? (
                <View className="mt-1 gap-2">
                  {SUGERENCIAS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      activeOpacity={0.7}
                      onPress={() => enviar(s)}
                      className="flex-row items-center gap-2 self-start rounded-full border border-brandAlpha-primaryMedium bg-surface-background px-3.5 py-2"
                    >
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={13}
                        color={colores.primario}
                      />
                      <Text className="text-body text-brand-primary">{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </ScrollView>

            {/* Barra de entrada. Mientras el micrófono escucha, la onda ocupa el lugar
                del campo: es el gesto de una nota de voz, y evita que alguien intente
                escribir sobre un campo que se está llenando solo. */}
            <View className="flex-row items-end gap-2 border-t border-surface-border bg-surface-background px-4 py-3">
              {escuchando ? null : (
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="Pregunta o toca el micrófono…"
                  placeholderTextColor={colores.textoMuted}
                  multiline
                  onSubmitEditing={() => enviar(input)}
                  blurOnSubmit={false}
                  className="max-h-24 flex-1 rounded-2xl bg-surface-secondary px-4 py-2.5 text-body text-text-primary"
                />
              )}

              <BotonVoz
                onParcial={setInput}
                onFinal={(t) => enviar(t, true)}
                onError={(m) =>
                  setMensajes((ms) => [
                    ...ms,
                    { id: nuevoId(), role: 'assistant', texto: m, error: true },
                  ])
                }
                onEscuchando={setEscuchando}
                deshabilitado={enviando}
              />

              {/* Mientras habla, el mismo botón calla: es la acción más urgente que hay. */}
              <TouchableOpacity
                onPress={() => (hablando ? callar() : enviar(input))}
                disabled={!hablando && (!input.trim() || enviando)}
                activeOpacity={0.8}
                className={`h-11 w-11 items-center justify-center rounded-2xl ${
                  hablando
                    ? 'bg-state-error'
                    : !input.trim() || enviando
                      ? 'bg-surface-divider'
                      : 'bg-brand-primary'
                }`}
              >
                <Ionicons
                  name={hablando ? 'volume-mute' : 'arrow-up'}
                  size={20}
                  color={
                    !hablando && (!input.trim() || enviando)
                      ? colores.textoMuted
                      : colores.textoSobrePrimario
                  }
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
