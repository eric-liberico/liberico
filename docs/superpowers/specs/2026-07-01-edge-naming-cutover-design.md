# Spec: Cutover a nombres nuevos de Edge Functions

- **Fecha:** 2026-07-01
- **Estado:** Diseño aprobado; pendiente de plan de implementación
- **Rama de trabajo:** `feat/edge-naming-cutover`
- **Proyecto prod (Supabase):** `tlspxuwiakcrhshwvjeo`

## 1. Contexto

En junio de 2026 se hizo el refactor `refactor/edge-naming` (2026-06-15) que renombra las Edge Functions de producto/sistema a un esquema por curso:

- `lita-*` = Language A: Literature (ES-A + EN-A comparten función; el idioma lo distingue `course_key`). Sub-familias `lita-p1-*`, `lita-p2-*`, `lita-io-*`.
- `spab-*` = Spanish B. Sub-familias `spab-p1-*`, `spab-p2-*`, `spab-oral-*`.
- `core-*` = transversales (transcripción, study-plan, teacher-chat). `billing-*`, `booking-*`, `account-*` = sistema.
- `stripe-webhook` se deja con su nombre (lo llama Stripe).

**Lo que pasó (y por qué existe este spec):** las funciones nuevas se **desplegaron a prod en paralelo** a las viejas y se aplicaron las migraciones de rename, pero **el cutover del frontend nunca ocurrió**. Resultado hoy:

- El frontend de `main` sigue llamando a los **nombres viejos** (verificado: cero referencias a nombres nuevos en `src/`, y `main` no tiene los directorios nuevos).
- Prod arrastra **dos sets** de funciones (~38 viejas en uso + ~32 nuevas huérfanas).
- La rama `refactor/edge-naming` está **141 commits por detrás de `main`** (solo 4 delante). Su código renombrado es de mediados de junio, anterior a todo el hardening y features recientes → **inservible para mergear**.

**Objetivo de este spec:** completar el cutover de verdad, rehaciéndolo sobre el `main` actual, para que prod use los nombres nuevos y quede **un solo set**.

## 2. Estado actual verificado (2026-06-30/07-01, read-only)

- **Migraciones de rename ya aplicadas** en main y prod (`20260615130000` Spanish B, `20260615140000` Literatura): renombraron los literales de las RPC de cuota e insertan `llm_uso` con el **nombre nuevo**, consultando con **alias viejo+nuevo** (`edge_function IN ('nuevo','viejo')`). → **No se necesitan migraciones nuevas.**
- `admin-get-metrics` (`FEATURE_BY_FUNCTION`) lleva **alias viejo+nuevo** para no partir el histórico.
- **Actividad real en prod (`llm_uso`):** dominan los nombres viejos (p.ej. `evaluate-analysis` 43 llamadas, `generate-band5-essay` 26). Dos nombres nuevos muestran actividad reciente (`lita-p1-evaluate` 4, `spab-oral-session` 2) — casi con seguridad de un **preview/rama que usa nombres nuevos apuntando a la BD de prod** (riesgo dev/prod, ver §7).
- Tráfico global bajo (app tras el muro "Próximamente").

## 3. Objetivo y alcance

**En alcance:** renombrar en `main` las funciones viejas a sus nombres nuevos sobre el código actual, actualizar los call-sites del frontend, desplegar las nuevas a prod, verificar, y borrar las viejas. Estado final: un solo set (nombres nuevos), frontend apuntando a ellos.

**Fuera de alcance (se nombran como riesgo/asunción, no se resuelven aquí):**
- La separación dev/prod de Cloudflare y el preview-que-escribe-en-prod (tarea aparte, ver `docs/superpowers/plans/2026-06-30-separacion-cloudflare-dev-prod.md`).
- Las funciones `admin-*`: el refactor **nunca las renombró**; se quedan con su nombre actual.
- `stripe-webhook`: se queda con su nombre (lo llama Stripe).

## 4. Decisiones de diseño (aprobadas)

