# Nota futura: modelo de negocio

_Creado: 2026-04-28_
_Ultima actualizacion: 2026-04-28_

Esta nota recoge una posible estrategia de monetización para cuando el producto esté listo para probarse con usuarios reales. No es una decisión cerrada: debe validarse con estudiantes, padres y profesores antes de construir pagos en producción.

---

## Principio de producto

IB Lit Coach no debería vender solo "una nota". El valor real está en la progresión pedagógica:

1. El alumno entiende en qué banda está.
2. Ve qué falla en su propio texto.
3. Recibe reescrituras concretas que conservan su voz, ideas y estructura.
4. Puede comparar su ensayo con una versión elevada a banda 5.
5. Tiene recursos y práctica para mejorar entre una corrección y la siguiente.

El modelo de negocio debería reflejar esa escalera. Cuanto más profunda sea la intervención pedagógica, más valor tiene.

---

## Recomendación general

Usar un modelo híbrido:

- **Créditos para correcciones puntuales.**
- **Suscripción para aprendizaje continuo.**
- **Licencias de profesor o centro educativo como vía B2B posterior.**

La idea inicial de cobrar **1 euro por evaluación** es atractiva porque reduce fricción, pero no conviene venderlo como transacción individual suelta. Las pasarelas de pago suelen tener una comisión fija por operación, así que una compra de 1 euro pierde demasiado margen.

Mejor alternativa: vender paquetes de créditos pequeños y fáciles de entender.

---

## Escalera de valor para estudiantes

### Nivel gratuito

Objetivo: que el alumno pruebe la calidad sin riesgo.

Posibles límites:

- 1 corrección diagnóstica limitada.
- O una demo con texto de ejemplo.
- O feedback parcial sin propuesta completa.

Debe servir para demostrar que el corrector entiende literatura, no solo gramática.

### Corrección básica

Precio sugerido: **1 crédito**.

Incluye:

- Bandas A/B/C/D.
- Nota total aproximada.
- Justificación por criterio.
- Fortalezas.
- Áreas de mejora.
- Guardado en historial.

Este es el producto mínimo de respuesta directa.

### Corrección pedagógica anotada

Precio sugerido: **+1 crédito** sobre la corrección básica.

Incluye:

- Solución anotada sobre el texto del alumno.
- Filtros por tipo de anotación.
- Comentarios sobre estructura, foco, verbos poco analíticos, interferencias con el inglés y oportunidades de mejora.
- Microreescrituras que mantienen la voz, ideas y estructura del alumno.

Este bloque es probablemente el diferencial principal del producto.

### Ensayo elevado a banda 5

Precio sugerido: **+2 créditos**.

Incluye:

- Versión completa del ensayo llevada a banda 5.
- Conservando la tesis, ideas principales, orden general y voz del alumno tanto como sea posible.
- Sirve como modelo de comparación, no como sustituto del trabajo del estudiante.

Conviene presentarlo pedagógicamente como "versión modelo personalizada", no como "ensayo para copiar".

### Recursos y aprendizaje continuo

Precio sugerido: suscripción.

Incluye:

- Plan de estudio.
- Biblioteca de textos.
- Microejercicios.
- Progreso por criterio.
- Recursos literarios y teoría.
- Comparación de evolución entre correcciones.
- Posible chat/tutor guiado.

Este nivel tiene sentido para alumnos que preparan el IB durante semanas o meses.

---

## Paquetes de créditos

Evitar micropagos sueltos. En Suecia, Stripe cobra una comisión fija por transacción que hace poco atractiva la compra individual de una corrección barata. Es preferible vender créditos en paquetes.

| Paquete   | Precio  | Uso esperado                            |
| --------- | ------- | --------------------------------------- |
| Starter   | 49 SEK  | Prueba real de varias correcciones      |
| Practice  | 119 SEK | Alumno que practica de forma puntual    |
| Exam Prep | 299 SEK | Preparación intensiva antes de exámenes |

Ejemplo de consumo:

- Paper 1, corrección básica: 1 crédito.
- Paper 1, solución anotada con reescrituras: +1 crédito.
- Paper 1, ensayo banda 5: +2 créditos.

Una experiencia completa de Paper 1 podría costar 4 créditos: corrección, anotación pedagógica y versión banda 5.

---

## Suscripciones posibles para Suecia

Estas cifras son hipótesis de partida, no precios finales.

| Plan      | Precio      | Créditos | Uso esperado                               |
| --------- | ----------- | -------- | ------------------------------------------ |
| Basic     | 79 SEK/mes  | 10       | Entrada barata, recursos y práctica ligera |
| Plus      | 149 SEK/mes | 25       | Plan principal para preparación regular    |
| Intensive | 249 SEK/mes | 50       | Preparación fuerte antes de exámenes       |

La suscripción debe tener límites claros para controlar costes de LLM. Si se ofrece "ilimitado", debería estar sujeto a uso razonable y rate limits.

