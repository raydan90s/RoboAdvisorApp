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

## FASE 1 — Auth y roles en el backend · ✅ HECHA (11-jul)

Todo el ruteo de la app depende de esto, así que va primero.

1. [x] Agregar a `requirements.txt`:
   ```
   bcrypt==4.2.1
   pyjwt==2.10.1
   python-multipart==0.0.20
   ```
2. [x] `src/services/auth_service.py` — `hash_password`, `verify_password` (bcrypt),
       `create_access_token` (JWT con `sub` = profile_id y **`role`**), `decode_token`.
3. [x] `src/routes/auth_routes.py`:
   - `POST /api/auth/register` → crea `profiles` con `role='investor'` (self-signup solo de inversionistas)
   - `POST /api/auth/login` → devuelve `{ access_token, role, full_name }`
   - `GET  /api/auth/me` → el usuario del token (el front revalida la sesión guardada)
4. [x] `src/dependencies/auth.py` — `get_current_user()` y `require_role(Rol.ADVISOR)` como
       dependencias de FastAPI. **`require_role` es lo que hace pasar `test_roles.py`.**
5. [x] `JWT_SECRET` en `.env` / `.env.example` (y **hay que ponerlo en Render**, Fase 6).

**Prueba de que funciona (corrida):** login con `asesor@demo.ec / demo1234` devuelve un JWT
cuyo payload trae `"role": "advisor"`; el inversionista trae `"role": "investor"`. Contraseña
mala → 401. `require_role(ADVISOR)`: asesor 200 · inversionista **403** · sin token 401.

---

## FASE 1B — El monto en el backend · ✅ HECHA (11-jul)

1. [x] `InvestorProfileCreate`: `monto: Decimal = Field(..., gt=0, max_digits=14, decimal_places=2)`.
2. [x] `create_investor_profile` guarda `amount` en `profiling_sessions`.
3. [x] `get_portfolio_proposal` copia el monto a `proposals.total_amount` (snapshot) y calcula
       `proposal_items.amount` **en SQL**: `round(total_amount * percentage / 100, 2)`.
4. [x] `AssetAllocation`: `monto_asignado`, `institucion`, `calificacion`, `calificacion_fuente`,
       `calificacion_fecha`, `plazo_dias`.

**Prueba (por la API real):** POST sin `monto` → 422; con monto negativo → 422; con USD 20.000 y
las respuestas del reto → 12 pts → Moderado → **60% (USD 12.000) / 40% (USD 8.000)**. El caso del
documento oficial, reproducido sin escribir un solo número a mano.

**Bandera determinista:** si `proposal_items.amount < instruments.min_amount`, el asesor lo ve.
Implementada en la Fase 2.

---

## FASE 2 — Endpoints del asesor · ✅ HECHA (11-jul, corrida contra Supabase)

1. [x] `GET /api/advisor/queue` → `v_advisor_review_queue`. Devuelve a Juan y a Andrea de una.
2. [x] `POST /api/advisor/proposals/{id}/review` con body `{ decision, comments?, edited_allocation? }`:
   - Escribe `advisor_reviews` (con `advisor_id`, `decided_at`, `rules_version_id`)
   - Actualiza `proposals.status` · Escribe `audit_log`
   - `edited`: los % deben sumar **exactamente 100**, sin instrumentos repetidos, y **cada
     código se verifica contra `instruments`** — el catálogo es tan cerrado para el asesor
     como para el LLM. Los USD los recalcula **Postgres**, no Python.
   - `rejected`: `comments` obligatorio.
3. [x] `GET /api/audit` → `v_audit_timeline` (también `require_role(ADVISOR)`).
4. [x] `GET /api/investor/{id}/breakdown` → `v_profiling_breakdown`. Acepta `?session_id=` para
       que el asesor abra la sesión que originó *esa* propuesta y no la más reciente.

Extras que no estaban en la lista y sin los cuales el front no podía construirse:

- [x] `GET /api/advisor/proposals/{id}` — el detalle que pinta `DetallePropuestaPage`: líneas con
      emisor, calificación **con fuente y fecha**, plazo, mínimo de acceso, e historial de revisiones.
