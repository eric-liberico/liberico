# Spec: Cutover a nombres nuevos de Edge Functions

- **Fecha:** 2026-07-01
- **Estado:** v3 — aprobado (con ajustes de la 2ª ronda de review) para pasar al plan de implementación.
- **Rama de trabajo:** `feat/edge-naming-cutover`
- **Proyecto prod (Supabase):** `tlspxuwiakcrhshwvjeo`

## 1. Contexto

En junio de 2026 el refactor `refactor/edge-naming` (2026-06-15) renombra las Edge Functions de producto/sistema a un esquema por curso:

- `lita-*` = Language A: Literature (ES-A + EN-A comparten función; el idioma lo distingue `course_key`). Sub-familias `lita-p1-*`, `lita-p2-*`, `lita-io-*`.
- `spab-*` = Spanish B. Sub-familias `spab-p1-*`, `spab-p2-*`, `spab-oral-*`.
- `core-*` = transversales (transcripción, study-plan, teacher-chat). `billing-*`, `booking-*`, `account-*` = sistema.
- `stripe-webhook` se deja con su nombre (lo llama Stripe).

**Lo que pasó (y por qué existe este spec):** las funciones nuevas se **desplegaron a prod en paralelo** a las viejas y se aplicaron las migraciones de rename, pero **el cutover del frontend nunca ocurrió**. Hoy:

- El frontend de `main` sigue llamando a los **nombres viejos** (cero referencias a nombres nuevos en `src/`; `main` no tiene los directorios nuevos).
- Prod arrastra **dos sets** (~38 viejas en uso + ~32 nuevas huérfanas; `add-test-credits`/`dev-test-credits` ya borradas de prod el 2026-06-30).
- La rama `refactor/edge-naming` está **141 commits por detrás de `main`** → inservible para mergear.

**Objetivo:** completar el cutover rehaciéndolo sobre el `main` actual, dejando **un solo set** (nombres nuevos) en repo, frontend y prod.

## 2. Estado actual verificado (2026-06-30/07-01)

- **Migraciones de rename aplicadas** en main y prod (`20260615130000` Spanish B, `20260615140000` Literatura): renombraron los literales de las **RPC de cuota** e insertan `llm_uso` con el nombre nuevo, consultando con **alias viejo+nuevo** (`edge_function IN ('nuevo','viejo')`). → **No se necesitan migraciones nuevas** (salvo lo que destape el Lote 0, §5).
- **CORRECCIÓN (v2):** NO existe `FEATURE_BY_FUNCTION` con alias. `admin-get-metrics` agrupa por `u.edge_function` **crudo** ([admin-get-metrics/index.ts:204-218](../../../supabase/functions/admin-get-metrics/index.ts)). Además `admin.tsx` tiene **claves viejas hardcodeadas** (`evaluate-analysis`, `evaluate-paper2`, …) y `admin-get-users` limita rate por `.eq("edge_function","evaluate-analysis")` ([admin-get-users/index.ts:93](../../../supabase/functions/admin-get-users/index.ts)). → **El admin NO está preparado para nombres nuevos** y entra en alcance (§3, §5).
- **`edge_function` se usa para MÁS que loguear:** también para consultar cuotas/límites diarios con `.eq/.in` (p.ej. [tts-listening-b/index.ts:93](../../../supabase/functions/tts-listening-b/index.ts), [generate-questions-paper2-b/index.ts:157](../../../supabase/functions/generate-questions-paper2-b/index.ts)). Cambiar solo el insert desalinea las cuotas.
- **`p_concepto` (créditos) ≠ nombre de función:** algunas funciones usan el nombre viejo como concepto (`evaluate-paper2-b/index.ts:333` → `p_concepto:"evaluate-paper2-b"`), otras usan concepto semántico (`generate-band5-essay/index.ts:362` → `p_concepto:"feedback-completo-p1"`). `p_concepto` mapea a precios en `evaluacion_precios`. → **`p_concepto` se deja ESTABLE** (ver §4).
- **`add-test-credits`** sigue en el repo, se invoca desde [comprar-creditos.tsx:203](../../../src/routes/comprar-creditos.tsx) (tras `VITE_ENABLE_TEST_CREDITS`), y **no está en los checks de `deno.json`**. Ya borrada de prod.
- **Actividad real (`llm_uso`):** dominan los nombres viejos; dos nuevos (`lita-p1-evaluate`, `spab-oral-session`) tienen actividad reciente, probablemente de un preview apuntando a prod (§8).
- Tráfico global bajo (app tras el muro "Próximamente").