La hipótesis comercial preferida es que la base de suscriptores de pago tenga un mix aproximado de:

- 50% Plus.
- 50% Intensive.

Esto da un ingreso medio de 199 SEK/mes por alumno y 37,5 créditos mensuales incluidos.

---

## Paper 1, Paper 2, oral y Extended Essay

Paper 1 y Paper 2 pueden vivir dentro del sistema normal de créditos, siempre que Paper 2 consuma más créditos por su mayor complejidad. El oral también puede entrar parcialmente en la suscripción, aunque los simulacros completos deberían consumir bastantes créditos. Extended Essay debe tratarse como add-on premium o consumo alto de créditos.

| Producto             | Consumo sugerido        | Nota comercial                                |
| -------------------- | ----------------------- | --------------------------------------------- |
| Paper 1 completo     | 4 créditos              | Producto base frecuente                       |
| Paper 2 completo     | 7 créditos              | Mayor valor por comparación entre obras       |
| Oral mock completo   | 8-10 créditos           | Se percibe cerca de tutor privado             |
| EE revisión completa | 15-25 créditos o add-on | No incluir ilimitado en suscripciones baratas |

El EE no debe venderse como "te escribimos el ensayo". Debe presentarse como feedback académico sobre research question, estructura, evidencia, coherencia argumental, fuentes y plan de revisión.

---

## Supuestos financieros Suecia

Fuentes de referencia usadas para los cálculos:

- Stripe Suecia: 1,5% + 1,80 SEK para tarjetas estándar EEE.
- Moms estándar Suecia: 25%.
- Bolagsskatt para aktiebolag: 20,6%.
- Anthropic Opus 4.7: 5 USD/M input tokens y 25 USD/M output tokens.

Supuestos operativos:

- Precios con moms incluida.
- Sin gasto de marketing en las tablas siguientes.
- Sin sueldo propio, soporte externo ni contabilidad incluidos.
- Coste fijo técnico aproximado: 1.500-30.000 SEK/mes según escala.
- Coste Opus conservador: 1,1 SEK por crédito consumido.
- Cada alumno consume todos sus créditos mensuales.

Con el mix 50% Plus / 50% Intensive:

| Concepto por alumno medio | SEK/mes |
| ------------------------- | ------: |
| Pago del alumno           |     199 |
| Neto tras moms + Stripe   |    ~154 |
| Coste Opus estimado       |     ~41 |
| Margen antes de fijos     |    ~113 |

---

## Pronóstico por usuarios de pago

### Sin EE add-on

| Usuarios | Bruto mensual | Neto tras moms + Stripe |        Opus |      Fijos | Antes impuestos | Neto AB mensual |  Neto AB anual |
| -------: | ------------: | ----------------------: | ----------: | ---------: | --------------: | --------------: | -------------: |
|       10 |     1.990 SEK |               1.544 SEK |     413 SEK |  1.500 SEK |        -368 SEK |        -368 SEK |     -4.420 SEK |
|       25 |     4.975 SEK |               3.860 SEK |   1.031 SEK |  1.500 SEK |       1.329 SEK |       1.055 SEK |     12.664 SEK |
|       50 |     9.950 SEK |               7.721 SEK |   2.063 SEK |  1.500 SEK |       4.158 SEK |       3.302 SEK |     39.620 SEK |
|      100 |    19.900 SEK |              15.442 SEK |   4.125 SEK |  1.500 SEK |       9.817 SEK |       7.794 SEK |     93.532 SEK |
|      250 |    49.750 SEK |              38.604 SEK |  10.313 SEK |  3.000 SEK |      25.291 SEK |      20.081 SEK |    240.975 SEK |
|      500 |    99.500 SEK |              77.208 SEK |  20.625 SEK |  3.000 SEK |      53.583 SEK |      42.545 SEK |    510.534 SEK |
|    1.000 |   199.000 SEK |             154.415 SEK |  41.250 SEK |  6.000 SEK |     107.165 SEK |      85.089 SEK |  1.021.068 SEK |
|    2.000 |   398.000 SEK |             308.830 SEK |  82.500 SEK | 12.000 SEK |     214.330 SEK |     170.178 SEK |  2.042.136 SEK |
|    5.000 |   995.000 SEK |             772.075 SEK | 206.250 SEK | 30.000 SEK |     535.825 SEK |     425.445 SEK |  5.105.341 SEK |
|   10.000 | 1.990.000 SEK |           1.544.150 SEK | 412.500 SEK | 30.000 SEK |   1.101.650 SEK |     874.710 SEK | 10.496.521 SEK |

### Con EE add-on en 10% de usuarios

Supuesto: el 10% de usuarios compra una revisión EE mensual de 399 SEK.

