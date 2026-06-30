# Separación dev/prod en Cloudflare — Plan de ejecución

> **For agentic workers:** plan **operado por humano en su mayoría** (dashboards de Cloudflare/Supabase/Google). Los pasos `[CLI]`/`[CODE]` los puede ejecutar un agente; los `[MANUAL]` son del dueño. Checkbox (`- [ ]`) para seguimiento. Sub-skill para ejecutar: `superpowers:executing-plans`.

**Goal:** Que los builds desplegados en Cloudflare apunten al Supabase correcto por entorno (preview → DEV, producción → PROD), de forma verificada, sin que un preview pueda escribir en PROD por accidente.

**Architecture:** El backend ya está separado (dos proyectos Supabase: PROD `tlspxuwiakcrhshwvjeo`, DEV `vmlsyansyjgopqsrvyoe`, ambos a 87 migraciones, en sync). Lo que falta es el **frontend/deploy**: las `VITE_*` se hornean en **build-time** dentro del bundle JS, así que cada entorno debe **construirse por separado** con sus propias `VITE_*`. El riesgo central es que un build de preview **herede** una `VITE_SUPABASE_URL=PROD` global de Cloudflare y escriba en producción en silencio.

**Tech Stack:** Cloudflare **Workers** (`wrangler.jsonc`, worker `liberico`, `main: ./src/server.ts`), `@cloudflare/vite-plugin` vía `@lovable.dev/vite-tanstack-config`, Vite/TanStack Start, Supabase, Management API.

## Global Constraints

- **PROD no se toca** salvo: (a) rotar su DB password (Task 0), (b) configurar sus build vars/Auth con SUS valores de prod (no los de dev). Nada de migraciones ni datos en prod desde este plan.
- **Refs:** DEV = `vmlsyansyjgopqsrvyoe`, PROD = `tlspxuwiakcrhshwvjeo`. Org `Liberico` (plan free).
- **Build-time, no runtime.** `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` se hornean al construir ([client.ts](../../../src/integrations/supabase/client.ts) hace `import.meta.env.VITE_… || process.env.…`). El muro (`LIBERICO_COMING_SOON`, `LIBERICO_PREVIEW_KEY`) son vars **runtime** del worker ([src/server.ts](../../../src/server.ts)) — plano distinto.
- **Es Workers, no Pages.** `CLOUDFLARE_ENV` / `wrangler [env]` controlan runtime, NO la inyección build-time de VITE_. La palanca de VITE_ por entorno son las **build vars por trigger** de Workers Builds, o **dos workers**.
- **NUNCA** hornear `SUPABASE_SERVICE_ROLE_KEY` ni ningún secret en `VITE_*` / bundle. La anon key SÍ va pública en el bundle (es correcto, protegida por RLS).
- **`db:push:prod` está bloqueado** ([package.json](../../../package.json)); promover migraciones a prod va por **Management API** (camino probado). El repo y prod ya están reconciliados (87/87).
- **Credenciales:** valores de dev en el Keychain de macOS (`security find-generic-password -s liberico-dev-supabase -a <anon-key|service-role-key|db-password> -w`). Nada de claves en el repo.
- **Email de cuentas/servicios:** siempre `eric@liberico.org`, nunca el Gmail personal.

---

## File Structure

- **No-repo (dashboards):** la mayor parte (Cloudflare build vars, Supabase Auth, Google OAuth, rotación de passwords).
- **Modify `wrangler.jsonc`** — solo si se elige la vía "dos workers" (añadir `[env.dev]`).
- **Modify `src/routes/__root.tsx`** (o el head raíz) — opcional pero recomendado: meta tag con el `project ref` para verificación trivial (Task 3).
- **Modify `docs/arquitectura.md`** — marcar la separación como completa al terminar (Task 11).

---

## FASE 0 — Seguridad inmediata (independiente de todo)

### Task 0: Rotar las DB passwords expuestas

**Por qué primero:** la DB password de prod (`Esgrima…`) y la de dev se mostraron en chat → comprometidas. La app usa API/anon (no conexión directa a Postgres), así que rotar es bajo riesgo para el runtime.

- [ ] **Step 1 [MANUAL]:** Dashboard Supabase → proyecto **PROD** → Settings → Database → **Reset database password** → copia la nueva → guárdala en el Keychain (`security add-generic-password -U -s liberico-prod-supabase -a db-password -w '<nueva>'`).
- [ ] **Step 2 [MANUAL]:** Igual en **DEV** → guárdala con `security add-generic-password -U -s liberico-dev-supabase -a db-password -w '<nueva>'`. (Esto también arregla el fallo de auth del pooler de dev para `db:push:dev`.)
- [ ] **Verificación:** `security find-generic-password -s liberico-prod-supabase -a db-password -w` devuelve la nueva. La app sigue funcionando (no usa conexión directa).

