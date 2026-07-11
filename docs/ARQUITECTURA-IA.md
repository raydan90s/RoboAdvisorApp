# Robo-Advisory — Arquitectura de Producto e IA

> **Track 3:** Robo-Advisory y Automatización de Estrategias de Inversión
> **Stack:** Expo SDK 54 (React Native + Expo Go) → FastAPI → Supabase/Postgres → Gemini + LangGraph
> **Estado:** documento de diseño. Define qué construimos y por qué antes de escribir código.

---

## 1. El principio rector: el LLM no calcula, el LLM conversa

Este es el corazón del proyecto y lo que responde directamente al criterio de evaluación #3
(*Mitigación de Riesgos / Antialucinación*). La base de datos ya está diseñada con esta idea
adentro — vale la pena hacerla explícita:

| Lo que decide **Postgres** (determinista, versionado, auditable) | Lo que hace **Gemini** (lenguaje, no aritmética) |
|---|---|
| Puntos por respuesta (`scoring_rules`) | Hacer las preguntas de forma conversacional |
| Puntaje total y perfil de riesgo (`profile_thresholds`) | Mapear una respuesta hablada a una opción válida del catálogo |
| Qué instrumentos y qué porcentajes (`allocation_template_items`) | Redactar la explicación legible de la propuesta |
| Riesgo esperado de la cartera (`allocation_templates.expected_risk`) | Responder dudas del usuario sobre *sus propios datos* |
| Quién aprobó, cuándo y con qué versión de reglas (`advisor_reviews`) | Resumirle al asesor el caso antes de que decida |

**Regla de oro:** si el modelo devuelve un número, se ignora. La fuente de verdad es siempre una fila
de la base. El backend valida esto (§7) y guarda cada turno en `llm_interactions` como evidencia.

Esto no es una limitación, es el argumento de venta: un robo-advisor donde el regulador puede
reconstruir *por qué* se recomendó exactamente esa cartera, y el LLM nunca estuvo en el camino
crítico del cálculo.

---

## 2. Roles y navegación

El JWT que emite FastAPI lleva `role: 'investor' | 'advisor'` (viene de `profiles.role`). La app
decide el navigator raíz con eso — no hay pantallas compartidas por accidente.

```
App
├── AuthStack            (sin sesión)
│   ├── LoginPage
│   └── RegisterPage     (self-signup solo de inversionistas)
│
├── InvestorTabs         (role === 'investor')
│   ├── Inicio           HomePage
│   ├── Mi propuesta     PropuestaPage
│   ├── ⬤  FAB CENTRAL   VoiceAgentSheet  ← el botón de voz
│   ├── Transparencia    ComoSeCalculoPage
│   └── Perfil           PerfilPage
│
└── AdvisorTabs          (role === 'advisor')
    ├── Cola             ColaRevisionPage
    ├── Clientes         ClientesPage
    ├── ⬤  FAB CENTRAL   VoiceAgentSheet  ← el mismo botón, otro agente
    ├── Auditoría        AuditoriaPage
    └── Perfil           PerfilPage
```

**El detalle que hace elegante el diseño:** el FAB central es *un solo componente*. Lo que cambia
según el rol no es la UI, sino el conjunto de herramientas (tools) que el backend le expone al
agente y el contexto que le inyecta. Un inversionista pregunta "¿por qué tengo tanto en bonos?" y
un asesor pregunta "¿qué clientes agresivos tengo esperando revisión?" — mismo botón, misma
burbuja de chat, distinto agente detrás.

---

## 3. HU1 — Perfil de inversionista transparente

**Criterios:** cuestionario por IA · reglas visibles y versionadas · el usuario entiende cómo influyó cada respuesta.

### Flujo

1. `POST /api/profiling/sessions` crea una `profiling_sessions` atada a la `rules_versions` activa.
2. El **Agente Perfilador** conduce el cuestionario. Puede ser híbrido y eso está bien:
   el usuario puede tocar una opción (chips) **o** contestarle hablando.
