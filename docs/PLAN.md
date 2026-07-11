# Plan de ejecución — Robo-Advisory Track 3

> **Deadline: domingo 12 de julio de 2026, 23:59.** Este documento existe porque el
> tiempo restante (~36 h) no alcanza para todo lo que describe [ARQUITECTURA-IA.md](ARQUITECTURA-IA.md).
> Ese doc es el norte; este es el camino.
>
> Regla: **ningún criterio de aceptación del track se sacrifica.** Lo que se corta son
> los extras. La lista de cortes está al final y es explícita.

---

## 0. Dónde estamos parados (auditado, no supuesto)

| Pieza | Estado real |
|---|---|
| `schema.sql` | ✅ Estructura completa: tablas, índices, RLS |
| `seed.sql` | ✅ Nuevo: catálogo **bancario**, instituciones con calificación, monto en USD, 3 casos de demo |
| Backend: perfilamiento + propuesta | ⚠️ Funciona, pero **ignora el monto** (`investor_controller.py`) |
| Backend: **auth / login / roles** | ❌ No existe |
| Backend: **endpoints del asesor** | ❌ No existen |
| Backend: **Gemini real** | ❌ `ai_agent.py` es un mock determinista |
| Backend: **guardarraíles** | ❌ No existen |
| Backend: **tests** | ❌ No hay carpeta `tests/` |
| Frontend | ❌ Casi vacío: solo `HomePage`, `AuthContext`, `http.ts` |
| Deploy | ❌ Nada desplegado |

Traducción: **el backend tiene la mitad, el frontend no tiene casi nada.** Ese es el
cuello de botella real y por eso el reparto de esfuerzo de abajo carga hacia el front.

---

## 1. Lo que se entrega (los 5 enlaces obligatorios)

Sin estos cinco no hay evaluación, por buena que sea la app:

- [ ] **Video** de 3 minutos (guion en [ARQUITECTURA-IA.md §11](ARQUITECTURA-IA.md))
- [ ] **ZIP** del código
- [ ] **Documento explicativo** (arquitectura + track + tipo de negocio + integración empresarial)
- [ ] **Link del repositorio**
- [ ] **Link de despliegue** ← el más fácil de olvidar y el que más tarda

Se envían a `taws@fiec.espol.edu.ec`.

> ⚠️ **Reserva las últimas 4 horas para esto.** Un proyecto perfecto sin video no puntúa.

---

## FASE 0 — Base de datos · ✅ HECHA (11-jul, corrida contra Supabase)

1. [x] `schema.sql` corrido.
2. [x] `seed.sql` corrido — las **9 filas de verificación en `OK`**.
3. [x] Test negativo: metiendo a la fuerza el DPF de Loja (AA) en la plantilla
       conservadora, `v_institution_eligibility` lo marca inelegible. La regla muerde.

Para volver a correrlo (es re-ejecutable y destructivo del catálogo):

```bash
cd ROBOADVISORY-BACKEND
U=$(grep '^DATABASE_URL' .env | cut -d= -f2-)
psql "$U" -v ON_ERROR_STOP=1 -1 -f seed.sql
```

> Si `psql` se cuelga contra el puerto **5432**: es el session pooler de Supabase con el
> pool agotado (pasa si matas un `psql` a media transacción). Usa el pooler de transacción
> cambiando el puerto a **6543**, o espera ~1 min a que Supabase reape las sesiones.
> Corre siempre con `timeout 45 psql …` para no dejar sesiones colgadas.

> ⚠️ `seed.sql` **resetea el catálogo** de `schema.sql` (que traía ETFs y bonos) y lo
> reemplaza por productos bancarios. Es a propósito: [Ejemplo_de_Robo_Advisor.md](Ejemplo_de_Robo_Advisor.md)
> pide explícitamente productos que *"un banco puede comercializar directamente, en lugar de
> limitarse a instrumentos bursátiles"*.

Qué queda sembrado y por qué importa:

| Usuario | Rol | Monto | Perfil | Estado | Para qué sirve |
|---|---|---|---|---|---|
| `inversionista@demo.ec` | investor | — | *sin perfilar* | — | La cuenta con la que grabas el flujo en vivo del video |
| `asesor@demo.ec` | advisor | — | — | — | Login del panel de revisión |
| `juan@demo.ec` | investor | USD 20.000 | Moderado 12/15 | En revisión | **El caso del documento del reto**, reproducido exacto |
| `andrea@demo.ec` | investor | USD 50.000 | Agresivo 15/15 | En revisión | Segunda tarjeta en la cola |
| `carlos@demo.ec` | investor | USD 8.000 | Conservador 5/15 | **Aprobada** | Alimenta la pantalla de Auditoría |

Password de todos: `demo1234`.

### Las tres ideas que hacen valioso este seed

**1. Nada está escrito a mano.** Los puntajes se *leen* de `scoring_rules` con un `join`, y los
montos en USD los calcula Postgres a partir del porcentaje. Si mañana cambias los puntos de una
opción, el seed sigue siendo coherente. Es la prueba, dentro del propio seed, de que la fuente
de verdad son las reglas y no un número inventado.

**2. El caso de Juan Pérez cuadra solo.** Con 5 preguntas puntuables (1–3 pts, rango 5–15) y
umbrales 5–8 / 9–12 / 13–15, las respuestas del documento suman **12 → Moderado**, y la plantilla
moderada (60% DPF + 40% Fondo) sobre USD 20.000 da **USD 12.000 y USD 8.000** — las cifras exactas
del ejemplo. Se convierte en `test_scoring.py::test_caso_juan_perez`: un test que valida el sistema
contra el documento oficial del reto.

**3. La calificación de la institución es un segundo catálogo cerrado.** `institutions` guarda el
rating (AAA…AA) normalizado a un entero ordenable (`rating_tier`), y `profile_institution_rules`
guarda la regla **versionada**:

| Perfil | Admite | Por qué |
|---|---|---|
| Conservador | solo AAA / AAA- | Preservar capital ⇒ riesgo de contraparte mínimo |
| Moderado | hasta AA+ / AA | Mejores tasas asumiendo riesgo moderado |
| Agresivo | abierto, con aviso | Sin restricción, siempre explicando el riesgo |

El catálogo está diseñado para que esa regla **se vea trabajando**: el `DPF_LOJA_360` tiene la
**mejor tasa (9,4%)** y la **peor calificación (AA)**. El perfil conservador no puede tocarlo; el
agresivo sí. Ese trade-off, visible en pantalla, es lo que convierte la regla en producto en vez
de en adorno.

> Las calificaciones se siembran con **calificadora y fecha** (`rating_source`, `rating_date`) y son
> **referenciales**. La app las muestra siempre con su fuente — presentarlas como calificación
> vigente en tiempo real sería exactamente el tipo de dato inventado que castiga el criterio #3.

---

## FASE 1 — Auth y roles en el backend (3 h)

Todo el ruteo de la app depende de esto, así que va primero.

1. [ ] Agregar a `requirements.txt`:
   ```
   bcrypt==4.2.1
   pyjwt==2.10.1
   python-multipart==0.0.20
   ```
2. [ ] `src/services/auth_service.py` — `hash_password`, `verify_password` (bcrypt),
       `create_access_token` (JWT con `sub` = profile_id y **`role`**), `decode_token`.
3. [ ] `src/routes/auth_routes.py`:
   - `POST /api/auth/register` → crea `profiles` con `role='investor'` (self-signup solo de inversionistas)
   - `POST /api/auth/login` → devuelve `{ access_token, role, full_name }`
4. [ ] `src/dependencies/auth.py` — `get_current_user()` y `require_role('advisor')` como
       dependencias de FastAPI. **`require_role` es lo que hace pasar `test_roles.py`.**

**Prueba de que funciona:** login con `asesor@demo.ec / demo1234` devuelve un JWT cuyo
payload trae `"role": "advisor"`. Login con el inversionista trae `"role": "investor"`.

---

## FASE 1B — El monto en el backend (1 h) · lo que el pivote rompió

`investor_controller.py` hoy no sabe nada del monto. Sin esto, la propuesta muestra
porcentajes flotando en el aire en vez de USD.

