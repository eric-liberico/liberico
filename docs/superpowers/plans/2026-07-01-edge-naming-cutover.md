# Edge Function Naming Cutover — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que producción use los nombres nuevos de las Edge Functions (`lita-*`/`spab-*`/`core-*`/`billing-*`/`booking-*`/`account-*`) y quede un solo set en repo, frontend, admin y prod.

**Architecture:** Rename-in-place sobre el `main` actual (la rama `refactor/edge-naming` está 141 commits atrás y se descarta). Cutover **por lotes** (Spanish B → Literature → Core/sistema); cada lote: renombrar → desplegar nuevas (aditivo) → merge de frontend a `main` (autodeploy Cloudflare) → **gate** que confirma que prod llama a los nombres nuevos → borrar las viejas. Las migraciones de rename ya están aplicadas en prod (alias viejo+nuevo en las RPC de cuota); **no** se crean migraciones nuevas salvo que el inventario del Lote 0 lo exija.

**Tech Stack:** Supabase Edge Functions (Deno/TypeScript), Supabase CLI 2.95.4, Postgres (Management API para consultas read-only), React/TanStack (frontend), Cloudflare (autodeploy en push a `main`).

**Spec:** [`docs/superpowers/specs/2026-07-01-edge-naming-cutover-design.md`](../specs/2026-07-01-edge-naming-cutover-design.md)

## Global Constraints

- **Prod ref:** `tlspxuwiakcrhshwvjeo`. **Dev ref:** `vmlsyansyjgopqsrvyoe`. Token de empresa en la memoria `reference_supabase.md` (leer en runtime, nunca literal en el comando).
- **`p_concepto` es ESTABLE:** nunca renombrar el literal `p_concepto` aunque coincida con el nombre viejo de la función (hay ~10 así). **Prohibido `find/replace` ciego** del nombre viejo; el rename es quirúrgico sobre `edge_function` (identidad), no sobre `p_concepto` (concepto de crédito en `evaluacion_precios`).
- **Lecturas de cuota diaria por `edge_function`:** al renombrar, los INSERTS/logs van a `<NEW>`, pero las LECTURAS que cuentan el límite diario (`.eq/.in("edge_function", …)` sobre `llm_uso`) deben quedar como **`.in("edge_function", ["<NEW>","<OLD>"])`** para no resetear el límite del usuario en el cutover. Las cuotas vía `reservar_cuota_*` cuentan por `course_key`/paper (no por `edge_function`) → no se tocan.
- **Deploy solo por nombre explícito** (allowlist del lote). **Prohibido `supabase functions deploy` sin nombre** (desplegaría todas las locales, incluida `dev-test-credits`). **Prohibido `--prune`.**
- **Borrado:** `supabase functions delete <viejo> --project-ref tlspxuwiakcrhshwvjeo --yes`.
- **No renombrar:** `stripe-webhook` ni las `admin-*` (pero sí corregir dentro del admin las claves/filtros que apuntan a nombres viejos de otras funciones).
- **Aislamiento por lote:** una rama/PR por lote, solo con sus cambios. **3 deploys de frontend** (uno por lote).
- **Preflight en dev cuando sea viable** antes de prod (dev puede tener pendientes de password/secrets; si no es viable para una función, documentarlo e ir a prod con cuidado).
- **Alias de cuota** (RPC, de las migraciones ya aplicadas) se quedan permanentes.
- No commitear a `main` directamente vía push del agente: los merges a `main` los dispara el usuario (autodeploy prod).

---

## Recetas reutilizables

Estas dos recetas se **aplican** en las tareas de cada lote. Los parámetros `<OLD>`/`<NEW>` salen de las tablas de mapeo de cada lote (Tareas 2, 4, 6).

### Receta R — Renombrar UNA función (`<OLD>` → `<NEW>`)

1. `git mv supabase/functions/<OLD> supabase/functions/<NEW>`
2. Localizar TODOS los usos de identidad del nombre viejo dentro de la función:
   ```bash
   rg -n "<OLD>" supabase/functions/<NEW>/index.ts
   ```
3. Cambiar según el **tipo de uso** (crítico — no es un find/replace):
   - **Inserts/logs a `llm_uso`** (`edge_function: "<OLD>"`) → `<NEW>`.
   - **`p_edge_function` de RPC** → `<NEW>`.
   - **Lecturas de cuota/límite que cuentan por función** (`.eq("edge_function","<OLD>")` o `.in("edge_function",[...])` sobre `llm_uso`) → **`.in("edge_function", ["<NEW>","<OLD>"])`**. NO poner solo `<NEW>`: mantener ambos evita **resetear el límite diario** del usuario durante el cutover; dejarlo con ambos es inocuo (los `llm_uso` viejos son históricos). Excepción: cuotas vía `reservar_cuota_*` cuentan por `course_key`/paper, NO por `edge_function` → no se tocan.
   - **`p_concepto:"<OLD>"`** → **NO tocar** (es concepto de crédito de `evaluacion_precios`, no identidad; hay ~10 funciones con `p_concepto` = nombre viejo).