3. Aquí está el truco anti-alucinación: cuando el usuario responde con voz o texto libre
   ("uy, si cae 15% yo creo que aguantaría, no vendo"), el LLM **no asigna puntos**.
   Su única salida estructurada es:

   ```json
   { "question_code": "tolerancia", "option_code": "esperar", "confidence": 0.91 }
   ```

   El backend busca esa `question_options`, lee sus `points` de `scoring_rules` para la versión
   activa, y escribe `profiling_answers`. Si `confidence < 0.7` o el `option_code` no existe en el
   catálogo, el agente **repregunta** en lugar de adivinar.
4. `POST /api/profiling/sessions/{id}/complete` → Postgres suma, cruza `profile_thresholds`,
   escribe `total_score` y `risk_profile_id`.

### Pantalla "¿Cómo se calculó mi perfil?" (`ComoSeCalculoPage`)

Esta pantalla sola cumple el criterio de aceptación #3 de la HU1, y es lo que se ve en el video:

```
┌──────────────────────────────────────────────┐
│  Perfil: MODERADO            Reglas: v1  ⓘ   │
│  Puntaje: 6 / 9                              │
├──────────────────────────────────────────────┤
│  Objetivo principal                          │
│  → "Balancear riesgo y crecimiento"   +2 pts │  [Editar]
│                                              │
│  Horizonte de inversión                      │
│  → "2 a 5 años"                       +2 pts │  [Editar]
│                                              │
│  Reacción a una caída del 15%                │
│  → "Esperaría a que se recupere"      +2 pts │  [Editar]
├──────────────────────────────────────────────┤
│  Umbrales (v1):                              │
│  Conservador 3–4 · Moderado 5–7 · Agresivo 8–9│
│  ▓▓▓▓▓▓▓▓░░░░  tu puntaje cae en Moderado    │
└──────────────────────────────────────────────┘
```

"Editar" reabre esa pregunta, recalcula el puntaje y **crea una nueva propuesta** (la anterior
queda en el historial). La versión de reglas siempre está a la vista.

---

## 4. HU2 — Propuesta explicable de portafolio

**Criterios:** catálogo aprobado · % + riesgo esperado + explicación legible · no ejecuta órdenes ni promete rentabilidad.

### Flujo

1. Al completar la sesión, el backend busca la `allocation_templates` de
   (`rules_version`, `risk_profile`) y **copia** sus items a `proposals` + `proposal_items`.
   Es un *snapshot*: si mañana cambia la plantilla, la propuesta histórica no se altera.
2. Solo entonces entra Gemini: recibe en el prompt el perfil, las respuestas y **los porcentajes ya
   calculados**, y redacta `proposals.explanation`.
3. El texto pasa por el **guardarraíl numérico** (§7) antes de guardarse.

### Pantalla `PropuestaPage`

- **Donut chart** de asignación (`react-native-svg`, ya está instalado).
- Tarjeta por instrumento: nombre, clase de activo, badge de riesgo (bajo/medio/alto), `%`.
- Bloque **"Por qué esta cartera"** — la explicación de la IA, con las respuestas del usuario citadas.
- Badge de riesgo esperado de la cartera completa.
- **Banner fijo, no descartable:**

  > ⚠️ Propuesta sujeta a revisión de un asesor autorizado. No constituye una orden de compra
  > ni una promesa de rentabilidad. Cifras de retorno son ilustrativas.

- **Badge de estado** que refleja `proposals.status`:
  `⏳ En revisión` · `✅ Aprobada por [asesor] el [fecha]` · `✏️ Editada por el asesor` · `❌ Rechazada`

Ese badge es lo que cierra el ciclo de la demo: el inversionista ve en vivo cuando el asesor aprueba.

---

## 5. HU3 — Revisión por asesor autorizado