- [x] **Banderas deterministas** (HU3, "resumen al asesor"): *monto asignado bajo el mínimo de
      acceso*, *puntaje en el borde del umbral*, *sesión sin monto*. Son comparaciones, cero IA.
- [x] Una propuesta se decide **una sola vez**: `select … for update` + estado ≠ `pending_review`
      → **409**. Una decisión no se sobrescribe.

**Prueba de que funciona (corrida contra la base):** asesor → cola con Juan y Andrea; inversionista
→ **403**; sin token → **401**. Rechazar sin comentario, editar sumando 90, citar un producto fuera
de catálogo, repetir un instrumento y mandar `edited_allocation` en un `approve` → los cinco **422**.
Edición válida 70/30 sobre USD 10.000 → Postgres reescribe **USD 7.000 / 3.000**, `status='edited'`,
sale de la cola, y la segunda decisión → **409**. Breakdown de Juan: 12 pts → Moderado (umbral 9–12,
reglas v1). Un inversionista pidiendo el breakdown de otro → **403**.

**Criterio HU3 cubierto:** fecha (`decided_at`), versión de reglas (`rules_version_id`) y
responsable (`advisor_id`) quedan registrados en cada decisión.

> ⚠️ La prueba dejó en la base un inversionista de mentira, **`ZZ Test Fase2`**
> (`26d8317f-5522-4195-869a-c4058b44e5ca`), con su propuesta en `edited`. **No sale en la cola**
> (solo lista `pending_review`), pero **sí aparece en la AuditoriaPage**. Bórralo antes de grabar:
> ```bash
> psql "$U" -1 -c "delete from audit_log where actor_id='26d8317f-5522-4195-869a-c4058b44e5ca'
>                     or entity_id='d0b29a9a-c9d5-4960-adc9-a66e7fc4b207';
>                  delete from profiles where id='26d8317f-5522-4195-869a-c4058b44e5ca';"
> ```

---

## FASE 3 — Gemini de verdad + guardarraíles · ✅ HECHA (11-jul)

1. [x] **`src/services/guardrails.py`, escrito ANTES que el LLM.** `validar_numeros` ·
       `validar_lexico` · `validar_catalogo` (productos, **emisores y calificaciones**).
       Devuelve un `Veredicto` con motivos: el rechazo es auditable, no un booleano mudo.
2. [x] `ai_agent.py` llama a Gemini de verdad (`ChatGoogleGenerativeAI`, temperature 0.2).
       Los % y los USD van **en el prompt**; el modelo solo redacta.
3. [x] generar → validar → **reintentar una vez, diciéndole al modelo qué hizo mal** → si
       vuelve a fallar, **explicación determinista**. Nunca se muestra un número inventado.
4. [x] Cada turno queda en `llm_interactions` con `guardrail_passed`, `retry_count`, `model`
       y los **source chips** en `metadata`.

> ⚠️ **El modelo importa: `gemini-2.0-flash` NO funciona con esta clave.** Devuelve
> `429 … limit: 0`, que no es "te pasaste de cuota" sino "este modelo no está habilitado para
> el proyecto". El `.env` ahora apunta a **`gemini-flash-latest`**, que sí responde. Si cambias
> de clave, verifica el modelo antes de grabar:
> ```bash
> curl -s "https://generativelanguage.googleapis.com/v1beta/models/$MODELO:generateContent?key=$K" \
>   -H 'Content-Type: application/json' -d '{"contents":[{"parts":[{"text":"Di OK"}]}]}'
> ```

**Prueba (con la API real de Gemini):** el texto generado para el caso de Juan cita 12/15, USD
20.000, 60% / USD 12.000 y 40% / USD 8.000, con los dos bancos y sus AAA — y **pasa el
guardarraíl al primer intento**. La caída elegante también se probó *en condiciones reales*: con
el modelo mal configurado Gemini devolvió 429 y el usuario igual recibió la explicación correcta,
escrita por la plantilla. La demo no se rompe por culpa del LLM.

---

## FASE 4 — Frontend (12 h) · el cuello de botella

Orden estricto por dependencia. No empieces la siguiente sin cerrar la anterior.

