import { Text, TouchableOpacity, View } from 'react-native';

import type { Pregunta } from '../types/inversionista';

interface Props {
  preguntas: Pregunta[];
  /** { question_code: option_code } */
  respuestas: Record<string, string>;
  onElegir: (preguntaCode: string, opcionCode: string) => void;
}

/**
 * Las 5 preguntas y sus opciones, pintadas tal como las sirve la BD.
 *
 * Vive suelto de la pantalla porque lo usan dos: `CuestionarioPage` (perfilamiento de
 * una sola cartera) y el paso 2 de `NuevaSubcuentaPage`. Copiarlo habría dejado dos
 * cuestionarios que se desincronizan en cuanto alguien agregue una opción.
 *
 * No calcula puntajes: se mandan los códigos y `scoring_rules` hace el resto.
 */
export default function FormularioPreguntas({ preguntas, respuestas, onElegir }: Props) {
  return (
    <>
      {preguntas.map((pregunta, i) => (
        <View
          key={pregunta.code}
          className="gap-3 rounded-2xl border border-surface-border bg-surface-background p-5"
        >
          <Text className="text-caption font-bold uppercase text-text-muted">
            Pregunta {i + 1} de {preguntas.length}
          </Text>
          <Text className="text-body-md font-bold text-text-primary">{pregunta.text}</Text>

          <View className="flex-row flex-wrap gap-2">
            {pregunta.opciones.map((opcion) => {
              const elegida = respuestas[pregunta.code] === opcion.code;
              return (
                <TouchableOpacity
                  key={opcion.code}
                  onPress={() => onElegir(pregunta.code, opcion.code)}
                  activeOpacity={0.85}
                  className={`rounded-full border px-4 py-2 ${
                    elegida
                      ? 'border-brand-primary bg-brand-primary'
                      : 'border-surface-border bg-surface-elevated'
                  }`}
                >
                  <Text
                    className={`text-body ${
                      elegida ? 'font-bold text-text-onPrimary' : 'text-text-secondary'
                    }`}
                  >
                    {opcion.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </>
  );
}
