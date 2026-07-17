import Constants, { ExecutionEnvironment } from 'expo-constants';
import { lazy, Suspense } from 'react';
import { View } from 'react-native';

/**
 * La compuerta del micrófono. Es lo ÚNICO que se puede importar desde el chat.
 *
 * `expo-speech-recognition` no viene dentro de Expo Go, y su módulo llama a
 * `requireNativeModule("ExpoSpeechRecognition")` en el cuerpo —no dentro de una función—.
 * Esa llamada LANZA cuando el nativo falta. Como `AgentSheet` cuelga del árbol de
 * navegación, un import normal se evaluaría al arrancar y tiraría la app entera en Expo
 * Go: no el chat, la app. Ni el login.
 *
 * Por eso el import real es `lazy()`: difiere la evaluación del módulo hasta que algo lo
 * renderiza, y en Expo Go no se renderiza nunca.
 *
 * En Expo Go el micrófono simplemente no aparece y el chat escrito queda intacto — es
 * más honesto que un botón que al tocarlo dice "no disponible". Hablar (`useHablar`) sí
 * funciona en Expo Go: `expo-speech` viene incluido. Lo único que falta ahí es escuchar.
 *
 * El día que Expo Go traiga reconocimiento de voz, esto se borra y `MicrofonoVoz` se
 * importa directo.
 */

// `storeClient` es exactamente Expo Go. Un dev build, un APK o la web son `bare`.
const EN_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const MicrofonoVoz = lazy(() => import('./MicrofonoVoz'));

interface Props {
  onParcial: (texto: string) => void;
  onFinal: (texto: string) => void;
  onError: (mensaje: string) => void;
  onEscuchando: (escuchando: boolean) => void;
  deshabilitado: boolean;
}

export default function BotonVoz(props: Props) {
  if (EN_EXPO_GO) return null;

  return (
    // El hueco del botón mientras carga: sin esto la barra salta al aparecer.
    <Suspense fallback={<View className="h-11 w-11" />}>
      <MicrofonoVoz {...props} />
    </Suspense>
  );
}