1. [x] `npm i @react-navigation/bottom-tabs` (instalado, `^7.18.8`). **Solo lo usa el asesor.**
       El inversionista se quedó como stack: su flujo es lineal (perfilarse → propuesta →
       cómo se calculó) y una pestaña "Propuesta" para alguien sin perfilar solo podría
       mostrar un 404.
2. [x] **Alinear el sobre de la API.** ✅ Resuelto: `http.ts` lee el objeto plano de FastAPI y
       traduce `{ detail }` (string o lista de errores 422) a `ApiError`. Se eliminó
       `{ success, data, message }`. *Decisión pendiente #1 del doc de arquitectura: cerrada.*
       Bonus: `tokenStorage.ts` cae a AsyncStorage en web, porque `expo-secure-store` **no existe
       en web** y el despliegue del reto es web.
3. [x] `AuthContext` — **`role`** agregado; `signIn(TokenResponse)` guarda token + usuario.
4. [x] `RootNavigator`: sin sesión → `AuthStack`; `investor` → `InvestorStack`; `advisor` →
       `AdvisorStack`. Hoy son native-stacks con una pantalla; se convierten en Tabs en el paso 1.
5. [x] **Pantallas del inversionista · HECHAS (11-jul).**
   - [x] `LoginPage` → `InicioPage`. `InicioPage` bifurca según el **404** de
         `GET /api/investor/{id}`: ese 404 no es un error, es "todavía no te perfilaste"
         — el estado con el que arranca `inversionista@demo.ec` para grabar el video.
   - [x] `CuestionarioPage` — monto en USD + las 5 preguntas con chips, servidas por
         `GET /api/investor/questions`. Cero preguntas hardcodeadas y cero puntajes en el
         front: solo se mandan los códigos y `scoring_rules` puntúa.
   - [x] `PropuestaPage` — donut (`react-native-svg`) + tarjeta por producto con banco y
         calificación, el % **y** los USD, plazo, `DisclaimerBanner` no descartable y
         `EstadoBadge`.
   - [x] `ComoSeCalculoPage` — tabla respuesta → puntos → total, el umbral que decidió el
         perfil, badge **"reglas v1"** y el bloque de elegibilidad por calificación.

   Tres decisiones que sostienen el criterio #3 y conviene no deshacer:

   - **El pie de la calificación vive dentro del componente `Calificacion`**, no suelto en
     cada pantalla. Así es imposible pintar un rating sin su calificadora y su fecha: no
     hay forma de mostrar uno sin el otro aunque alguien lo intente.
   - **`utils/formato.ts` no hace aritmética de negocio.** Agrupa miles y pone comas; los
     USD de cada línea llegan ya calculados por Postgres. El front nunca multiplica un
     porcentaje por un monto.
   - **El donut no normaliza los porcentajes.** Si no suman 100, se ve el hueco. Un donut
     que se autocompleta escondería un error de datos.

   **Verificado:** `tsc --noEmit` limpio · `expo export --platform web` bundlea (1,42 MB) ·
   los cuatro endpoints contestan con exactamente las formas que declaran los tipos
   (Juan: 12/15 → moderado → 60% USD 12.000 / 40% USD 8.000, ambos AAA con fuente y fecha).
6. [x] **Pantallas del asesor · HECHAS (11-jul).** Tabs (Cola · Auditoría) con el detalle
       apilado encima: mientras decide, el asesor no tiene barra de navegación que lo
       saque a medias.
   - [x] `ColaRevisionPage` → `DetallePropuestaPage` → Aprobar / Editar / Rechazar.
         Rechazar exige comentario; editar muestra la **suma en vivo** de los % y solo
         habilita el botón en 100. El servidor revalida las dos cosas: acá se acompaña la
         regla, no se reimplementa. El **409** de "ya fue decidida" no se reintenta, se
         muestra.
   - [x] `AuditoriaPage` — `v_audit_timeline` pintado tal cual, con fecha, responsable y
         versión de reglas.
   - [x] `ComoSeCalculoPage` se registra en **los dos** stacks: el asesor la abre con el
         `?session_id=` que originó *esa* propuesta (para eso existía el parámetro).

   > ⚠️ **`audit_log` no guarda las acciones que uno supondría.** Guarda el par
   > (`entity_type`, `action`): `proposal/created` y `advisor_review/approved` — no
   > `proposal_approved`. La primera versión de `AuditoriaPage` mapeaba nombres inventados
   > y habría mostrado el código crudo en pantalla. Está corregida contra los pares reales,
   > y ante un par desconocido muestra el código antes que una etiqueta que mienta.

   **Verificado:** `tsc --noEmit` limpio · `expo export --platform web` bundlea (1,48 MB) ·
   cola, detalle y auditoría contestan con las formas que declaran los tipos. La bandera
   determinista de Juan aparece de verdad: *"el puntaje (12) está en el borde del rango
   del perfil Moderado (9–12)"*. **No se decidió ninguna propuesta en la verificación**:
   Juan y Andrea siguen `pending_review` para el video.