**Criterios:** resumen de perfil + propuesta + justificación · aprobar/editar/rechazar · registro con fecha, versión de reglas y responsable.

### `ColaRevisionPage`
Consume la vista `v_advisor_review_queue` que ya existe. Lista de tarjetas: cliente, cédula,
perfil, puntaje, riesgo, antigüedad de la solicitud.

### `DetallePropuestaPage` — aquí la IA aporta valor real al asesor

La IA genera un **briefing** (no una decisión):

```
📋 BRIEFING — María Pérez · 0912345678

PERFIL      Moderado (6/9) · reglas v1 · perfilada hace 2 h
PROPUESTA   Plantilla Moderada · riesgo medio
            20% Bono Gobierno EC 5Y · 40% ETF Renta Fija Global · 40% ETF S&P 500

JUSTIFICACIÓN
La clienta busca balancear riesgo y crecimiento (+2), con horizonte de
2 a 5 años (+2) y tolerancia media a caídas (+2). La cartera moderada
asigna 60% a renta fija/bonos y 40% a renta variable indexada.

⚠️ PUNTOS DE ATENCIÓN
· Ninguna incoherencia detectada entre horizonte y tolerancia.
· El puntaje (6) está a 1 punto del umbral agresivo — vale confirmar
  la respuesta de horizonte antes de aprobar.
```

Las **banderas** son reglas deterministas (horizonte corto + tolerancia alta = incoherente; puntaje
al borde de un umbral; instrumento de riesgo alto en perfil conservador). La IA solo las redacta.

### Acciones — human-in-the-loop literal

| Acción | Qué pasa |
|---|---|
| **Aprobar** | `advisor_reviews(decision='approved')` + `proposals.status='approved'` |
| **Editar** | Abre `EditarAsignacionPage`: sliders por instrumento que **deben sumar 100%** (validado en cliente y en servidor). El resultado va a `advisor_reviews.edited_allocation` (jsonb) y `status='edited'` |
| **Rechazar** | Pide comentario obligatorio → `decision='rejected'` |

Cada decisión escribe `advisor_id`, `decided_at`, `rules_version_id` y un `audit_log` con
`platform`. La `AuditoriaPage` muestra ese log como timeline — es la evidencia literal del criterio
de aceptación #3 de la HU3.

**El agente NUNCA aprueba.** Puede *sugerir*: devuelve `suggested_action: { type: "approve_proposal", proposal_id }`
y la UI renderiza un botón que el asesor tiene que tocar con el dedo. Eso satisface la regla del
hackathon de que las acciones reguladas queden como *propuesta o solicitud de aprobación*.

---

## 6. El botón central de voz — "Pregúntale a tu asesor IA"

La idea que nos gustó, aterrizada a lo que Expo Go permite hoy.

### Restricción técnica (importante)

**Expo Go no tiene speech-to-text nativo.** `@react-native-voice/voice` y `expo-speech-recognition`
requieren development build, y el proyecto está pinneado a SDK 54 justamente porque es el último con
cliente de Expo Go publicado. Sí están incluidos en Expo Go:

- ✅ `expo-audio` — grabar audio (`useAudioRecorder`, `RecordingPresets.HIGH_QUALITY` → `.m4a`)
- ✅ `expo-speech` — leer texto en voz alta (`Speech.speak`)

**La transcripción la hacemos en el servidor con Gemini**, que es multimodal y acepta audio
directamente. Esto no es un workaround: es *mejor* arquitectura. La lógica de voz vive en el
backend, funciona igual en móvil y web, y queda auditada en `llm_interactions`.

### El flujo