## 3. Objetivo y alcance

**En alcance:**
- Renombrar en `main` las funciones viejas a sus nombres nuevos sobre el código actual (`git mv`).
- Actualizar **todos** los usos de `edge_function` (identidad) en cada función: inserts, updates, `.eq/.in` de cuotas/límites, `p_edge_function` de RPC, y logging. **Excluye `p_concepto`** (§4).
- Actualizar call-sites del frontend, `supabase/config.toml` y las tareas `check:edge`/`lint:edge` de `deno.json`.
- **Normalizar el admin a nombres nuevos** (o viejo+nuevo): `admin-get-metrics`, `admin-get-users` (rate limit), claves en `admin.tsx`.
- Gate de despliegue del frontend de prod antes de borrar viejas.
- Verificar por lote y borrar las viejas de prod.

**Fuera de alcance (riesgo/asunción, no se resuelve aquí):**
- Separación dev/prod de Cloudflare y preview-escribe-en-prod (ver `docs/superpowers/plans/2026-06-30-separacion-cloudflare-dev-prod.md`).
- Funciones `admin-*`: el refactor no las renombró; se quedan con su nombre (pero SÍ se corrigen las claves/filtros de dentro que apuntan a nombres viejos de OTRAS funciones).
- `stripe-webhook`: nombre estable.
- `p_concepto` y `evaluacion_precios`: **no se tocan** (§4).

## 4. Decisiones de diseño (aprobadas; v2 añade 5–7)

1. **Renombrar en sitio** (`git mv`), no mergear la rama vieja. Repo con **un solo set**. La rama `refactor/edge-naming` se usa solo como referencia y se borra al final.
2. **Despliegue por lotes** (Spanish B → Literatura → Core/sistema). Cada lote es un ciclo cerrado y verificable.
3. **Borrar las viejas por lote**, tras el gate de frontend (§5, paso 8).
4. **Alias en RPC de cuota** (de las migraciones ya aplicadas) se quedan permanentes (los `llm_uso` históricos tienen nombres viejos).
5. **(v2) `p_concepto` se deja ESTABLE.** No se renombra aunque coincida con el nombre viejo de la función; NO se migra `evaluacion_precios`. El renombrado debe ser quirúrgico: cambia la *identidad* de la función (`edge_function`) pero NO los literales `p_concepto`. Un find/replace ciego del nombre viejo está **prohibido** por esto.
6. **(v2) Admin normalizado a nombres nuevos** (o viejo+nuevo donde haga falta preservar histórico): grouping de `admin-get-metrics`, rate limit de `admin-get-users`, y claves de `admin.tsx`.
7. **(v2/v3) Seguridad operativa de deploy/borrado:** `functions delete … --yes` (no interactivo); **PROHIBIDO `functions deploy --prune`** (borraría en remoto lo que no esté en local); **PROHIBIDO `functions deploy` SIN nombre** — la CLI desplegaría TODAS las locales (incluida `dev-test-credits`) a prod. Todos los deploys por **allowlist explícita**, nombre a nombre, solo de las funciones del lote.
8. **(v3) Preflight en dev cuando sea viable:** desplegar y hacer smoke en **dev (`vmlsyansyjgopqsrvyoe`)** antes de prod (coherente con `docs/arquitectura.md`: dev → prod). Dev tiene pendientes (password del pooler, secrets) que pueden limitar el preflight de alguna función; si no es viable, documentarlo e ir a prod con más cuidado.
9. **(v3) Aislamiento por lote:** cada lote en su **propia rama/PR** (o cherry-picks acotados) con SOLO sus cambios; nunca mergear una rama que arrastre cambios de lotes futuros.
10. **(v3) Gate por tipo** (ver §5 paso 7): LLM → `llm_uso`; no-LLM (`booking-*`, `billing-checkout`, `account-delete`) → smoke/logs de red confirmando que prod llama `/functions/v1/<nuevo>`.
11. **(v3) Frontend por lotes, 3 deploys** (decisión final): vale el coste operativo por menor blast radius y aislamiento entre Spanish B / Literature / Core.