---

## FASE 1 — Diagnóstico (NO cambiar nada aún)

### Task 1: Confirmar el mecanismo de deploy de Cloudflare

- [ ] **Step 1 [MANUAL]:** Cloudflare dashboard → Workers & Pages → `liberico` → Settings → **Build**. Determina:
  - ¿Está **conectado a GitHub** (Workers Builds: construye al hacer push)? → entonces hay "build configuration" con variables, y puede haber **preview vs production** por rama.
  - ¿O se despliega con **`wrangler deploy` manual** desde tu máquina? → no hay entornos en el dashboard; cada deploy usa el `.env`/vars de tu build local.
- [ ] **Step 2 [MANUAL]:** Anota qué ramas generan **preview** y cuál es **producción** (`main`).
- [ ] **Verificación:** sabes con certeza si es Workers Builds (git) o `wrangler deploy`. **De esto depende toda la Fase 2.**

### Task 2: Test del riesgo nº1 — ¿el preview hereda la URL de PROD?

**Por qué:** si Cloudflare tiene una `VITE_SUPABASE_URL=PROD` **global**, el preview la hereda y escribe en producción. Este test lo detecta **empíricamente**.

- [ ] **Step 1 [MANUAL]:** consigue la **URL del preview** de la rama `dev` (Cloudflare → deployments del branch `dev`).
- [ ] **Step 2 [CLI]:** grep **multi-chunk** del bundle servido (no solo el primero):

```bash
PREV="https://<preview-url-de-dev>"
for js in $(curl -s "$PREV/" | grep -oE '/assets/[^"]+\.js' | sort -u); do curl -s "$PREV$js"; done \
  | grep -oE "https://[a-z0-9]+\.supabase\.co" | sort -u
```
- [ ] **Verificación:**
  - Si sale **`tlspxuwiakcrhshwvjeo`** (PROD) → **CONFIRMADO el riesgo nº1**: el preview escribe en prod. Hay que arreglarlo (Fase 2) **antes de usar el preview**.
  - Si sale **`vmlsyansyjgopqsrvyoe`** (DEV) → ya está bien por casualidad; igualmente formaliza la config en Fase 2.
  - Si no hay preview (deploy manual) → este test se hará tras el primer deploy de preview en Fase 2.

---

## FASE 2 — Configurar la separación (la palanca build-time)

### Task 3: Indicador de entorno verificable (recomendado)

**Files:** Modify `src/routes/__root.tsx` (head raíz).

Expone **solo el project ref** (público, no claves) para verificar el entorno de un vistazo.

- [ ] **Step 1 [CODE]:** en el head de la ruta raíz, añade un meta derivado de la URL:

```tsx
const SUPABASE_REF =
  (import.meta.env.VITE_SUPABASE_URL ?? "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? "unknown";
// dentro de head: () => ({ meta: [ ... , { name: "liberico-supabase-ref", content: SUPABASE_REF } ] })
```
- [ ] **Step 2 [CLI]:** `npx tsc --noEmit` → sin errores.
- [ ] **Step 3 [CODE]:** commit `feat(infra): meta tag con supabase ref para verificar entorno`.
- [ ] **Verificación:** tras desplegar, `curl -s "$PREV/" | grep liberico-supabase-ref` muestra el ref del entorno.

### Task 4: Build vars por entorno (elige UNA vía según Task 1)

- [ ] **Step 1A [MANUAL] — si es Workers Builds (git):** en `liberico` → Settings → Build → **Variables de build**, con scope por entorno:
  - **Production** (rama `main`): `VITE_SUPABASE_URL=https://tlspxuwiakcrhshwvjeo.supabase.co`, `VITE_SUPABASE_PUBLISHABLE_KEY=<anon PROD>` (sin cambios respecto a hoy), **sin** `VITE_ENABLE_TEST_CREDITS`.
  - **Preview** (demás ramas): `VITE_SUPABASE_URL=https://vmlsyansyjgopqsrvyoe.supabase.co`, `VITE_SUPABASE_PUBLISHABLE_KEY=<anon DEV>` (`security find-generic-password -s liberico-dev-supabase -a anon-key -w`), `VITE_ENABLE_TEST_CREDITS=true`.
  - **Elimina cualquier `VITE_SUPABASE_URL` GLOBAL** que aplique a todos los builds (es la causa del riesgo nº1).