```
  [Usuario mantiene presionado el FAB 🎙]
              │
              ▼
   expo-audio graba .m4a  ──── onda animada + "Escuchando…"
              │  (suelta el botón)
              ▼
   POST /api/agent/voice   (multipart: audio + thread_id)
              │
              ▼
   ┌──────────────────────────────────────────┐
   │  FastAPI                                 │
   │  1. Gemini transcribe el audio           │
   │  2. LangGraph enruta según rol + intent  │
   │  3. Tools de SOLO LECTURA sobre Postgres │
   │  4. Guardarraíl numérico (§7)            │
   │  5. Persiste en llm_interactions         │
   └──────────────────────────────────────────┘
              │
              ▼
   { transcript, answer, sources[], suggested_action? }
              │
              ▼
   Burbuja de chat + expo-speech lee la respuesta
```

### La hoja modal (`VoiceAgentSheet`)

```
┌──────────────────────────────────────────────┐
│                                       [ ✕ ]  │
│                                              │
│  👤 "¿Por qué tengo 40% en el S&P 500?"      │
│                                              │
│  🤖 Porque tu perfil es Moderado (6/9) y     │
│     la plantilla moderada asigna 40% a       │
│     renta variable indexada. Es el           │
│     componente de crecimiento de tu cartera; │
│     el 60% restante está en renta fija para  │
│     amortiguar caídas.                       │
│                                              │
│     📊 proposal_items · ETF S&P 500 · 40%    │  ← chips de fuente
│     📊 rules v1 · umbral moderado 5–7        │     (tocables)
│                                              │
│                          [ 🔊 Escuchar otra vez ]
│                                              │
│  ────────────────────────────────────────    │
│   [ Escribir… ]              ( 🎙 mantén )   │
└──────────────────────────────────────────────┘
```

### Los *source chips* — el diferenciador

Cada respuesta del agente viene con `sources: [{ table, record_id, label }]`. La burbuja los
muestra como chips tocables que llevan a la fila real (la tarjeta del instrumento, la tabla de
umbrales). **El usuario puede verificar cada afirmación de la IA con un tap.** Es la respuesta
visual, en 2 segundos de video, al criterio de antialucinación.

### Tools por rol (todas de solo lectura)

| Inversionista | Asesor |
|---|---|
| `get_mi_perfil()` | `get_cola_revision()` |
| `get_mi_propuesta()` | `get_cliente(investor_id)` |
| `explicar_mi_puntaje()` | `get_propuesta(proposal_id)` |
| `get_instrumento(code)` | `comparar_con_plantilla(proposal_id)` |
| `get_reglas(version)` | `get_historial_decisiones(advisor_id)` |

**Ninguna tool escribe en la base.** El agente puede leer y sugerir; escribir es siempre un tap
humano en la UI.

### Guardia de alcance

Si preguntan algo fuera de los datos ("¿me conviene meterle a bitcoin?", "¿va a subir el S&P?"), el
nodo `refuse_node` responde con un texto fijo:

> No puedo darte recomendaciones fuera de tu propuesta ni predecir mercados. Lo que sí puedo hacer
> es explicarte cómo se calculó tu perfil o qué instrumentos tienes asignados.

Es un caso de prueba, no una capa de prompt engineering esperanzada.

---

## 7. Guardarraíles anti-alucinación

El criterio #3 se gana con código verificable, no con prompts que dicen "no alucines".

**a) Validador numérico.** Antes de guardar cualquier texto generado, se extraen todos los números
del texto y se comparan contra el conjunto de valores permitidos para ese contexto (los `%` de la
propuesta, el puntaje, los umbrales, los `expected_return` de los instrumentos citados). Si aparece
un número que no está en el conjunto → se reintenta una vez → si vuelve a fallar, se usa la
explicación determinista de plantilla. **Nunca se le muestra al usuario un número que la IA inventó.**

**b) Léxico prohibido.** Regex sobre `garantiz*`, `asegur*`, `rentabilidad garantizada`,
`vas a ganar`, `sin riesgo`. Rechaza y reintenta.

**c) Catálogo cerrado.** El agente solo puede nombrar instrumentos con `code` presente en
`instruments`. Cualquier ticker fuera del catálogo → rechazo.