4. Verificación de la función — buscar solo **identidad** (`edge_function`), no cualquier string (los `p_concepto` viejos deben ignorarse):
   ```bash
   # Inserts o .eq simples de identidad vieja: NO deben quedar
   rg -n 'edge_function"?\s*[:,]\s*"<OLD>"' supabase/functions/<NEW>/index.ts
   # p_edge_function con nombre viejo: NO debe quedar
   rg -n 'p_edge_function[^)]*"<OLD>"' supabase/functions/<NEW>/index.ts
   ```
   Esperado: sin hits. Aceptable que quede `<OLD>` SOLO dentro de: (a) lecturas `.in("edge_function", ["<NEW>","<OLD>"])`, y (b) literales `p_concepto:"<OLD>"`.

### Receta G — Gate + borrado de UN lote (tras merge de frontend a `main` y autodeploy)

1. **Funciones LLM del lote** — confirmar tráfico real de prod con el nombre nuevo (read-only, Management API):
   ```bash
   MEMDIR="/Users/erickvist/.claude/projects/-Users-erickvist-Desktop-Examinador-IB-App-ib-lit-coach/memory"
   TOKEN="$(grep -oE 'sbp_[a-f0-9]+' "$MEMDIR/reference_supabase.md" | head -1)"
   curl -s -X POST "https://api.supabase.com/v1/projects/tlspxuwiakcrhshwvjeo/database/query" \
     -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     --data '{"query":"select edge_function, max(created_at) ult from llm_uso where edge_function in (<NEW...>,<OLD...>) group by edge_function order by ult desc;"}'
   ```
   Esperado: aparece `<NEW>` con fecha reciente; el `<OLD>` deja de crecer.
2. **Funciones no-LLM del lote** (`booking-*`, `billing-checkout`, `account-delete`): smoke test manual de la feature en prod + revisar en las devtools/logs que la petición va a `/functions/v1/<NEW>` y no al viejo.
3. Solo con el gate en verde, borrar las viejas del lote (una por una, allowlist):
   ```bash
   supabase functions delete <OLD> --project-ref tlspxuwiakcrhshwvjeo --yes
   ```
4. Verificar que las viejas ya no están:
   ```bash
   supabase functions list --project-ref tlspxuwiakcrhshwvjeo | rg "<OLD...>"   # sin resultados
   ```

---

## Task 1: Lote 0 — Inventario, decisiones y preparación

**Files:**
- Modify: `deno.json` (tareas `check:edge`/`lint:edge`)
- Create/rename: `supabase/functions/add-test-credits` → `supabase/functions/dev-test-credits`
- Reference: `supabase/migrations/20260615130000_rename_edge_functions_spanish_b.sql`, `supabase/migrations/20260615140000_rename_edge_functions_literatura.sql`

**Interfaces:**
- Produces: el mapeo confirmado viejo→nuevo (Tareas 2/4/6 lo consumen); base branch limpia; decisión sobre `dev-test-credits` y `booking-manage`.

- [ ] **Step 1: Rama de preparación (NO commitear en main)**

```bash
cd /Users/erickvist/Desktop/Examinador_IB_App/ib-lit-coach
git switch main && git pull --ff-only origin main
git status -s   # esperado: vacío
git switch -c feat/edge-cutover-prep
```

- [ ] **Step 2: Inventariar funciones actuales vs mapeo**

```bash
ls -1 supabase/functions | rg -v '^_shared$' > /tmp/fns_actuales.txt
# Cruzar a mano con las tablas de mapeo (Tareas 2/4/6). Toda función de producto/sistema
# debe tener destino nuevo. Confirmar que no hay ninguna post-refactor sin nombre nuevo.
```
Confirmar los pares contra las migraciones:
```bash
rg -n "edge_function IN|VALUES \(p_user_id, '" supabase/migrations/20260615130000_rename_edge_functions_spanish_b.sql supabase/migrations/20260615140000_rename_edge_functions_literatura.sql
```
Esperado: cada `<NEW>` del plan aparece emparejado con su `<OLD>` en las migraciones. `manage-booking` no aparece (es post-refactor) → nombre nuevo decidido: `booking-manage`.

- [ ] **Step 3: Renombrar `add-test-credits` → `dev-test-credits` (solo-dev)**

```bash
git mv supabase/functions/add-test-credits supabase/functions/dev-test-credits
```
Actualizar su identidad interna si loguea/consulta con el nombre viejo:
```bash
rg -n "add-test-credits" supabase/functions/dev-test-credits/index.ts   # cambiar identidad a dev-test-credits (no p_concepto)
```
Actualizar el call-site del frontend:
```bash
rg -n "add-test-credits" src/
```
Editar `src/routes/comprar-creditos.tsx` para llamar a `dev-test-credits` en lugar de `add-test-credits`.

- [ ] **Step 4: Añadir `dev-test-credits` a los checks de `deno.json`**

En `deno.json`, en las tareas `check:edge` y `lint:edge`, añadir `supabase/functions/dev-test-credits/index.ts` a la lista (y quitar la ruta vieja `add-test-credits` si estuviera; hoy no está).

- [ ] **Step 5: Verificar checks**

```bash
deno task check:edge
deno task lint:edge
```
Esperado: sin errores.

- [ ] **Step 6: Desplegar `dev-test-credits` a DEV y limpiar la vieja de dev**

