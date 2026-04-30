import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, AlertCircle, BookOpen, Mic } from "lucide-react";
import {
  CAMPOS_INDAGACION,
  EJEMPLOS_INTRODUCCION,
  ESTRUCTURAS_ORAL,
} from "@/lib/oral-guide-content";
import { cn } from "@/lib/utils";

function EstadoBadge({ tipo }: { tipo: "bueno" | "debil" }) {
  if (tipo === "bueno") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
        <CheckCircle2 className="h-3 w-3" />
        Bueno
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
      <XCircle className="h-3 w-3" />
      Débil
    </span>
  );
}

function AvisoRepetible({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[13px] text-amber-800">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

export function GuiaOral() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <Mic className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-[13px] text-foreground/80 space-y-1">
          <p className="font-medium text-foreground">
            El oral no es Prueba 2 hablada. El asunto global es la columna vertebral.
          </p>
          <p>
            Explora cómo ese asunto se presenta mediante <strong>contenido y forma</strong> en dos
            extractos y sus obras. No compares las obras entre sí en abstracto. No resumas.
          </p>
        </div>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {/* ── Sección 1: Asuntos globales ── */}
        <AccordionItem value="asuntos-globales" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left py-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold shrink-0">
                1
              </span>
              <span className="font-medium text-[15px]">
                Ejemplos de asuntos globales por campo de indagación
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <p className="text-[13px] text-muted-foreground mb-4">
              Un buen asunto global es específico, debatible y lo suficientemente amplio para
              aparecer en obras de contextos muy distintos. Un asunto débil suele ser un concepto
              general sin tensión analítica.
            </p>

            <Tabs defaultValue={CAMPOS_INDAGACION[0].key}>
              <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
                {CAMPOS_INDAGACION.map((campo) => (
                  <TabsTrigger
                    key={campo.key}
                    value={campo.key}
                    className="text-[12px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border rounded-md px-3 py-1.5"
                  >
                    {campo.nombre.split(",")[0]}
                  </TabsTrigger>
                ))}
              </TabsList>

              {CAMPOS_INDAGACION.map((campo) => (
                <TabsContent key={campo.key} value={campo.key} className="space-y-4 mt-0">
                  <p className="text-[13px] font-medium text-foreground">{campo.nombre}</p>

                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Buenos ejemplos
                    </div>
                    {campo.buenos.map((ej, i) => (
                      <div
                        key={i}
                        className="flex gap-2.5 p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <p className="text-[13px] text-foreground/90 leading-relaxed">{ej.texto}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                      <XCircle className="h-3 w-3 text-red-500" />
                      Ejemplos débiles
                    </div>
                    {campo.debiles.map((ej, i) => (
                      <div
                        key={i}
                        className="p-3 bg-red-50/60 border border-red-100 rounded-lg space-y-1.5"
                      >
                        <div className="flex gap-2 items-start">
                          <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-[13px] font-medium text-foreground/90">"{ej.texto}"</p>
                        </div>
                        <p className="text-[12px] text-muted-foreground pl-6">{ej.razon}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-accent/50 rounded-lg">
                    <p className="text-[12px] text-foreground/70 leading-relaxed">
                      <span className="font-medium text-foreground">Por qué funcionan: </span>
                      {campo.porQueFuncionan}
                    </p>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </AccordionContent>
        </AccordionItem>

        {/* ── Sección 2: Ejemplos de introducción ── */}
        <AccordionItem value="introduccion" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left py-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold shrink-0">
                2
              </span>
              <span className="font-medium text-[15px]">Cómo estructurar la introducción</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <div className="p-3 border rounded-lg bg-background space-y-1.5">
              <p className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground">
                La introducción debe incluir
              </p>
              <ul className="space-y-1">
                {[
                  "Presentación clara del asunto global.",
                  "Justificación breve de por qué es global y específico.",
                  "Título, autor y estado lingüístico de cada obra (original en español / traducida).",
                  "Localización precisa de los dos extractos dentro de sus obras.",
                  "Tesis o hipótesis de lectura: cómo se manifiesta el asunto global en ambas obras.",
                  "Mapa breve de la estructura del oral.",
                ].map((item, i) => (
                  <li key={i} className="flex gap-2 text-[13px] text-foreground/80">
                    <span className="text-primary shrink-0 font-medium">{i + 1}.</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <AvisoRepetible>
              La introducción debe incluir una tesis que conecte el asunto global con una decisión
              de contenido o de forma en las obras. No es suficiente decir "ambas obras tratan el
              poder": hay que decir cómo.
            </AvisoRepetible>

            <div className="space-y-5">
              {EJEMPLOS_INTRODUCCION.map((ej, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <EstadoBadge tipo={ej.tipo} />
                    <span className="text-[13px] font-medium text-foreground">{ej.etiqueta}</span>
                  </div>

                  <div className="text-[11px] text-muted-foreground space-y-0.5 pl-1">
                    <p>
                      <span className="font-medium">Modalidad:</span> {ej.contexto.tipoOral}
                    </p>
                    <p>
                      <span className="font-medium">Asunto global:</span> {ej.contexto.asuntoGlobal}
                    </p>
                    <p>
                      <span className="font-medium">Obra 1:</span> {ej.contexto.obra1}
                    </p>
                    <p>
                      <span className="font-medium">Obra 2:</span> {ej.contexto.obra2}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "p-4 rounded-lg border text-[13px] leading-relaxed whitespace-pre-line",
                      ej.tipo === "bueno"
                        ? "bg-emerald-50/40 border-emerald-100 text-foreground/85"
                        : "bg-red-50/40 border-red-100 text-foreground/85",
                    )}
                  >
                    {ej.texto}
                  </div>

                  <div className="p-3 bg-accent/40 rounded-lg border-l-2 border-primary/40">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">
                      Comentario pedagógico
                    </p>
                    <p className="text-[12px] text-foreground/75 leading-relaxed whitespace-pre-line">
                      {ej.comentario}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Sección 3: Estructura y minutaje ── */}
        <AccordionItem value="estructura" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left py-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold shrink-0">
                3
              </span>
              <span className="font-medium text-[15px]">Estructura y minutaje</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <AvisoRepetible>
              El self-taught no tiene preguntas del profesor. Su exposición debe ser autosuficiente:
              lo que un alumno taught completa en los 5 minutos de preguntas, el self-taught debe
              integrarlo dentro de sus 15 minutos.
            </AvisoRepetible>

            <Tabs defaultValue="taught">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="taught" className="flex-1 sm:flex-none text-[13px]">
                  Alumno con profesor
                </TabsTrigger>
                <TabsTrigger value="self_taught" className="flex-1 sm:flex-none text-[13px]">
                  Self-taught / SSST
                </TabsTrigger>
              </TabsList>

              {ESTRUCTURAS_ORAL.map((estructura) => (
                <TabsContent
                  key={estructura.tipo}
                  value={estructura.tipo}
                  className="space-y-4 mt-4"
                >
                  <div className="flex flex-wrap gap-2 text-[12px]">
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {estructura.exposicionMin} min de exposición
                    </Badge>
                    {estructura.preguntasMin && (
                      <Badge variant="outline" className="gap-1">
                        <BookOpen className="h-3 w-3" />
                        {estructura.preguntasMin} min de preguntas del profesor
                      </Badge>
                    )}
                    {!estructura.preguntasMin && (
                      <Badge variant="secondary" className="gap-1 text-[11px]">
                        Sin preguntas del profesor
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    {estructura.bloques.map((bloque, i) => (
                      <div
                        key={i}
                        className="flex gap-3 p-3 rounded-lg border bg-background hover:bg-accent/30 transition-colors"
                      >
                        <div className="shrink-0 text-right w-24">
                          <span className="text-[12px] font-mono font-medium text-primary">
                            {bloque.tiempo}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-[13px] text-foreground/90 leading-relaxed">
                            {bloque.descripcion}
                          </p>
                          {bloque.nota && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {bloque.nota}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {estructura.consejosPostExposicion && (
                    <div className="space-y-2">
                      <p className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground">
                        Para los 5 minutos de preguntas
                      </p>
                      <ul className="space-y-1.5">
                        {estructura.consejosPostExposicion.map((consejo, i) => (
                          <li key={i} className="flex gap-2 text-[13px] text-foreground/80">
                            <span className="text-primary shrink-0 mt-0.5">·</span>
                            {consejo}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {estructura.tipo === "self_taught" && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-[12px] text-amber-800 leading-relaxed">
                        <span className="font-medium">Recuerda: </span>
                        la síntesis y el cierre son más largos que en la modalidad taught porque
                        debes cerrar todas las ideas sin apoyo externo. No dejes lagunas evidentes
                        sin abordar.
                      </p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
