# Análisis de costes API y estrategia de precios

_Última actualización: 2026-04-27_

---

## Datos de referencia (sesión real, teacher-chat)

| Métrica | Valor |
|---|---|
| Peticiones | 7 |
| Tokens entrada | 14 486 |
| Tokens salida | 13 302 |
| Coste total | ~$0.44 |

**Coste por mensaje:**
- Entrada: ~2 070 tokens/mensaje
- Salida: ~1 900 tokens/mensaje
- **Total: ~$0.058/mensaje**
- El 82% del coste es salida (Opus 4.7 cobra $25/1M salida vs $5/1M entrada)

---

## Precios Anthropic — Opus 4.7 (modelo actual)

| Concepto | Precio |
|---|---|
| Entrada | $5.00 / 1M tokens |
| Salida | $25.00 / 1M tokens |
| Cache creation | $6.25 / 1M tokens (×1.25 sobre entrada) |
| Cache read | $0.50 / 1M tokens (×0.10 sobre entrada) |

---

## Proyección mensual por profesor (20 días laborables)

| Uso | Msgs/día | Msgs/mes | Coste API/mes |
|---|---|---|---|
| Ligero | 10 | 200 | ~$11.60 |
| Medio | 30 | 600 | ~$34.80 |
| Intenso | 60 | 1 200 | ~$69.60 |
| Máximo (rate limit) | 100 | 2 000 | ~$116.00 |

**Otros costes por profesor activo/mes (estimación):**
- `rewrite-feedback`: ~$0.04/reescritura × 50 usos = ~$2.00
- `evaluate-analysis`: ~$0.08/corrección × 40 alumnos = ~$3.20
- `generate-study-plan`: coste puntual, no recurrente = ~$0.15

**Total estimado profesor medio: ~$35–40/mes en API**

---

## Precio de venta recomendado

**€59–79/mes por licencia de profesor**

- Margen sobre coste API en escenario medio: ~1.5×–2×
- Cubre Supabase, hosting, desarrollo y soporte
- Opción: incluir 500 msgs/mes y cobrar extra a partir de ahí, para protegerse del uso intensivo sin penalizar al usuario medio

---

## Alternativas de modelo para teacher-chat

El teacher-chat consume el 85–90% del gasto total por profesor. Cambiar de modelo reduce el coste drásticamente:

| Modelo | Entrada $/1M | Salida $/1M | Coste/msg | Coste/mes (uso medio) | Ahorro |
|---|---|---|---|---|---|
| Opus 4.7 (actual) | $5.00 | $25.00 | $0.0580 | ~$34.80 | — |
| Sonnet 4.6 | $3.00 | $15.00 | $0.0124 | ~$7.44 | ~79% |
| Haiku 4.5 | $1.00 | $5.00 | $0.0029 | ~$1.74 | ~95% |

**Recomendación:** Sonnet 4.6 es el mejor compromiso calidad/precio para consultas pedagógicas (criterios IB, calibración de bandas, actividades). Haiku 4.5 es viable si la calidad se valida con pruebas reales.

`evaluate-analysis` y `rewrite-feedback` sí justifican Opus por el impacto pedagógico directo en el alumno. `generate-study-plan` también.

---

## Notas adicionales

- Los tokens de entrada crecen con el historial del chat (`slice(-20)`). Reducir a `slice(-10)` recorta ~30% de tokens de entrada en teacher-chat.
- El rate limit actual es 100 msgs/día por profesor (configurable en la edge function `teacher-chat/index.ts`).
- Estos números son con prompt caching activo. Sin caché el coste de entrada sería ~5× mayor en las primeras peticiones de cada sesión.