- [ ] **Step 1B [MANUAL/CODE] — si es `wrangler deploy` manual o Workers Builds no soporta build vars por trigger:** usa **dos workers**:
  - En `wrangler.jsonc` añade un entorno dev:
    ```jsonc
    "env": { "dev": { "name": "liberico-dev" } }
    ```
  - Deploy prod: build con `.env` de prod → `npx wrangler deploy`.
  - Deploy dev: build con `.env` de dev → `npx wrangler deploy --env dev`.
- [ ] **Step 2 [CODE]:** si tocaste `wrangler.jsonc`, commit `chore(infra): entorno dev en wrangler (dos workers)`.
- [ ] **Verificación:** se cubre en Fase 3 (es lo único que de verdad lo confirma).

### Task 5: Vars runtime del muro por entorno

**Por qué:** [src/server.ts](../../../src/server.ts) gatea con `LIBERICO_COMING_SOON` / `LIBERICO_PREVIEW_KEY` (runtime, NO build-time).

- [ ] **Step 1 [MANUAL]:** en las **Variables del Worker** (runtime, no build) por entorno:
  - **Preview/dev:** `LIBERICO_COMING_SOON=false` (muro apagado para poder probar), o déjalo con `LIBERICO_PREVIEW_KEY` si quieres muro con clave.
  - **Production:** `LIBERICO_COMING_SOON` distinto de `"false"` (muro encendido hasta lanzar) + `LIBERICO_PREVIEW_KEY` (secret).
- [ ] **Verificación:** abrir el preview no pide clave (o la acepta); producción sigue mostrando "Próximamente".

---

## FASE 3 — Verificación (lo que de verdad cierra el riesgo)

### Task 6: Confirmar preview → DEV (y nunca PROD)

- [ ] **Step 1 [CLI]:** repite el grep multi-chunk de Task 2 sobre el preview de `dev`. Expected: **solo `vmlsyansyjgopqsrvyoe`**.
- [ ] **Step 2 [CLI]:** si hiciste Task 3: `curl -s "$PREV/" | grep liberico-supabase-ref` → `vmlsyansyjgopqsrvyoe`.
- [ ] **Step 3 [MANUAL]: prueba de escritura real** (la definitiva): en el preview, haz una acción que escriba (p. ej. login + crear/editar algo).
- [ ] **Step 4 [CLI]:** confirma que la fila aterrizó en **DEV** y **NO** en prod:

```bash
TOKEN=$(security find-generic-password -s liberico-dev-supabase -a anon-key -w >/dev/null 2>&1; grep -oE 'sbp_[a-f0-9]+' ~/.claude/projects/-Users-erickvist-Desktop-Examinador-IB-App-ib-lit-coach/memory/reference_supabase.md | head -1)
# nº de filas recientes en una tabla que tocaste (ej. auth.users / la tabla de la acción) en DEV vs PROD
for P in vmlsyansyjgopqsrvyoe tlspxuwiakcrhshwvjeo; do
  echo -n "$P: "; curl -s -A liberico-cli -X POST "https://api.supabase.com/v1/projects/$P/database/query" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data '{"query":"select count(*) from auth.users where created_at > now() - interval '"'"'10 minutes'"'"';"}'
  echo
done
```
- [ ] **Verificación:** el contador sube en **DEV** y queda igual en **PROD**. Si sube en prod → **PARA**: el preview está escribiendo en producción; revisa Task 4 (build vars).

### Task 7: Confirmar producción → PROD

- [ ] **Step 1 [CLI]:** tras desplegar `main`, grep multi-chunk del bundle de **producción**. Expected: **solo `tlspxuwiakcrhshwvjeo`**.
- [ ] **Verificación:** producción apunta a PROD; preview a DEV. **Separación frontend confirmada.**

---

## FASE 4 — Dashboards por proyecto (Auth / OAuth / Stripe)

### Task 8: Supabase Auth redirect URLs por proyecto

**Por qué:** DEV hoy solo permite `localhost:3000`; el preview tiene otra URL → OAuth/magic links fallarían desde el preview.

- [ ] **Step 1 [CLI]:** añade el dominio del preview al **uri_allow_list** y, si procede, al **site_url** de DEV (Management API):