1. [ ] `InvestorProfileCreate` (`src/models/investor.py`): agregar `monto: float = Field(..., gt=0)`.
2. [ ] `create_investor_profile`: guardar `amount` en el `insert` de `profiling_sessions`.
3. [ ] `get_portfolio_proposal`: al materializar la propuesta, escribir `proposals.total_amount`
       y calcular `proposal_items.amount = round(monto * percentage / 100, 2)`.
       **En SQL, no en Python** — es un número que entra al set permitido del guardarraíl y debe
       venir de la base.
4. [ ] `AssetAllocation`: agregar `monto_asignado`, `institucion`, `calificacion`,
       `calificacion_fuente`, `calificacion_fecha`, `plazo_dias`. Salen de
       `v_investor_proposal_summary`, que ya los expone.

**Bandera determinista de regalo:** si `proposal_items.amount < instruments.min_amount`, es un
punto de atención para el asesor ("el monto asignado a X queda bajo el mínimo de acceso"). Una
comparación, cero IA.

---

## FASE 2 — Endpoints del asesor (2 h) · cierra la HU3

1. [ ] `GET /api/advisor/queue` → `select * from v_advisor_review_queue` (protegido con `require_role('advisor')`).
       Debe devolver a Juan y Andrea de una.
2. [ ] `POST /api/advisor/proposals/{id}/review` con body `{ decision, comments?, edited_allocation? }`:
   - Escribe `advisor_reviews` (con `advisor_id`, `decided_at`, `rules_version_id`)
   - Actualiza `proposals.status`
   - Escribe `audit_log`
   - Si `decision='edited'`: **validar en servidor que los % suman 100.** No confíes en el cliente.
   - Si `decision='rejected'`: `comments` es obligatorio.
3. [ ] `GET /api/audit` → `select * from v_audit_timeline`.
4. [ ] `GET /api/investor/{id}/breakdown` → `select * from v_profiling_breakdown where session_id=...`

Las tres vistas ya existen en `seed.sql`, así que esto es casi solo plomería.

**Criterio HU3 cubierto:** fecha (`decided_at`), versión de reglas (`rules_version_id`) y
responsable (`advisor_id`) quedan registrados en cada decisión.

---

## FASE 3 — Gemini de verdad + guardarraíles (4 h) · el criterio #3

Aquí es donde se ganan los puntos de *Mitigación de Riesgos / Antialucinación* y donde
califica el premio del patrocinador (Gemini).

1. [ ] **`src/services/guardrails.py` — escribir esto ANTES que el LLM.** Es lo que se testea.
   - `validar_numeros(texto, valores_permitidos: set[float]) -> bool`
     Extrae con regex todos los números del texto y verifica que cada uno esté en el conjunto
     permitido: los `%` de la propuesta, **los USD de cada línea y el total**, el puntaje, los
     umbrales, los `expected_return` y los `term_days` de los productos citados. Un número
     fuera del conjunto → rechazo.
   - `validar_lexico(texto) -> bool` — regex sobre `garantiz`, `asegur`, `sin riesgo`,
     `vas a ganar`, `rentabilidad garantizada`.
   - `validar_catalogo(texto, codigos_validos) -> bool` — **dos catálogos cerrados ahora**:
     ningún producto fuera de `instruments` y **ningún banco ni calificación fuera de
     `institutions`**. Que la IA se invente un "Banco XYZ con calificación AAA" es tan grave
     como que se invente un porcentaje, y ahora es igual de imposible.
2. [ ] Reemplazar el mock de `ai_agent.py` con `ChatGoogleGenerativeAI`. **Los porcentajes van
       en el prompt, no los decide el modelo.** El esqueleto ya está escrito en el docstring
       de la función.
3. [ ] Envolver la llamada: generar → validar → si falla, **reintentar una vez** → si vuelve a
       fallar, **usar la explicación determinista de plantilla** (la que hoy ya devuelve el mock).
       Nunca se le muestra al usuario un número que la IA inventó.
4. [ ] Persistir cada turno en `llm_interactions` con `guardrail_passed`, `retry_count`, `model`
       y las `sources` en `metadata`. Las columnas ya existen (las agregó `seed.sql`).

> **La caída elegante es la clave:** si Gemini se cae o alucina durante el video, la app
> **sigue funcionando** con la explicación determinista. No hay demo rota por culpa del LLM.

---

## FASE 4 — Frontend (12 h) · el cuello de botella

Orden estricto por dependencia. No empieces la siguiente sin cerrar la anterior.

