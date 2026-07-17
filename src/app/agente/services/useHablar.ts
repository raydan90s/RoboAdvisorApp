import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

import { elegirVozEspanol } from './vozDelSistema';
import { textoParaVoz } from './vozTexto';

/**
 * Leer en voz alta la respuesta del asistente.
 *
 * Vive aparte del micrófono a propósito: `expo-speech` SÍ viene dentro de Expo Go, así
 * que hablar funciona en cualquier build. Escuchar necesita un módulo nativo que Expo Go
 * no trae, y por eso está detrás de la compuerta de `BotonVoz`. Separarlos es lo que
 * permite que el chat escrito siga siendo el mismo componente en los dos mundos.
 */

/**
 * Un pelo más rápido que el default (1.0). El TTS en español lee lento para lo que es una
 * respuesta corta de chat, y a 1.0 la demo se siente pesada. Más de ~1.3 empieza a comerse
 * las cifras —"doce mil" suena a "docemil"— y las cifras son justo lo que no se puede
 * perder acá.
 */
const VELOCIDAD = 1.15;

/**
 * Si no se pudo elegir una voz concreta, se pide el idioma y decide el motor. Es `es-US`
 * y no `es-MX` por la misma razón que en `vozDelSistema`: Google TTS no trae es-MX.
 */
const IDIOMA_RESPALDO = 'es-US';

export function useHablar() {
  const [hablando, setHablando] = useState(false);
  /** `undefined` = no se preguntó aún; `null` = no hay voz española en este teléfono. */
  const vozRef = useRef<string | null | undefined>(undefined);
  const [sinVoz, setSinVoz] = useState(false);

  // El inventario de voces no cambia mientras la app corre: se pregunta una sola vez.
  useEffect(() => {
    let vigente = true;
    Speech.getAvailableVoicesAsync()
      .then((voces) => {
        if (!vigente) return;
        const elegida = elegirVozEspanol(voces);
        vozRef.current = elegida?.identifier ?? null;
        setSinVoz(elegida === null);
      })
      .catch(() => {
        // Si el sistema no sabe listar voces no se bloquea nada: `speak` sin `voice` usa
        // el default del motor. Peor consistencia, pero habla.
        if (vigente) vozRef.current = null;
      });
    return () => {
      vigente = false;
    };
  }, []);

  const callar = useCallback(() => {
    Speech.stop();
    setHablando(false);
  }, []);

  const hablar = useCallback((texto: string) => {
    const limpio = textoParaVoz(texto);
    if (!limpio) return;

    // Sin esto, dos respuestas seguidas se encolan y el asistente habla encima de sí mismo.
    Speech.stop();
    setHablando(true);

    const voz = vozRef.current;
    Speech.speak(limpio, {
      // Con una voz elegida se manda el identifier, que es exacto. Sin ella se pide el
      // idioma y decide el motor: menos predecible, pero habla igual.
      ...(voz ? { voice: voz } : { language: IDIOMA_RESPALDO }),
      rate: VELOCIDAD,
      onDone: () => setHablando(false),
      onStopped: () => setHablando(false),
      onError: () => setHablando(false),
    });
  }, []);

  // Desmontar la pantalla calla al asistente: un bot que sigue hablando después de que
  // cerraste el chat es lo peor que puede pasar en una demo. El cuerpo va entre llaves
  // porque `Speech.stop()` devuelve una promesa y una cleanup de efecto no puede
  // devolver nada que no sea otra función.
  useEffect(
    () => () => {
      Speech.stop();
    },
    [],
  );

  return { hablar, callar, hablando, sinVoz };
}