| Usuarios | Bruto mensual | Neto tras moms + Stripe |        Opus |      Fijos | Antes impuestos | Neto AB mensual |  Neto AB anual |
| -------: | ------------: | ----------------------: | ----------: | ---------: | --------------: | --------------: | -------------: |
|       10 |     2.389 SEK |               1.856 SEK |     438 SEK |  1.500 SEK |         -82 SEK |         -82 SEK |       -983 SEK |
|       25 |     5.973 SEK |               4.639 SEK |   1.094 SEK |  1.500 SEK |       2.045 SEK |       1.624 SEK |     19.486 SEK |
|       50 |    11.945 SEK |               9.278 SEK |   2.188 SEK |  1.500 SEK |       5.590 SEK |       4.439 SEK |     53.265 SEK |
|      100 |    23.890 SEK |              18.556 SEK |   4.375 SEK |  1.500 SEK |      12.681 SEK |      10.068 SEK |    120.821 SEK |
|      250 |    59.725 SEK |              46.389 SEK |  10.938 SEK |  3.000 SEK |      32.452 SEK |      25.767 SEK |    309.199 SEK |
|      500 |   119.450 SEK |              92.778 SEK |  21.875 SEK |  3.000 SEK |      67.903 SEK |      53.915 SEK |    646.982 SEK |
|    1.000 |   238.900 SEK |             185.557 SEK |  43.750 SEK |  6.000 SEK |     135.807 SEK |     107.830 SEK |  1.293.964 SEK |
|    2.000 |   477.800 SEK |             371.113 SEK |  87.500 SEK | 12.000 SEK |     271.613 SEK |     215.661 SEK |  2.587.929 SEK |
|    5.000 | 1.194.500 SEK |             927.783 SEK | 218.750 SEK | 30.000 SEK |     679.033 SEK |     539.152 SEK |  6.469.822 SEK |
|   10.000 | 2.389.000 SEK |           1.855.565 SEK | 437.500 SEK | 30.000 SEK |   1.388.065 SEK |   1.102.124 SEK | 13.225.483 SEK |

Lectura provisional: sin marketing, el punto de equilibrio está alrededor de 15-20 usuarios de pago. Con 500 usuarios, el producto podría dejar unos 42.500-53.900 SEK/mes netos en el AB, según EE. Con 1.000 usuarios, entre 85.000 y 108.000 SEK/mes.

---

## Tamaño de mercado inicial

Para una primera versión centrada en Spanish A:

- El mercado total no es todo IB, sino alumnos de Language A en español.
- La estimación aproximada es 22.000-23.000 candidatos finales anuales de Spanish A.
- Como el IB dura dos años, el mercado activo aproximado puede rondar 45.000 alumnos.
- Suecia, con 35 colegios DP, es buen mercado piloto, pero no debería ser el mercado principal.

La expansión natural sería:

1. Spanish A como nicho inicial.
2. English A para ampliar mercado.
3. Otros idiomas de Language A si los prompts y criterios se validan bien.

---

## Profesores y centros

Una línea futura más sólida puede ser B2B:

- Licencia por profesor.
- Panel de alumnos.
- Correcciones agregadas.
- Seguimiento de progreso por clase.
- Chat docente.
- Exportación de feedback.

Este modelo probablemente soporta precios más altos y menor sensibilidad al pago por uso que el mercado directo a estudiantes.

El documento de costes técnicos relevante es `docs/analisis-costes-api.md`.

---

## Riesgos

- **Coste variable de LLM:** las funciones con salida larga son las más caras.
- **Percepción ética:** la versión banda 5 debe enseñarse como herramienta de aprendizaje, no como generación de tareas para entregar.
- **Demasiada complejidad comercial:** si hay demasiados upsells, el alumno puede sentirse penalizado.
- **Dependencia de calidad:** si la corrección no es consistente, el modelo de pago pierde confianza rápido.
- **Usuarios menores:** pagos, privacidad y consentimiento deben tratarse con especial cuidado.

---

## Qué validar antes de implementar pagos

1. Si los alumnos entienden la diferencia entre corrección básica, solución anotada y ensayo banda 5.
2. Si pagarían por paquete de créditos o prefieren suscripción.
3. Si padres/profesores perciben valor suficiente para pagar mensualmente.
4. Cuánto cuesta de media una corrección completa en producción.
5. Si el ensayo banda 5 mejora el aprendizaje o incentiva copia pasiva.
6. Qué límites diarios o mensuales son necesarios para proteger costes.

---

## Decisión provisional

Cuando llegue el momento de monetizar, empezar con:

1. **Prueba gratuita limitada.**
2. **Paquetes de créditos.**
3. **Tres niveles de profundidad:** corrección básica, solución anotada, ensayo banda 5.
4. **Suscripción solo cuando existan suficientes recursos de aprendizaje continuo.**

No construir todavía un sistema de pagos hasta haber probado el MVP con usuarios reales y haber medido coste medio por evaluación.