`dev-test-credits` corre en dev (el frontend de dev ya la llamará). Desplegarla y hacer smoke; luego borrar la `add-test-credits` vieja de dev:
```bash
MEMDIR="/Users/erickvist/.claude/projects/-Users-erickvist-Desktop-Examinador-IB-App-ib-lit-coach/memory"
export SUPABASE_ACCESS_TOKEN="$(grep -oE 'sbp_[a-f0-9]+' "$MEMDIR/reference_supabase.md" | head -1)"
supabase functions deploy dev-test-credits --project-ref vmlsyansyjgopqsrvyoe
# smoke en dev: botón de créditos de prueba funciona
supabase functions delete add-test-credits --project-ref vmlsyansyjgopqsrvyoe --yes   # borrar la vieja de dev
```
**Nunca** desplegar `dev-test-credits` a prod.

- [ ] **Step 7: Confirmar en prod que no hay residuos de test-credits y verificar flag**

```bash
supabase functions list --project-ref tlspxuwiakcrhshwvjeo | rg "test-credits"   # sin resultados (ya se borraron el 2026-06-30)
supabase secrets list --project-ref tlspxuwiakcrhshwvjeo | rg -i "ENABLE_TEST_CREDITS"   # sin resultados
```
Verificar en el dashboard de Cloudflare que el build de **prod** NO tiene `VITE_ENABLE_TEST_CREDITS=true`.

- [ ] **Step 8: Commit + PR (en la rama de prep, no en main)**

```bash
git add deno.json supabase/functions/dev-test-credits src/routes/comprar-creditos.tsx
git commit -m "chore(edge): add-test-credits -> dev-test-credits (solo-dev) + deno checks"
git push origin feat/edge-cutover-prep
gh pr create --base main --head feat/edge-cutover-prep --title "Prep cutover: dev-test-credits + deno checks" --fill
# (usuario) merge del PR a main cuando esté OK
```

---

## Task 2: Lote 1 (Spanish B) — renombrar funciones

**Files (git mv, Receta R por cada par):**

| `<OLD>` | `<NEW>` |
|---|---|
| `evaluate-paper1-b` | `spab-p1-evaluate` |
| `evaluate-paper2-b` | `spab-p2-evaluate` |
| `generate-questions-paper2-b` | `spab-p2-questions` |
| `tts-listening-b` | `spab-p2-listening-tts` |
| `evaluate-oral-b` | `spab-oral-evaluate` |
| `create-oral-b-session` | `spab-oral-session` |

**Notas de identidad conocidas (verificar con `rg` igualmente):**
- `evaluate-paper2-b/index.ts`: usa `p_concepto:"evaluate-paper2-b"` → **NO tocar ese literal**; sí cambiar `edge_function`/cuotas.
- `tts-listening-b/index.ts:93`: `.eq("edge_function","tts-listening-b")` (cuota) + insert :152 → ambos a `spab-p2-listening-tts`.
- `generate-questions-paper2-b/index.ts:157`: `.eq("edge_function", ...)` + insert :168 → a `spab-p2-questions`.

**Interfaces:**
- Produces: 6 funciones renombradas en `supabase/functions/` con identidad interna actualizada.

- [ ] **Step 1: Crear rama del lote**

```bash
git switch main && git switch -c feat/edge-cutover-spab
```

- [ ] **Step 2: Aplicar Receta R a cada par de la tabla**

Para cada `<OLD>`→`<NEW>` de la tabla: `git mv`, luego `rg -n "<OLD>" supabase/functions/<NEW>/index.ts` y cambiar cada uso de identidad (insert `edge_function`, `.eq/.in` de cuota, `p_edge_function`) a `<NEW>`. **No** tocar `p_concepto`.

- [ ] **Step 3: Actualizar `config.toml` y `deno.json`**

```bash
rg -n "evaluate-paper1-b|evaluate-paper2-b|generate-questions-paper2-b|tts-listening-b|evaluate-oral-b|create-oral-b-session" supabase/config.toml deno.json
```
Cambiar cada ruta/entrada a su nombre nuevo (p.ej. rutas de `check:edge`/`lint:edge`; entradas `[functions.*]` si las hubiera).

- [ ] **Step 4: Verificar que no queda IDENTIDAD vieja (ignorando `p_concepto` y lecturas `.in`)**

```bash
OLD='evaluate-paper1-b|evaluate-paper2-b|generate-questions-paper2-b|tts-listening-b|evaluate-oral-b|create-oral-b-session'
# Identidad vieja en inserts/.eq/p_edge_function → NO debe quedar:
rg -n "edge_function\"?\\s*[:,]\\s*\"($OLD)\"|p_edge_function[^)]*\"($OLD)\"" supabase/functions
# Rutas viejas en deno/config → NO deben quedar:
rg -n "$OLD" deno.json supabase/config.toml
```
Esperado: ambos sin hits. (Aceptable, y NO aparecen en estas búsquedas: `p_concepto:"<viejo>"` y lecturas de cuota `.in("edge_function",["<nuevo>","<viejo>"])`.)

- [ ] **Step 5: Checks Deno**