7. [ ] El agente: `AgentSheet` con burbuja de chat + **source chips tocables**.

**No saltes `ComoSeCalculoPage` ni el banner de disclaimer.** Son criterios de aceptación
literales (HU1-3 y HU2-3), no adornos.

**El pie de la calificación es obligatorio:** cada vez que se muestre un rating, debajo va
`Fuente: BankWatch Ratings · 30-jun-2026 · referencial`. Es una línea de texto y es la
diferencia entre un dato citado y un dato inventado.

---

## FASE 5 — Tests · ✅ HECHA (11-jul) — **46 pasan**

```bash
cd ROBOADVISORY-BACKEND && .venv/Scripts/python -m pytest -q   # 46 passed
```

Los seis archivos existen y corren. Los de scoring/elegibilidad van **contra la base real**
(el motor determinista *es* la base; probarlo contra un mock no probaría nada). Dos hallazgos
que los tests destaparon y que no eran errores de los tests:

- El guardarraíl leía **`AA+` como `AA`** (el `\b` no existe después de un `+`): una calificación
  inventada se reportaba como otra distinta. Corregido con un lookahead.
- No detectaba emisores con conector en minúscula (**"Banco del Pacífico Andino"** pasaba colado).
  Corregido.
- El PLAN afirmaba que el DPF de Loja tenía "la mejor tasa del catálogo": **es falso**, el Fondo de
  Crecimiento rinde 11,5% y es AAA. Loja tiene la mejor tasa **entre los depósitos a plazo**, que
  es donde el trade-off tasa/calificación es real. El test dice ahora la verdad.

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

## FASE 5B — Auth de los endpoints del inversionista · ✅ HECHA (11-jul)

Se cerró el agujero (`/portfolio` y `/investor/{id}` eran públicos) y, al hacerlo, apareció
**un bug de identidad mucho peor**:

> `register` creaba una fila en `profiles`… y `create_investor_profile` **creaba otra**. El
> `investor_id` del cuestionario nunca era el del usuario logueado. El cliente quedaba con dos
> identidades y su propia propuesta le habría dado **403** apenas se cerrara la auth. En el
> front (Fase 4) esto se habría manifestado como "el cuestionario funciona pero la propuesta
> dice que no es tuya", con horas de depuración en el peor momento.

1. [x] `POST /api/investor/profile` es **autenticado** (`require_role(INVESTOR)`) y le adjunta el
       perfilamiento **al usuario del token**. `nombre` y `email` salieron del body: los pone el
       token, porque nadie perfila a nombre de otro. (⚠️ **contrato roto para el front**.)
2. [x] `GET /portfolio`, `/breakdown` y `/{id}` usan `exige_dueno_o_asesor`: el cliente ve lo
       suyo; el asesor, lo de cualquiera (revisar carteras ajenas es su trabajo).
3. [x] La suite ya **no ensucia la base**: las cuentas que crea, las borra (`cuenta_desechable`).

**Prueba (flujo real del video):** login `inversionista@demo.ec` → cuestionario → el
`investor_id` **coincide con el del login** → su cartera da 200 con USD 12.000 / 8.000; la
cartera de Juan con ese mismo token da **403**; sin token, **401**. **55 tests pasan.**

La base quedó limpia: solo los 5 usuarios del seed, con `Inversionista Demo` sin perfilar para
grabar el flujo en vivo.

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