```bash
TOKEN=$(grep -oE 'sbp_[a-f0-9]+' ~/.claude/projects/-Users-erickvist-Desktop-Examinador-IB-App-ib-lit-coach/memory/reference_supabase.md | head -1)
curl -s -A liberico-cli -X PATCH "https://api.supabase.com/v1/projects/vmlsyansyjgopqsrvyoe/config/auth" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data '{"uri_allow_list":"http://localhost:3000/**,http://localhost:5173/**,https://<preview-domain>/**"}'
```
- [ ] **Step 2 [CLI]:** confirma que **PROD** tiene `liberico.org`/`www.liberico.org` en su allow list (ya estaba; verificar).
- [ ] **Verificación:** GET de `/config/auth` de DEV muestra el dominio del preview en `uri_allow_list`.

### Task 9: Google OAuth — callback de DEV

- [ ] **Step 1 [MANUAL]:** Google Cloud Console → APIs & Services → Credentials → el OAuth Client ID (compartido) → **Authorized redirect URIs** → añadir `https://vmlsyansyjgopqsrvyoe.supabase.co/auth/v1/callback`. Guardar (tarda unos minutos).
- [ ] **Verificación:** "Continuar con Google" desde el preview completa el login sin `redirect_uri_mismatch`.

### Task 10: Stripe por entorno (cuando se monte el servicio)

- [ ] **Step 1 [MANUAL]:** Stripe **test** → `STRIPE_SECRET_KEY=sk_test_…` en secrets de DEV; webhook a `https://vmlsyansyjgopqsrvyoe.supabase.co/functions/v1/stripe-webhook` → su `STRIPE_WEBHOOK_SECRET` en DEV.
- [ ] **Step 2 [MANUAL]:** Stripe **live** → equivalentes en PROD.
- [ ] **Verificación:** un checkout test desde el preview acredita créditos en DEV (no en prod).

---

## FASE 5 — Pre-lanzamiento (antes de quitar el muro)

### Task 11: Endurecimiento y docs

- [ ] **Step 1 [CLI]: grep anti-secret** — confirmar que no se hornea service_role:
  ```bash
  rg -n "SERVICE_ROLE|sk-ant-|sk_live" src/ | rg -i "VITE_|import.meta.env" || echo "  ✓ ningún secret en build-time del cliente"
  ```
- [ ] **Step 2 [MANUAL]:** subir la org/proyectos a **Pro** antes de lanzar (free pausa por inactividad, límites de email, sin **PITR**). Activar PITR/backups en prod.
- [ ] **Step 3 [MANUAL]:** verificar **rate limiting LLM** activo en ambos proyectos (regla CLAUDE.md).
- [ ] **Step 4 [CODE]:** actualizar [docs/arquitectura.md](../../arquitectura.md) "Estado actual" → "separación completa: preview→DEV, prod→PROD, verificado". Commit.
- [ ] **Verificación:** checklist de no-fugas pasa; docs reflejan el estado final.

---

## Self-Review (cobertura)

- **Riesgo nº1 (preview hereda PROD)** → Task 2 (detecta) + Task 4 (arregla) + Task 6 (verifica con escritura real). **Build-time vs runtime** → Constraints + Task 4 (build) vs Task 5 (runtime muro). **Workers no Pages / método de deploy** → Task 1 decide; Task 4 bifurca (Workers Builds vs dos workers). **Verificación multi-chunk** → Task 2/6 (grep de todos los JS) + Task 3 (meta ref) + escritura real. **Passwords expuestas** → Task 0 (prioridad). **Auth redirects por proyecto** → Task 8. **Google OAuth** → Task 9. **Stripe/webhooks** → Task 10. **Muro por entorno** → Task 5. **service_role nunca en build** → Constraints + Task 11. **db:push:prod bloqueado / promoción por Management API** → Constraints. **Pro/PITR/rate-limit pre-launch** → Task 11.
- **Dependencia a resolver primero:** Task 1 (método de deploy) condiciona Task 4. Por eso Fase 1 es diagnóstico puro antes de tocar nada.
- **Sin placeholders:** comandos concretos (grep multi-chunk, PATCH Management API, wrangler env). Valores reales (refs DEV/PROD); las claves se leen del Keychain, no se incrustan.

## Puntos que conviene verificar con fuentes oficiales

1. ¿Tu plan de Cloudflare Workers Builds soporta **build variables por trigger** (production vs preview)? Si no → dos workers (Task 4B).
2. Formato exacto del dominio de preview de Workers (para Task 8, allow list de Auth).