```bash
deno task check:edge
deno task lint:edge
```
Esperado: sin errores.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(edge): renombrar Spanish B a spab-* (funciones + identidad)"
```

---

## Task 3: Lote 1 (Spanish B) — frontend + deploy

**Files:**
- Modify: call-sites del frontend en `src/` que invoquen las 6 funciones viejas.

**Interfaces:**
- Consumes: nombres nuevos de la Task 2.
- Produces: frontend llamando a `spab-*`; funciones nuevas desplegadas en prod (aditivo).

- [ ] **Step 1: Localizar call-sites del frontend**

```bash
rg -n "evaluate-paper1-b|evaluate-paper2-b|generate-questions-paper2-b|tts-listening-b|evaluate-oral-b|create-oral-b-session" src/
```

- [ ] **Step 2: Cambiar cada `invoke("<OLD>")` / `fetch(.../functions/v1/<OLD>)` a `<NEW>`**

Editar cada archivo encontrado, sustituyendo el nombre por el nuevo de la tabla de la Task 2.

- [ ] **Step 3: Verificar y typecheck frontend**

```bash
rg -n "evaluate-paper1-b|evaluate-paper2-b|generate-questions-paper2-b|tts-listening-b|evaluate-oral-b|create-oral-b-session" src/   # sin resultados
npx tsc --noEmit
```
Esperado: sin referencias viejas, sin errores de tipos.

- [ ] **Step 4: Commit frontend**

```bash
git add src/
git commit -m "refactor(front): llamar spab-* (cutover Spanish B)"
```

- [ ] **Step 5: Preflight en dev (si viable) — desplegar por allowlist**

```bash
MEMDIR="/Users/erickvist/.claude/projects/-Users-erickvist-Desktop-Examinador-IB-App-ib-lit-coach/memory"
export SUPABASE_ACCESS_TOKEN="$(grep -oE 'sbp_[a-f0-9]+' "$MEMDIR/reference_supabase.md" | head -1)"
for f in spab-p1-evaluate spab-p2-evaluate spab-p2-questions spab-p2-listening-tts spab-oral-evaluate spab-oral-session; do
  supabase functions deploy "$f" --project-ref vmlsyansyjgopqsrvyoe
done
```
Smoke manual en dev de cada feature de Spanish B. (Si dev no es viable por password/secrets, documentar y saltar a prod con cuidado.)

- [ ] **Step 6: Desplegar a prod por allowlist (aditivo)**

```bash
for f in spab-p1-evaluate spab-p2-evaluate spab-p2-questions spab-p2-listening-tts spab-oral-evaluate spab-oral-session; do
  supabase functions deploy "$f" --project-ref tlspxuwiakcrhshwvjeo
done
```
**Nunca** `deploy` sin nombre ni `--prune`. Las viejas siguen vivas; aún no las llama nadie en prod (frontend sin mergear).

---

## Task 4: Lote 1 (Spanish B) — merge, gate y borrado

**Interfaces:**
- Consumes: funciones `spab-*` desplegadas + rama `feat/edge-cutover-spab`.
- Produces: prod llamando a `spab-*`; funciones viejas de Spanish B borradas.

- [ ] **Step 1: Abrir PR del lote (solo cambios de Spanish B)**

```bash
git push origin feat/edge-cutover-spab
gh pr create --base main --head feat/edge-cutover-spab --title "Cutover Spanish B a spab-*" --fill
```

- [ ] **Step 2: (Usuario) merge del PR a `main` → autodeploy de Cloudflare**

Esperar a que el build de prod termine (dashboard Cloudflare en verde).

- [ ] **Step 3: GATE — Receta G, funciones LLM**

Todas las de Spanish B escriben `llm_uso`, **incluida `tts-listening-b`/`spab-p2-listening-tts`** (insert en `llm_uso`). Ejecutar la query de Receta G con las **6** parejas:
`in ('spab-p1-evaluate','spab-p2-evaluate','spab-p2-questions','spab-p2-listening-tts','spab-oral-evaluate','spab-oral-session','evaluate-paper1-b','evaluate-paper2-b','generate-questions-paper2-b','tts-listening-b','evaluate-oral-b','create-oral-b-session')`.
Esperado: los 6 nombres `spab-*` con actividad reciente de prod; los 6 viejos se estancan. Smoke manual de cada feature (incluye reproducir audio de listening B para `spab-p2-listening-tts` + Network apuntando a `/functions/v1/spab-p2-listening-tts`).

- [ ] **Step 4: Borrar las viejas (Receta G, paso 3), allowlist**

```bash
for f in evaluate-paper1-b evaluate-paper2-b generate-questions-paper2-b tts-listening-b evaluate-oral-b create-oral-b-session; do
  supabase functions delete "$f" --project-ref tlspxuwiakcrhshwvjeo --yes