1. [ ] `npm i @react-navigation/bottom-tabs` (no está instalado y los tabs lo necesitan).
2. [ ] **Alinear el sobre de la API.** `src/services/http.ts` espera `{ success, data, message }`
       y FastAPI devuelve el objeto plano. **Decide ahora**: lo más rápido es simplificar `http.ts`.
       Es la decisión pendiente #1 del doc de arquitectura y bloquea la primera pantalla conectada.
3. [ ] `AuthContext` — agregar **`role`**. De eso depende todo el ruteo.
4. [ ] `RootNavigator`: sin sesión → `AuthStack`; `role==='investor'` → `InvestorTabs`;
       `role==='advisor'` → `AdvisorTabs`.
5. [ ] Pantallas del inversionista, en este orden:
   - `LoginPage` → `HomePage`
   - `CuestionarioPage` — **input de monto en USD** + las **5 preguntas** con chips
     (servidas por `GET /api/investor/questions`, no hardcodeadas)
   - `PropuestaPage` — donut (`react-native-svg` ya está) + tarjeta por producto con
     **nombre del banco y su calificación** (`Banco Pichincha · AAA`), el **`%` y los USD**,
     el plazo, **banner de disclaimer no descartable** y badge de estado
   - `ComoSeCalculoPage` — tabla respuesta → puntos → umbral, con **"reglas v1" a la vista**
     y el bloque de la regla de elegibilidad (*"tu perfil admite instituciones hasta AA"*)
6. [ ] Pantallas del asesor:
   - `ColaRevisionPage` → `DetallePropuestaPage` → botones Aprobar / Editar / Rechazar
   - `AuditoriaPage` — timeline de `v_audit_timeline`
7. [ ] El agente: `AgentSheet` con burbuja de chat + **source chips tocables**.

**No saltes `ComoSeCalculoPage` ni el banner de disclaimer.** Son criterios de aceptación
literales (HU1-3 y HU2-3), no adornos.

**El pie de la calificación es obligatorio:** cada vez que se muestre un rating, debajo va
`Fuente: BankWatch Ratings · 30-jun-2026 · referencial`. Es una línea de texto y es la
diferencia entre un dato citado y un dato inventado.

---

## FASE 5 — Tests (2 h) · apuntamos a NIVEL BÁSICO, con `test_guardrails` de regalo

```
tests/
├── test_scoring.py       ⭐ test_caso_juan_perez: las respuestas del documento del reto
│                            dan 12/15 → Moderado → 60/40 → USD 12.000 / USD 8.000.
│                            Umbrales de borde: 8/9 y 12/13.
├── test_allocation.py    select * from v_template_integrity → todas is_valid. (1 assert)
├── test_eligibility.py   ⭐ select * from v_institution_eligibility → todas is_eligible.
│                            "Ningún producto de la plantilla conservadora viene de una
│                             institución peor que AAA-." (1 assert)
├── test_guardrails.py    ⭐ EL TEST ESTRELLA
│                            · texto con un % o un USD inventado    → RECHAZADO
│                            · texto con "rentabilidad garantizada" → RECHAZADO
│                            · texto que cita un banco inexistente  → RECHAZADO
│                            · texto que solo cita datos reales     → ACEPTADO
├── test_agent.py         Mock de Gemini: el agente responde coherente y cita fuentes.
└── test_roles.py         Un investor llamando /api/advisor/* → 403.
```

Los tres marcados con ⭐ son los que hay que enseñar en el documento explicativo:

- **`test_caso_juan_perez`** valida el sistema contra el caso oficial del reto. Que reproduzca
  las cifras del documento sin que nadie las escribiera a mano es el argumento más fuerte que
  tienen de que el motor determinista funciona.
- **`test_guardrails`** prueba, con código, que el sistema es **incapaz** de mostrar un número
  o un emisor inventado. Criterio #3 demostrado, no prometido.
- **`test_eligibility`** prueba que la recomendación respeta un criterio objetivo de solidez del
  emisor. Es un `assert` y se explica en una frase.

Si el tiempo se agota, el **mínimo obligatorio** es documentar en el README los casos
probados a mano (input → esperado → obtenido). Eso ya puntúa.

---

## FASE 6 — Despliegue (2 h) · empezar TEMPRANO, no al final