1. **Renombrar en sitio** (`git mv`), no mergear la rama vieja. El repo queda con **un solo set** de directorios (nombres nuevos). La rama `refactor/edge-naming` solo se usó como referencia del mapeo (que ya está en las migraciones) y puede borrarse al final.
2. **Despliegue por lotes** (Spanish B → Literatura → Core/sistema), como el refactor original. Cada lote es un ciclo cerrado y verificable, con rollback de radio pequeño.
3. **Borrar las viejas por lote**, tras verificar ese lote (las viejas siguen desplegadas hasta ese momento como fallback).
4. **Los alias en RPC/métricas se quedan permanentes** (los `llm_uso` históricos tienen nombres viejos; quitarlos perdería atribución histórica).

## 5. Procedimiento por lote (se repite 3 veces)

Cada lote:

1. **`git mv`** de cada función viejo→nuevo en `supabase/functions/`.
2. **Actualizar el nombre interno** que cada función usa al loguear en `llm_uso` (literal `edge_function` dentro del código de la función).
3. **Actualizar `supabase/config.toml`** si aplica (p.ej. entradas `verify_jwt`).
4. **Inventariar y actualizar los call-sites del frontend**: `supabase.functions.invoke("…")` y cualquier `fetch(.../functions/v1/…)` al nombre nuevo. Incluye helpers/constantes.
5. **Desplegar** las funciones nuevas a prod: `supabase functions deploy <nuevo> --project-ref tlspxuwiakcrhshwvjeo`.
6. **Verificar**: (a) `llm_uso` empieza a registrar el nombre nuevo y el viejo deja de crecer; (b) smoke test manual de cada feature del lote.
7. **Borrar las viejas** de prod: `supabase functions delete <viejo> --project-ref tlspxuwiakcrhshwvjeo`.

### Lote 0 — Inventario y gap-fill (una vez, antes del lote 1)

Listar todas las funciones actuales de `main` y cruzarlas con el mapeo (§6). **Asignar nombre nuevo a las funciones creadas DESPUÉS del refactor** (no están en el mapeo), siguiendo la convención `<curso|sistema>-<área>-<acción>`. Caso conocido:

- `manage-booking` (creada 2026-06-29) → **`booking-manage`** (propuesto; confirmar en inventario).

Verificar que ninguna función de `main` se quede sin nombre nuevo ni con nombre viejo residual. Si el inventario destapa RPCs/`llm_uso` que aún no tengan alias para una función nueva (p.ej. `booking-manage`), añadir esa cobertura (única posible fuente de una migración nueva).

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
| `manage-booking` | `booking-manage` (propuesto, ver Lote 0) |
| `delete-account` | `account-delete` |

**Nota:** confirmar cada mapeo contra las migraciones `20260615130000`/`140000` y contra los directorios nuevos ya desplegados en prod, por si algún nombre difiere de lo aquí listado.

## 7. Verificación y rollback

- **Verificación por lote:** query read-only a `llm_uso` (aparece el nombre nuevo, el viejo se estanca) + smoke test manual de cada feature del lote en la app.
- **Rollback por lote:** hasta el paso 7 las viejas siguen desplegadas, así que revertir = `git revert` del cambio de frontend del lote + re-desplegar (o simplemente no borrar las viejas). Radio pequeño por ser un lote.
- **Punto de no retorno por lote:** el paso 7 (borrar viejas). Solo ejecutarlo tras verde en verificación.

## 8. Riesgos y asunciones

- **Preview-escribe-en-prod:** mientras exista, un preview con nombres nuevos ya golpea prod (visto: `lita-p1-evaluate` con actividad 21-jun). El cutover **no lo empeora** (el frontend de prod pasa a nombres nuevos, que ya existen), pero la separación dev/prod sigue pendiente aparte y conviene resolverla para no seguir contaminando métricas de prod.
- **Rama `refactor/edge-naming`:** se descarta como fuente; borrarla al terminar el cutover.
- **Nombres internos de logging:** si alguna función no actualiza su literal `edge_function`, las métricas se atribuirán mal (mitigado por los alias, pero conviene dejarlo correcto).
- **Post-refactor sin mapeo:** riesgo de olvidar funciones nuevas (mitigado por el Lote 0 de inventario).
- **Tráfico bajo** (muro "Próximamente") → ventana de bajo riesgo.

## 9. Estado final esperado

- `supabase/functions/` en `main`: un solo set con nombres nuevos (+ `stripe-webhook` y `admin-*` sin cambiar).
- Frontend llamando exclusivamente a nombres nuevos.
- Prod: solo funciones nuevas desplegadas (viejas borradas); migraciones y alias intactos.
- `refactor/edge-naming` borrada.