**d) Trazabilidad.** Todo turno (`system`/`user`/`assistant`) queda en `llm_interactions` con
`session_id`, `proposal_id` y `platform`. Se puede reconstruir la conversación completa.

**e) Grounding obligatorio.** Si el agente no puede citar al menos una fuente, responde "no tengo ese
dato" en lugar de improvisar.

---

## 8. Máquina de estados (LangGraph)

Responde al criterio #1 (*arquitectura agéntica sólida, continuidad de conversación*).

```
             ┌──────────┐
   entrada → │  router  │
             └────┬─────┘
      ┌───────────┼───────────┬──────────────┐
      ▼           ▼           ▼              ▼
 profiling_   explain_     qa_node      advisor_       (fuera de alcance)
   node        node       (tools RO)     node          → refuse_node
      │           │           │              │              │
      └───────────┴─────┬─────┴──────────────┘              │
                        ▼                                   │
                  guardrail_node  ◄──────────────────────────┘
                        │  (reintenta 1× si falla)
                        ▼
                  persist_node → llm_interactions
                        │
                        ▼
                    respuesta
```

El **checkpointer** usa `thread_id = profiling_session_id`, así el usuario puede cerrar la app,
volver, y el agente recuerda dónde iba el cuestionario. Eso es "continuidad de la conversación"
demostrable, no una lista de mensajes en memoria.

---

## 9. Contrato de API

| Método | Endpoint | Rol | Qué hace |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Alta de inversionista |
| `POST` | `/api/auth/login` | — | Devuelve JWT con `role` + refresh (`auth_sessions`) |
| `GET` | `/api/profiling/questions` | investor | Preguntas + opciones válidas |
| `POST` | `/api/profiling/sessions` | investor | Abre sesión con la `rules_version` activa |
| `POST` | `/api/profiling/sessions/{id}/answers` | investor | Registra respuesta (puntos los pone la BD) |
| `POST` | `/api/profiling/sessions/{id}/complete` | investor | Calcula puntaje + perfil + genera propuesta |
| `GET` | `/api/profiling/sessions/{id}/breakdown` | investor | Desglose para `ComoSeCalculoPage` |
| `GET` | `/api/proposals/{id}` | ambos | Propuesta + items + explicación + estado |
| `GET` | `/api/advisor/queue` | advisor | `v_advisor_review_queue` |
| `GET` | `/api/advisor/proposals/{id}/briefing` | advisor | Resumen IA + banderas |
| `POST` | `/api/advisor/proposals/{id}/review` | advisor | approve / edit / reject → `advisor_reviews` |
| `POST` | `/api/agent/chat` | ambos | Turno de texto (tools según rol) |
| `POST` | `/api/agent/voice` | ambos | Turno de audio (multipart) → transcript + answer |
| `GET` | `/api/audit` | advisor | Timeline de `audit_log` |

Nota: `src/services/http.ts` ya espera `{ success, data, message }`. Hay que envolver las respuestas
de FastAPI en ese sobre (o simplificar el cliente) — decidirlo antes de conectar la primera pantalla.

---

## 10. Pruebas (apuntamos a NIVEL INTERMEDIO)

```
tests/
├── test_scoring.py       Respuestas → puntaje → perfil. Umbrales de borde (4/5, 7/8).
├── test_allocation.py    Los % de toda plantilla suman exactamente 100.
├── test_guardrails.py    ⭐ Texto con un % inventado → RECHAZADO.
│                            Texto con "rentabilidad garantizada" → RECHAZADO.
│                            Texto que solo cita datos reales → ACEPTADO.
├── test_agent.py         Mock de Gemini. El agente responde algo coherente y cita fuentes.
├── test_graph_nodes.py   Cada nodo de LangGraph por separado (router enruta bien; refuse_node
│                         se activa con "¿compro bitcoin?").
└── test_roles.py         Un investor NO puede llamar /api/advisor/*  → 403.
```