- [ ] **Backend → Render** (free tier). Variables: `DATABASE_URL`, `GEMINI_API_KEY`, `CORS_ORIGINS`.
      Comando: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
- [ ] **Frontend web → Vercel**: `npx expo export --platform web` y publicar `dist/`.
- [ ] Apuntar `CORS_ORIGINS` al dominio de Vercel (hoy está en `*`).
- [ ] Verificar `/health` en producción **antes** de grabar el video.

> El primer deploy siempre falla por algo tonto. Hazlo apenas el backend tenga login,
> no cuando esté "listo".

---

## FASE 7 — Video y documento (4 h) · RESERVADAS, no negociables

- [ ] Grabar siguiendo el guion de [ARQUITECTURA-IA.md §11](ARQUITECTURA-IA.md).
- [ ] Documento explicativo con las 4 secciones que pide la guía:
      diagrama de arquitectura · track asignado · tipo de negocio · cómo se integraría a un
      sistema empresarial existente.
- [ ] **Mencionar explícitamente que se usa la API de Gemini** — es requisito literal para
      calificar al premio del patrocinador.
- [ ] Comprimir el ZIP, subir todo, mandar el correo.

---

## Cortes (qué NO hacemos, y por qué está bien)

Decidido a conciencia. Nada de esto es un criterio de aceptación:

| Se corta | Por qué se puede |
|---|---|
| **Voz (FAB + expo-audio + STT)** | Es el gancho más vistoso, pero cuesta ~6 h (grabación + multipart + Gemini audio + TTS) y ninguna HU la pide. **El diferenciador real son los source chips, no el micrófono.** Hazla solo si a la hora 24 ya cerraste la Fase 4. |
| **Refresh tokens (`auth_sessions`)** | JWT de acceso simple alcanza para 36 h. La tabla queda en el esquema, sin usar. |
| **LangGraph completo (5 nodos)** | Con `router` + `qa_node` + `guardrail_node` + `refuse_node` basta para evidenciar arquitectura agéntica. El `profiling_node` conversacional es lo caro; el cuestionario con chips cumple igual la HU1. |
| **`EditarAsignacionPage` con sliders** | Aprobar y Rechazar cubren la HU3. "Editar" puede ser un input numérico simple con validación de suma 100. |

---

## Checklist final: criterio → dónde se ve

Antes de mandar el correo, verifica que cada fila tiene una evidencia concreta:

| Criterio del track | Evidencia |
|---|---|
| HU1 · cuestionario por IA | `CuestionarioPage` + `GET /api/investor/questions` (5 preguntas, servidas por la BD) |
| HU1 · reglas visibles y versionadas | `ComoSeCalculoPage`: badge **"reglas v1"**, umbrales y regla de elegibilidad |
| HU1 · el usuario entiende cómo influyó | Tabla respuesta → puntos → umbral (`v_profiling_breakdown`) |
| HU2 · catálogo aprobado | `instruments` **+ `institutions`**; el guardarraíl rechaza productos y bancos fuera de catálogo |
| HU2 · % + riesgo + explicación | `PropuestaPage`: donut + **% y USD** + emisor con calificación + texto de Gemini |
| HU2 · no ejecuta ni promete | Banner fijo + `status='pending_review'` + léxico prohibido |
| HU3 · resumen al asesor | `DetallePropuestaPage` + banderas deterministas (monto bajo el mínimo, puntaje al borde del umbral) |
| HU3 · aprobar / editar / rechazar | 3 botones → `POST /api/advisor/proposals/{id}/review` |
| HU3 · fecha + versión + responsable | `advisor_reviews` + `AuditoriaPage` |
| Eval #1 · arquitectura agéntica | LangGraph + lógica separada de la UI (backend ≠ front) |
| Eval #2 · **ajuste al track** | 3 HU cerradas + **productos que un banco ecuatoriano vende de verdad** (DPF y fondos, no ETFs) |
| Eval #3 · **antialucinación** | `guardrails.py` + `test_guardrails.py` + `test_eligibility.py` + source chips + `llm_interactions` |
| Eval #4 · demo y UX | El video de 3 min, con el caso de Juan Pérez del propio documento del reto |
| Premio Gemini | Mencionado explícitamente en el documento explicativo |
