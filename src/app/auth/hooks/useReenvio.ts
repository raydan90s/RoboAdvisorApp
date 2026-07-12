import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/services/http';

/** Segundos que el botón "reenviar" queda muerto tras un envío. */
const ESPERA_SEGUNDOS = 60;

/**
 * El botón "reenviar código", con su cuenta regresiva.
 *
 * El cooldown no es cosmético: cada reenvío **invalida el código anterior**, así que un
 * usuario impaciente que toca tres veces se queda con el último y los dos correos de
 * arriba —que son los que suelen llegar primero— ya no sirven. Los 60 segundos evitan
 * esa confusión (y de paso, que la cuenta de Gmail se coma su cuota).
 *
 * `pedir` es la llamada a la API: reenviarCodigo u olvideContrasena.
 */
export function useReenvio(pedir: () => Promise<{ mensaje: string }>) {
  const [restante, setRestante] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  useEffect(() => {
    if (restante <= 0) return;
    const id = setTimeout(() => setRestante((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [restante]);

  async function reenviar() {
    if (restante > 0 || enviando) return;
    setEnviando(true);
    setError(null);
    setAviso(null);
    try {
      const { mensaje } = await pedir();
      if (!vivo.current) return;
      setAviso(mensaje);
      setRestante(ESPERA_SEGUNDOS);
    } catch (e) {
      if (!vivo.current) return;
      setError(
        e instanceof ApiError ? e.message : 'No se pudo reenviar el código. Intenta de nuevo.',
      );
    } finally {
      if (vivo.current) setEnviando(false);
    }
  }

  /** Arranca el cooldown sin reenviar: la pantalla se abre con un código ya en camino.
   *
   *  `useCallback` no es adorno: las pantallas lo llaman desde un `useEffect` de montaje,
   *  y una función nueva en cada render volvería a disparar ese efecto en cada tick del
   *  contador — el cronómetro se reiniciaría a 60 para siempre. */
  const iniciarEspera = useCallback(() => setRestante(ESPERA_SEGUNDOS), []);

  const limpiarAviso = useCallback(() => {
    setAviso(null);
    setError(null);
  }, []);

  return {
    reenviar,
    /** > 0 mientras el botón está en cuenta regresiva. */
    restante,
    enviando,
    aviso,
    error,
    limpiarAviso,
    iniciarEspera,
  };
}