## 5. Procedimiento

### Lote 0 — Inventario, gap-fill y decisiones (una vez, antes del Lote 1)

1. Listar todas las funciones de `main` y cruzar con el mapeo (§6). Confirmar cada par contra las migraciones `20260615130000/140000` y contra los directorios nuevos ya desplegados en prod.
2. **Asignar nombre nuevo a funciones post-refactor** (no están en el mapeo). **Decidido:** `manage-booking` (2026-06-29) → **`booking-manage`** (encaja con `booking-create`/`booking-confirm`). Verificar que ninguna otra quede sin nombre nuevo.
3. **`add-test-credits` (decidido):** renombrar a **`dev-test-credits`**, mantener **solo-dev** (nunca desplegar a prod), y **añadirla a `check:edge`/`lint:edge`** de `deno.json` (hoy falta). Además, **verificar `VITE_ENABLE_TEST_CREDITS` ausente/false en el build de prod** de Cloudflare (para que el botón de créditos de prueba no aparezca en prod).
4. **Confirmar política `p_concepto`**: estable, sin migración de `evaluacion_precios` (§4.5).
5. Si el inventario destapa una función nueva sin alias en RPC de cuota/`llm_uso` (p.ej. `booking-manage`), añadir esa cobertura → **única posible fuente de una migración nueva**.

### Procedimiento por lote (se repite: Spanish B → Literatura → Core/sistema)

1. **`git mv`** de cada función viejo→nuevo del lote.
2. **Actualizar TODOS los usos de `edge_function`** dentro de esas funciones: inserts a `llm_uso`, `.eq/.in` de consultas de cuota/límite diario, `p_edge_function` de RPC. **NO tocar `p_concepto`.**
3. **`config.toml`** (entradas `verify_jwt`) y **`deno.json`** (rutas en `check:edge`/`lint:edge`) → nombres nuevos.
4. **Frontend del lote**: call-sites `invoke("…")`/`fetch(.../functions/v1/…)` + helpers/constantes → nombre nuevo. Y, cuando el lote incluya funciones referenciadas por el admin, actualizar `admin.tsx` (claves) y `admin-get-users` (rate limit) a nuevo (o viejo+nuevo).
5. **Desplegar las nuevas** — **preflight a dev primero cuando sea viable** (`--project-ref vmlsyansyjgopqsrvyoe` + smoke), luego prod: `supabase functions deploy <nuevo> --project-ref tlspxuwiakcrhshwvjeo`. **Solo por nombre explícito** (nunca `deploy` sin nombre), aditivo (las viejas siguen). **Nunca `--prune`.**
6. **Deploy del frontend de prod**: merge de **la rama/PR de ESTE lote** (solo sus cambios, §4.9) a `main` → push → **autodeploy de Cloudflare**. Son **3 deploys** en total, uno por lote.
7. **GATE por tipo (paso crítico):** confirmar que **el frontend de prod ya sirve los nombres nuevos** antes de borrar. **LLM:** `llm_uso` registra el nombre nuevo desde tráfico real de prod y el viejo se estanca. **No-LLM** (`booking-*`, `billing-checkout`, `account-delete` — no escriben `llm_uso`): smoke test + logs de red/función confirmando que prod invoca `/functions/v1/<nuevo>` y no el viejo. **No pasar al 8 sin esto.**
8. **Borrar las viejas** del lote: `supabase functions delete <viejo> --project-ref tlspxuwiakcrhshwvjeo --yes`.

## 6. Mapeo viejo → nuevo

### Lote 1 — Spanish B (`spab-*`)
| Viejo | Nuevo |
|---|---|
| `evaluate-paper1-b` | `spab-p1-evaluate` |
| `evaluate-paper2-b` | `spab-p2-evaluate` |
| `generate-questions-paper2-b` | `spab-p2-questions` |
| `tts-listening-b` | `spab-p2-listening-tts` |
| `evaluate-oral-b` | `spab-oral-evaluate` |
| `create-oral-b-session` | `spab-oral-session` |

