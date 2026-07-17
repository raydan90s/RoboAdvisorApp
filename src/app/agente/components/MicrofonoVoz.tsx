import { Ionicons } from '@expo/vector-icons';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, TouchableOpacity, View } from 'react-native';

import { useColores } from '@/context/ThemeContext';

import OndaVoz from './OndaVoz';

/**
 * El micrófono de la barra del chat: escucha y entrega texto. No sabe nada del agente.
 *
 * NO SE IMPORTA DIRECTO — se llega acá por el `lazy()` de `BotonVoz.tsx`.
 * `expo-speech-recognition` hace `requireNativeModule("ExpoSpeechRecognition")` en el
 * cuerpo del módulo, y esa función LANZA cuando el nativo no está (no devuelve null).
 * Como `AgentSheet` cuelga del árbol de navegación, un import normal mataría la app
 * entera al arrancar en Expo Go, que no trae ese nativo.
 *
 * Mientras escucha, se adueña de la barra: la onda reemplaza al TextInput. Es el gesto
 * de una nota de voz, y evita que el usuario intente escribir sobre un campo que se está
 * llenando solo.
 */

/**
 * Reconocimiento en es-EC. Acá sí conviene lo específico, al revés que al hablar: el
 * modelo de reconocimiento es del servidor de Google y se beneficia del acento local,
 * mientras que la voz de salida depende de lo que el teléfono tenga instalado.
 */
const IDIOMA = 'es-EC';

/**
 * `volumechange` da un float de -2 a 10 (bajo 0 es inaudible según la librería). El techo
 * se corta en 6 y no en 10 porque hablándole normal a un teléfono el valor vive entre 1 y
 * 5: contra 10 la onda quedaba plana salvo que gritaras.
 */
function nivelDesdeVolumen(valor: number): number {
  return Math.max(0, Math.min(1, valor / 6));
}

interface Props {
  /** Cada resultado parcial, para pintar lo que se va entendiendo mientras habla. */
  onParcial: (texto: string) => void;
  /** El texto final: el usuario terminó de hablar y esto ya se puede mandar. */
  onFinal: (texto: string) => void;
  onError: (mensaje: string) => void;
  /** El chat lo necesita para esconder el campo de texto mientras la onda ocupa la barra. */
  onEscuchando: (escuchando: boolean) => void;
  /** Mientras el agente responde, el micrófono no se abre. */
  deshabilitado: boolean;
}

export default function MicrofonoVoz({
  onParcial,
  onFinal,
  onError,
  onEscuchando,
  deshabilitado,
}: Props) {
  const [escuchando, setEscuchando] = useState(false);
  const colores = useColores();

  // Los handlers de eventos corren fuera del render: necesitan el valor más reciente,
  // no el que existía cuando se registraron.
  const transcriptRef = useRef('');
  const escuchandoRef = useRef(false);

  // El volumen del micrófono, 0…1. Animated.Value y NO estado a propósito: llega ~10
  // veces por segundo, y por estado serían 10 renders/seg de todo el chat.
  const nivel = useRef(new Animated.Value(0)).current;

  const detener = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  useSpeechRecognitionEvent('result', (e) => {
    const t = e.results[0]?.transcript ?? '';
    transcriptRef.current = t;
    onParcial(t);
  });

  useSpeechRecognitionEvent('volumechange', (e) => {
    Animated.timing(nivel, {
      toValue: nivelDesdeVolumen(e.value),
      // Un pelo más que el intervalo del evento (100ms): así los saltos entre muestras
      // se ven como una onda continua y no como un estroboscopio.
      duration: 120,
      useNativeDriver: true,
    }).start();
  });

  useSpeechRecognitionEvent('error', (e) => {
    // Vaciar el transcript ANTES de que llegue `end` es lo que evita que un error se
    // mande igual como pregunta: `end` siempre corre después de `error`.
    transcriptRef.current = '';
    escuchandoRef.current = false;
    setEscuchando(false);
    onEscuchando(false);
    onError(
      e.error === 'no-speech'
        ? 'No te escuché. Toca el micrófono y habla cerca.'
        : 'El reconocimiento de voz falló. Intenta otra vez.',
    );
  });

  useSpeechRecognitionEvent('end', () => {
    const t = transcriptRef.current.trim();
    escuchandoRef.current = false;
    setEscuchando(false);
    onEscuchando(false);
    Animated.timing(nivel, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    if (t) onFinal(t);
  });

  // Desmontar cierra el micrófono. Sin la bandera, el `stop()` dispararía `end` y
  // mandaría la pregunta que el usuario abandonó al cerrar el chat.
  useEffect(
    () => () => {
      transcriptRef.current = '';
      ExpoSpeechRecognitionModule.stop();
    },
    [],
  );

  async function alTocar() {
    if (escuchandoRef.current) {
      detener();
      return;
    }
    if (deshabilitado) return;

    const permiso = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permiso.granted) {
      onError('Sin permiso de micrófono no puedo escucharte.');
      return;
    }

    transcriptRef.current = '';
    escuchandoRef.current = true;
    setEscuchando(true);
    onEscuchando(true);
    ExpoSpeechRecognitionModule.start({
      lang: IDIOMA,
      // Los parciales son el punto: el texto aparece mientras hablas, así se ve que te
      // está oyendo en vez de mirar un botón mudo.
      interimResults: true,
      // Una pregunta por turno: al callarte, cierra y manda.
      continuous: false,
      // Vienen APAGADOS por defecto: sin esto la onda nunca recibe un dato.
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
    });
  }

  return (
    <>
      {/* Mientras escucha, la onda se adueña de la barra. Si está plana MIENTRAS hablas,
          el micrófono no está capturando — la onda es también el diagnóstico. */}
      {escuchando ? (
        <View className="flex-1 justify-center">
          <OndaVoz nivel={nivel} color={colores.primario} altura={26} />
        </View>
      ) : null}

      <TouchableOpacity
        onPress={alTocar}
        disabled={deshabilitado && !escuchando}
        activeOpacity={0.8}
        className={`h-11 w-11 items-center justify-center rounded-2xl ${
          escuchando ? 'bg-state-error' : 'bg-surface-secondary'
        }`}
      >
        <Ionicons
          name={escuchando ? 'stop' : 'mic'}
          size={20}
          color={escuchando ? colores.textoSobrePrimario : colores.textoMuted}
        />
      </TouchableOpacity>
    </>
  );
}