done
supabase functions list --project-ref tlspxuwiakcrhshwvjeo | rg "paper1-b|paper2-b|questions-paper2-b|tts-listening-b|oral-b"   # sin resultados
```

---

## Task 5: Lote 2 (Literature) — renombrar funciones

**Files (Receta R por cada par):**

| `<OLD>` | `<NEW>` |
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

**Nota:** `generate-band5-essay/index.ts:362` usa `p_concepto:"feedback-completo-p1"` (concepto semántico) → no coincide con el nombre viejo, no hay riesgo; igualmente, no tocar ningún `p_concepto`.

- [ ] **Step 1: Rama del lote**

```bash
git switch main && git pull --ff-only origin main && git switch -c feat/edge-cutover-lita
```

- [ ] **Step 2: Aplicar Receta R a cada par de la tabla**

`git mv` + `rg -n "<OLD>" supabase/functions/<NEW>/index.ts` + cambiar identidad (`edge_function`, `.eq/.in` cuota, `p_edge_function`) a `<NEW>`. No tocar `p_concepto`.

- [ ] **Step 3: `config.toml` y `deno.json`**

```bash
rg -n "evaluate-analysis|generate-analysis-feedback|generate-analysis-extras|generate-band5-essay\b|generate-rewrite-suggestions\b|rewrite-feedback|generate-practice-text|evaluate-paper2\b|generate-paper2-feedback|generate-paper2-extras|generate-band5-essay-p2|generate-rewrite-suggestions-p2|evaluate-oral\b|evaluate-oral-notes|generate-oral-feedback|generate-oral-annotations|suggest-oral-topics|create-oral-simulation-session" supabase/config.toml deno.json
```
Cambiar cada uno a su nombre nuevo.

- [ ] **Step 4: Verificar sin IDENTIDAD vieja + checks**

```bash
OLD='evaluate-analysis|generate-analysis-feedback|generate-analysis-extras|generate-band5-essay|generate-band5-essay-p2|generate-rewrite-suggestions|generate-rewrite-suggestions-p2|rewrite-feedback|generate-practice-text|evaluate-paper2|generate-paper2-feedback|generate-paper2-extras|evaluate-oral|evaluate-oral-notes|generate-oral-feedback|generate-oral-annotations|suggest-oral-topics|create-oral-simulation-session'
# Identidad vieja en inserts/.eq/p_edge_function → NO debe quedar (OJO: p_concepto:"evaluate-analysis"/"evaluate-paper2" NO cuentan, no matchean este patrón):
rg -n "edge_function\"?\\s*[:,]\\s*\"($OLD)\"|p_edge_function[^)]*\"($OLD)\"" supabase/functions
rg -n "$OLD" deno.json supabase/config.toml   # rutas viejas → NO deben quedar
deno task check:edge && deno task lint:edge
```
Esperado: sin hits de identidad; checks OK. (Aceptable que queden `p_concepto:"<viejo>"` y lecturas `.in("edge_function",["<nuevo>","<viejo>"])`.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(edge): renombrar Literature a lita-* (funciones + identidad)"
```

---

## Task 6: Lote 2 (Literature) — frontend + admin + deploy

**Files:**
- Modify: call-sites en `src/`; `src/routes/admin.tsx` (claves `evaluate-analysis`/`evaluate-paper2` → nuevas, o viejo+nuevo); `supabase/functions/admin-get-users/index.ts:93` (rate limit `.eq("edge_function","evaluate-analysis")`); revisar `admin-get-metrics` (agrupa crudo — funciona con datos nuevos, pero el panel debe conocer las claves nuevas).

**Interfaces:**
- Consumes: nombres `lita-*` de la Task 5.
- Produces: frontend + admin usando `lita-*`; funciones nuevas desplegadas en prod.

- [ ] **Step 1: Call-sites frontend**

```bash
rg -n "evaluate-analysis|generate-analysis-|generate-band5-essay|generate-rewrite-suggestions|rewrite-feedback|generate-practice-text|evaluate-paper2\b|generate-paper2-|evaluate-oral|generate-oral-|suggest-oral-topics|create-oral-simulation-session" src/
```
Cambiar cada `invoke`/`fetch` al nombre nuevo.

- [ ] **Step 2: Admin — claves y rate limit (viejo+nuevo para no perder histórico)**

- `src/routes/admin.tsx`: donde hay `key:"evaluate-analysis"`, `key:"evaluate-paper2"`, etc., actualizar a las claves nuevas (`lita-p1-evaluate`, `lita-p2-evaluate`, …). Si el panel debe seguir sumando histórico, mapear viejo+nuevo (mostrar la suma de ambos por feature).
- `supabase/functions/admin-get-users/index.ts` — tiene **4** filtros por `edge_function` (líneas 93/99/105/111), no uno. Cambiar los 4 a `.in([nuevo,viejo])` (el rate limit no debe romperse en el cambio):
  - `.eq("edge_function","evaluate-analysis")` → `.in("edge_function",["lita-p1-evaluate","evaluate-analysis"])`
  - `.eq("edge_function","evaluate-paper2")` → `.in("edge_function",["lita-p2-evaluate","evaluate-paper2"])`
  - `.eq("edge_function","evaluate-oral")` → `.in("edge_function",["lita-io-evaluate","evaluate-oral"])`
  - `.eq("edge_function","create-oral-simulation-session")` → `.in("edge_function",["lita-io-sim-session","create-oral-simulation-session"])`
  Verificar que no queda ningún `.eq("edge_function", <viejo>)` en el archivo: `rg -n 'edge_function' supabase/functions/admin-get-users/index.ts`. **Desplegar `admin-get-users` a dev antes que a prod** (Step 5).

- [ ] **Step 3: Verificar + typecheck**