`test_guardrails.py` es el test estrella para la evaluación: prueba, con código, que el sistema es
incapaz de mostrar un número inventado.

---

## 11. Guion de la demo (3 minutos)

1. **0:00** — Login como inversionista. Home: "Aún no tienes un perfil".
2. **0:20** — Cuestionario. **Una pregunta se responde hablando**, y la IA mapea la frase libre a la
   opción del catálogo. Ese es el gancho.
3. **0:50** — Resultado: *Moderado, 6/9*. Se abre "¿Cómo se calculó?" → tabla respuesta → puntos →
   umbral, con **reglas v1** visible.
4. **1:20** — Propuesta: donut, instrumentos, explicación de la IA, banner de "no es orden de compra",
   badge *En revisión*.
5. **1:40** — **FAB central.** Se pregunta por voz: *"¿por qué tengo 40% en el S&P 500?"*. La IA
   responde hablando **y muestra los chips de fuente.** Se toca un chip → lleva a la fila real.
6. **2:10** — Se pregunta algo fuera de alcance → la IA se niega correctamente.
7. **2:25** — Login como asesor. Cola de revisión → briefing IA con banderas → **Aprobar**.
8. **2:45** — De vuelta en el inversionista: el badge ahora dice *✅ Aprobada por Asesor Demo*.
   Se abre Auditoría: la decisión con fecha, responsable y versión de reglas.

Cierra el ciclo completo de las tres historias en tres minutos, y cada criterio de evaluación
aparece en pantalla al menos una vez.

---

## 12. Estructura de carpetas propuesta (frontend)

Respeta la convención que ya existe (`src/screens/<área>/<pantalla>/{pages,components,hooks,types}`)
y la decisión de usar **React Navigation, no Expo Router**.

```
src/
├── screens/
│   ├── auth/            login/ · register/
│   ├── inversionista/   home/ · cuestionario/ · propuesta/ · como-se-calculo/
│   └── asesor/          cola/ · detalle-propuesta/ · editar-asignacion/ · auditoria/
├── components/
│   ├── agent/           VoiceAgentSheet · VoiceFab · ChatBubble · SourceChip · WaveIndicator
│   ├── shared/          DisclaimerBanner · RiskBadge · StatusBadge · AllocationDonut
│   └── ui/              (primitivas)
├── navigation/          RootNavigator · InvestorTabs · AdvisorTabs · rootNavigation.ts
├── context/             AuthContext (agregar `role`) · AgentContext
├── services/            http.ts · auth.api.ts · profiling.api.ts · proposals.api.ts
│                        advisor.api.ts · agent.api.ts
├── hooks/               useVoiceRecorder (expo-audio) · useSpeak (expo-speech)
└── types/               navigation.ts · api.ts
```

### Dependencias a agregar

```bash
npx expo install expo-audio expo-speech
```

Ambas están **incluidas en Expo Go** para SDK 54 — verificado contra
`docs.expo.dev/versions/v54.0.0/`. No requieren development build.

---

## 13. Decisiones pendientes

- [ ] **Sobre de respuesta de la API:** `http.ts` espera `{ success, data, message }`; FastAPI
      devuelve el objeto plano. Alinear uno de los dos **antes** de la primera pantalla conectada.
- [ ] **`AuthContext` no guarda `role`.** Hay que agregarlo — de eso depende todo el ruteo.
- [ ] ¿Cuestionario 100% conversacional o híbrido (chips + voz)? Recomendación: **híbrido** —
      es más rápido de demostrar y menos frágil en vivo.
- [ ] Idioma del TTS: `es-EC` / `es-419` en `Speech.speak`.
- [ ] Despliegue: backend en Render/Railway, frontend web en Vercel (Expo web) + APK/Expo Go para móvil.
      El entregable pide un **link de despliegue**.