### Lote 2 — Literature (`lita-*`)
| Viejo | Nuevo |
|---|---|
| `evaluate-analysis` | `lita-p1-evaluate` |
| `generate-analysis-feedback` | `lita-p1-feedback` |
| `generate-analysis-extras` | `lita-p1-extras` |
| `generate-band5-essay` | `lita-p1-model-essay` |
| `generate-rewrite-suggestions` | `lita-p1-rewrite` |
| `rewrite-feedback` | `lita-p1-rewrite-feedback` |
| `generate-practice-text` | `lita-p1-practice-text` |
| `evaluate-paper2` | `lita-p2-evaluate` |
| `generate-paper2-feedback` | `lita-p2-feedback` |
| `generate-paper2-extras` | `lita-p2-extras` |
| `generate-band5-essay-p2` | `lita-p2-model-essay` |
| `generate-rewrite-suggestions-p2` | `lita-p2-rewrite` |
| `evaluate-oral` | `lita-io-evaluate` |
| `evaluate-oral-notes` | `lita-io-notes-evaluate` |
| `generate-oral-feedback` | `lita-io-feedback` |
| `generate-oral-annotations` | `lita-io-annotations` |
| `suggest-oral-topics` | `lita-io-topics` |
| `create-oral-simulation-session` | `lita-io-sim-session` |

### Lote 3 — Core / sistema
| Viejo | Nuevo |
|---|---|
| `teacher-chat` | `core-teacher-chat` |
| `generate-study-plan` | `core-study-plan` |
| `transcribe-image` | `core-transcribe-image` |
| `transcribe-oral` | `core-transcribe-audio` |
| `create-checkout-session` | `billing-checkout` |
| `create-booking` | `booking-create` |
| `confirm-booking` | `booking-confirm` |
| `manage-booking` | `booking-manage` |
| `delete-account` | `account-delete` |

**`add-test-credits`:** ver Lote 0 (decisión explícita, no en lotes de prod).

## 7. Verificación y rollback

- **Verificación por lote:** query read-only a `llm_uso` (aparece el nombre nuevo desde prod real, el viejo se estanca) + smoke test manual de cada feature del lote + revisar que el panel admin sigue mostrando datos (métricas/rate limit) para las funciones del lote.
- **Rollback por lote:** hasta el paso 8 las viejas siguen desplegadas; revertir = `git revert` del frontend del lote + re-deploy, o simplemente no borrar las viejas. Radio pequeño.
- **Punto de no retorno:** paso 8 (borrar viejas), solo tras el GATE del paso 7.

## 8. Riesgos y asunciones

- **Preview-escribe-en-prod:** un preview con nombres nuevos ya golpea prod (`lita-p1-evaluate` con actividad 21-jun). El cutover no lo empeora, pero conviene resolver la separación dev/prod aparte para no contaminar métricas.
- **Find/replace ciego del nombre viejo:** prohibido — arrastraría `p_concepto` y rompería pricing (§4.5). El renombrado es quirúrgico.
- **Cuotas desalineadas:** si se olvida un `.eq/.in` de cuota (no solo el insert), los límites diarios se rompen. El paso 2 cubre "todos los usos".
- **Admin ciego a nombres nuevos:** métricas/rate limit/`admin.tsx` apuntan a nombres viejos → hay que normalizarlos o el panel deja de contar tras el cutover.
- **Rama `refactor/edge-naming`:** se descarta como fuente; borrarla al terminar.
- **Tráfico bajo** (muro "Próximamente") → ventana de bajo riesgo.

## 9. Estado final esperado

- `supabase/functions/` en `main`: un solo set con nombres nuevos (+ `stripe-webhook` y `admin-*` sin renombrar; `add-test-credits`/`dev-test-credits` según decisión del Lote 0, solo-dev).
- Frontend y admin llamando/contando exclusivamente con nombres nuevos (o viejo+nuevo en métricas para no perder histórico).
- Prod: solo funciones nuevas desplegadas (viejas borradas con `--yes`); migraciones, alias de cuota y `evaluacion_precios`/`p_concepto` intactos.
- `refactor/edge-naming` borrada.