```bash
rg -n "evaluate-analysis|generate-analysis-|generate-band5-essay|generate-rewrite-suggestions|rewrite-feedback|generate-practice-text|evaluate-paper2\b|generate-paper2-|evaluate-oral|generate-oral-|suggest-oral-topics|create-oral-simulation-session" src/   # solo quedan, si acaso, en admin como parte de pares viejo+nuevo intencionales
npx tsc --noEmit
deno task check:edge   # admin-get-users cambió
```

- [ ] **Step 4: Commit**

```bash
git add src/ supabase/functions/admin-get-users
git commit -m "refactor(front+admin): lita-* + rate limit viejo+nuevo (cutover Literature)"
```

- [ ] **Step 5: Preflight dev + deploy prod por allowlist**

```bash
MEMDIR="/Users/erickvist/.claude/projects/-Users-erickvist-Desktop-Examinador-IB-App-ib-lit-coach/memory"
export SUPABASE_ACCESS_TOKEN="$(grep -oE 'sbp_[a-f0-9]+' "$MEMDIR/reference_supabase.md" | head -1)"
LITA="lita-p1-evaluate lita-p1-feedback lita-p1-extras lita-p1-model-essay lita-p1-rewrite lita-p1-rewrite-feedback lita-p1-practice-text lita-p2-evaluate lita-p2-feedback lita-p2-extras lita-p2-model-essay lita-p2-rewrite lita-io-evaluate lita-io-notes-evaluate lita-io-feedback lita-io-annotations lita-io-topics lita-io-sim-session"
for f in $LITA; do supabase functions deploy "$f" --project-ref vmlsyansyjgopqsrvyoe; done   # preflight (si viable) + smoke
supabase functions deploy admin-get-users --project-ref vmlsyansyjgopqsrvyoe               # admin-get-users a dev primero
for f in $LITA; do supabase functions deploy "$f" --project-ref tlspxuwiakcrhshwvjeo; done   # prod, aditivo
supabase functions deploy admin-get-users --project-ref tlspxuwiakcrhshwvjeo               # admin-get-users a prod (rate limit viejo+nuevo)
```

---

## Task 7: Lote 2 (Literature) — merge, gate y borrado

- [ ] **Step 1: PR del lote**

```bash
git push origin feat/edge-cutover-lita
gh pr create --base main --head feat/edge-cutover-lita --title "Cutover Literature a lita-*" --fill
```

- [ ] **Step 2: (Usuario) merge → autodeploy → build verde**

- [ ] **Step 3: GATE (Receta G, LLM)**

Query de Receta G con la lista `lita-*` + sus viejos (los 18 pares). Esperado: `lita-*` con actividad reciente de prod; viejos estancados. Smoke manual de P1/P2/Oral. **Verificar el panel admin** (métricas y rate limit) sigue mostrando datos.

- [ ] **Step 4: Borrar viejas (allowlist)**

```bash
MEMDIR="/Users/erickvist/.claude/projects/-Users-erickvist-Desktop-Examinador-IB-App-ib-lit-coach/memory"
export SUPABASE_ACCESS_TOKEN="$(grep -oE 'sbp_[a-f0-9]+' "$MEMDIR/reference_supabase.md" | head -1)"
for f in evaluate-analysis generate-analysis-feedback generate-analysis-extras generate-band5-essay generate-rewrite-suggestions rewrite-feedback generate-practice-text evaluate-paper2 generate-paper2-feedback generate-paper2-extras generate-band5-essay-p2 generate-rewrite-suggestions-p2 evaluate-oral evaluate-oral-notes generate-oral-feedback generate-oral-annotations suggest-oral-topics create-oral-simulation-session; do
  supabase functions delete "$f" --project-ref tlspxuwiakcrhshwvjeo --yes
done
```

---

## Task 8: Lote 3 (Core/sistema) — renombrar funciones

**Files (Receta R por cada par):**

| `<OLD>` | `<NEW>` | Tipo |
|---|---|---|
| `teacher-chat` | `core-teacher-chat` | LLM |
| `generate-study-plan` | `core-study-plan` | LLM |
| `transcribe-image` | `core-transcribe-image` | LLM |
| `transcribe-oral` | `core-transcribe-audio` | LLM (OpenAI) |
| `create-checkout-session` | `billing-checkout` | no-LLM |
| `create-booking` | `booking-create` | no-LLM |
| `confirm-booking` | `booking-confirm` | no-LLM |
| `manage-booking` | `booking-manage` | no-LLM |
| `delete-account` | `account-delete` | no-LLM |

**Nota `booking-manage`:** es post-refactor, así que **no** tiene alias en las RPC de cuota ni fila en `llm_uso`. No usa LLM ni cuota LLM, así que probablemente no necesita alias; **confirmarlo** en el Step de inventario. Si resultara que alguna RPC de cuota referencia `manage-booking`, crear una migración aditiva que añada el alias (única migración posible del proyecto).

- [ ] **Step 1: Rama del lote**

```bash
git switch main && git pull --ff-only origin main && git switch -c feat/edge-cutover-core
```

- [ ] **Step 2: Confirmar que `booking-manage` no necesita migración**

```bash
rg -n "manage-booking" supabase/migrations/ supabase/functions/manage-booking/index.ts
```
Esperado: `manage-booking` no aparece en RPC de cuota de las migraciones (no usa cuota LLM). Si aparece en alguna RPC, planificar migración aditiva del alias antes de continuar.

- [ ] **Step 3: Aplicar Receta R a cada par**

`git mv` + actualizar identidad interna (`edge_function` en `llm_uso`/cuota para las LLM; para las no-LLM, revisar si logean algo). No tocar `p_concepto`.

- [ ] **Step 4: `config.toml` y `deno.json`**

```bash
rg -n "teacher-chat|generate-study-plan|transcribe-image|transcribe-oral|create-checkout-session|create-booking|confirm-booking|manage-booking|delete-account" supabase/config.toml deno.json
```
Cambiar a nombres nuevos. **Ojo:** `stripe-webhook` NO se toca (sigue igual, aunque en `config.toml` tenga `verify_jwt=false`).

- [ ] **Step 5: Verificar sin IDENTIDAD vieja + checks**

```bash
OLD='teacher-chat|generate-study-plan|transcribe-image|transcribe-oral|create-checkout-session|create-booking|confirm-booking|manage-booking|delete-account'
rg -n "edge_function\"?\\s*[:,]\\s*\"($OLD)\"|p_edge_function[^)]*\"($OLD)\"" supabase/functions
rg -n "$OLD" deno.json supabase/config.toml   # rutas viejas → NO (¡pero stripe-webhook NO se toca!)
deno task check:edge && deno task lint:edge
```
Esperado: sin hits de identidad; checks OK. Aceptable: `p_concepto:"<viejo>"` y lecturas `.in("edge_function",["<nuevo>","<viejo>"])`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(edge): renombrar core/sistema (core-/billing-/booking-/account-)"
```

---

## Task 9: Lote 3 (Core/sistema) — frontend + deploy

- [ ] **Step 1: Call-sites frontend (incluye rutas de reservas/cuenta/créditos)**

```bash
rg -n "teacher-chat|generate-study-plan|transcribe-image|transcribe-oral|create-checkout-session|create-booking|confirm-booking|manage-booking|delete-account" src/
```
Cambiar cada `invoke`/`fetch` al nombre nuevo. (Recordar: `create-checkout-session`→`billing-checkout` es la única llamada raw de créditos junto con dev-test-credits.)

- [ ] **Step 2: Verificar + typecheck**

```bash
rg -n "teacher-chat|generate-study-plan|transcribe-image|transcribe-oral|create-checkout-session|create-booking|confirm-booking|manage-booking|delete-account" src/   # sin resultados
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "refactor(front): core-/billing-/booking-/account- (cutover Core)"
```

- [ ] **Step 4: Preflight dev + deploy prod por allowlist**

```bash
MEMDIR="/Users/erickvist/.claude/projects/-Users-erickvist-Desktop-Examinador-IB-App-ib-lit-coach/memory"
export SUPABASE_ACCESS_TOKEN="$(grep -oE 'sbp_[a-f0-9]+' "$MEMDIR/reference_supabase.md" | head -1)"
CORE="core-teacher-chat core-study-plan core-transcribe-image core-transcribe-audio billing-checkout booking-create booking-confirm booking-manage account-delete"
for f in $CORE; do supabase functions deploy "$f" --project-ref vmlsyansyjgopqsrvyoe; done   # preflight si viable
for f in $CORE; do supabase functions deploy "$f" --project-ref tlspxuwiakcrhshwvjeo; done   # prod, aditivo
```

---

## Task 10: Lote 3 (Core/sistema) — merge, gate y borrado

- [ ] **Step 1: PR del lote**

```bash
git push origin feat/edge-cutover-core
gh pr create --base main --head feat/edge-cutover-core --title "Cutover Core/sistema" --fill
```

- [ ] **Step 2: (Usuario) merge → autodeploy → build verde**

- [ ] **Step 3: GATE por tipo (Receta G)**

- **LLM** (`core-teacher-chat`, `core-study-plan`, `core-transcribe-image`, `core-transcribe-audio`): query de `llm_uso` (nuevo aparece, viejo se estanca). Nota: `core-transcribe-audio` fallará si prod no tiene `OPENAI_API_KEY` (fuera de alcance; ver spec §3) — verificar solo que la petición va al nombre nuevo.
- **No-LLM** (`billing-checkout`, `booking-create`, `booking-confirm`, `booking-manage`, `account-delete`): smoke manual + devtools/logs confirmando `/functions/v1/<nuevo>`. `billing-checkout` con pagos OFF devolverá "pagos no disponibles" — correcto; basta confirmar que se llama al nombre nuevo.

- [ ] **Step 4: Borrar viejas (allowlist)**

```bash
MEMDIR="/Users/erickvist/.claude/projects/-Users-erickvist-Desktop-Examinador-IB-App-ib-lit-coach/memory"
export SUPABASE_ACCESS_TOKEN="$(grep -oE 'sbp_[a-f0-9]+' "$MEMDIR/reference_supabase.md" | head -1)"
for f in teacher-chat generate-study-plan transcribe-image transcribe-oral create-checkout-session create-booking confirm-booking manage-booking delete-account; do
  supabase functions delete "$f" --project-ref tlspxuwiakcrhshwvjeo --yes
done
```

---

## Task 11: Cierre y limpieza

**Lista completa de los 34 nombres viejos** (usarla en todas las verificaciones de cierre):
```bash
OLD_ALL='evaluate-paper1-b|evaluate-paper2-b|generate-questions-paper2-b|tts-listening-b|evaluate-oral-b|create-oral-b-session|evaluate-analysis|generate-analysis-feedback|generate-analysis-extras|generate-band5-essay|generate-band5-essay-p2|generate-rewrite-suggestions|generate-rewrite-suggestions-p2|rewrite-feedback|generate-practice-text|evaluate-paper2|generate-paper2-feedback|generate-paper2-extras|evaluate-oral|evaluate-oral-notes|generate-oral-feedback|generate-oral-annotations|suggest-oral-topics|create-oral-simulation-session|teacher-chat|generate-study-plan|transcribe-image|transcribe-oral|create-checkout-session|create-booking|confirm-booking|manage-booking|delete-account|add-test-credits'
```

- [ ] **Step 1: Verificar un solo set en prod**

```bash
MEMDIR="/Users/erickvist/.claude/projects/-Users-erickvist-Desktop-Examinador-IB-App-ib-lit-coach/memory"
export SUPABASE_ACCESS_TOKEN="$(grep -oE 'sbp_[a-f0-9]+' "$MEMDIR/reference_supabase.md" | head -1)"
supabase functions list --project-ref tlspxuwiakcrhshwvjeo | rg -c "^"   # nº de funciones esperado (sin viejas ni huérfanas)
supabase functions list --project-ref tlspxuwiakcrhshwvjeo | rg "$OLD_ALL"   # sin resultados (todos los viejos borrados)
```
Esperado: solo nombres nuevos + `stripe-webhook` + `admin-*`. Sin duplicados ni huérfanas.

- [ ] **Step 2: Verificar repo (un solo set, sin nombres viejos)**

```bash
ls supabase/functions | rg "^($OLD_ALL)$"   # sin resultados (ningún directorio con nombre viejo)
rg -n "functions/v1/($OLD_ALL)" src/         # sin resultados (ningún call-site viejo)
```

- [ ] **Step 3: Borrar la rama obsoleta del refactor**

```bash
git branch -D refactor/edge-naming 2>/dev/null; true
git push origin --delete refactor/edge-naming 2>/dev/null; true
```

- [ ] **Step 4: Actualizar docs y memoria**

- Actualizar `docs/arquitectura.md` con los nombres nuevos de edge functions.
- Actualizar la memoria `project_edge_naming` a "cutover completado (2026-…); prod y frontend en nombres nuevos; refactor branch borrada".

- [ ] **Step 5: Commit docs**

```bash
git switch main && git pull --ff-only origin main && git switch -c docs/edge-cutover-cierre
git add docs/arquitectura.md
git commit -m "docs: cutover edge-naming completado"
git push origin docs/edge-cutover-cierre && gh pr create --base main --head docs/edge-cutover-cierre --fill
```

---

## Self-Review (cobertura del spec)

- **§3 alcance — rename identidad completa:** Tareas 2/5/8 (Receta R, todos los usos de `edge_function`). ✅
- **§4.5 `p_concepto` estable:** Receta R paso 3 + notas por función (evaluate-paper2-b). ✅
- **§4.6 admin normalizado:** Task 6 steps 2–3 (admin.tsx + admin-get-users viejo+nuevo). ✅
- **§4.7 seguridad deploy/borrado:** allowlist en todos los deploy; `--yes` en delete; sin `--prune`; sin deploy sin nombre. ✅
- **§5 Lote 0:** Task 1 (inventario, dev-test-credits, deno.json, VITE flag). ✅
- **§5 gate por tipo:** Receta G + Tasks 4/7/10 step 3. ✅
- **§4.8 preflight dev:** Tasks 3/6/9 (deploy a dev antes de prod). ✅
- **§4.9 aislamiento por lote / 3 deploys:** ramas `feat/edge-cutover-{spab,lita,core}` + 3 PRs. ✅
- **`booking-manage` sin alias:** Task 8 step 2 (verificar; migración aditiva solo si hace falta). ✅
- **Estado final §9:** Task 11. ✅

**Fixes 3ª ronda de review (aplicados):**
- Verificaciones por identidad (`edge_function`/`p_edge_function`), no por string suelto → no chocan con `p_concepto` viejos (Receta R.4; Tasks 2.4/5.4/8.5). ✅
- Lecturas de cuota diaria con `.in([NEW,OLD])` para no resetear límites (constraint global; Receta R.3). ✅
- Gate de Spanish B incluye `spab-p2-listening-tts`/`tts-listening-b` (Task 4.3). ✅
- Task 1 en rama `feat/edge-cutover-prep` + PR (no commits en `main`); despliegue de `dev-test-credits` a dev + borrado de la vieja en dev (Task 1.1/1.6/1.8). ✅
- `admin-get-users`: los **4** filtros a `.in([NEW,OLD])` + deploy a dev antes que prod (Task 6.2/6.5). ✅
- Verificación de cierre con la lista completa de 34 nombres viejos + `add-test-credits` (Task 11). ✅
