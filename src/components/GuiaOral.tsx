import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, AlertCircle, BookOpen, Mic } from "lucide-react";
import { getCamposIndagacion, getEstructurasOral } from "@/lib/oral-guide-content";
import { landingFontMono as fontMono } from "@/lib/landing-theme";

function AvisoRepetible({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[13px] text-amber-800">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

export function GuiaOral({ isEN = false }: { isEN?: boolean }) {
  const camposIndagacion = getCamposIndagacion(isEN);
  const estructurasOral = getEstructurasOral(isEN);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Mic className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-[13px] text-foreground/80 space-y-1">
          <p className="font-medium text-foreground">
            {isEN
              ? "The oral is not Paper 2 spoken. The global issue is the backbone."
              : "El oral no es Prueba 2 hablada. El asunto global es la columna vertebral."}
          </p>
          <p>
            {isEN
              ? "Explore how that issue manifests itself through "
              : "Explora cómo ese asunto se presenta mediante "}
            <strong>{isEN ? "content and form" : "contenido y forma"}</strong>
            {isEN
              ? " in two extracts and their works. Do not compare the works abstractly. Do not summarize."
              : " en dos extractos y sus obras. No compares las obras entre sí en abstracto. No resumas."}
          </p>
        </div>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {/* ── Sección 1: Asuntos globales ── */}
        <AccordionItem value="asuntos-globales" className="rounded-xl border px-4">
          <AccordionTrigger className="text-left py-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold shrink-0">
                1
              </span>
              <span className="font-medium text-[15px]">
                {isEN
                  ? "Examples of global issues by field of inquiry"
                  : "Ejemplos de asuntos globales por campo de indagación"}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <p className="text-[13px] text-muted-foreground mb-4">
              {isEN
                ? "A good global issue is specific, debatable, and broad enough to appear in works from very different contexts. A weak issue is usually a general concept without analytical tension."
                : "Un buen asunto global es específico, debatible y lo suficientemente amplio para aparecer en obras de contextos muy distintos. Un asunto débil suele ser un concepto general sin tensión analítica."}
            </p>

            <Tabs defaultValue={camposIndagacion[0].key}>
              <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
                {camposIndagacion.map((campo) => (
                  <TabsTrigger
                    key={campo.key}
                    value={campo.key}
                    className="text-[12px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border rounded-md px-3 py-1.5"
                  >
                    {campo.nombre.split(",")[0]}
                  </TabsTrigger>
                ))}
              </TabsList>

              {camposIndagacion.map((campo) => (
                <TabsContent key={campo.key} value={campo.key} className="space-y-4 mt-0">
                  <p className="text-[13px] font-medium text-foreground">{campo.nombre}</p>

                  <div className="space-y-2">
                    <div
                      className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                      style={fontMono}
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      {isEN ? "Good examples" : "Buenos ejemplos"}
                    </div>
                    {campo.buenos.map((ej, i) => (
                      <div
                        key={i}
                        className="grid gap-2.5 p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg sm:grid-cols-[1fr_1.1fr]"
                      >
                        <div className="flex gap-2.5 rounded-md border border-emerald-100 bg-white/70 px-3 py-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-4" />
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-700 mb-1">
                              {isEN ? "Global issue" : "Asunto global"}
                            </p>
                            <p className="text-[13px] font-medium text-foreground/90 leading-relaxed">
                              {ej.texto}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-md border border-emerald-100 bg-white/60 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-700 mb-1">
                            {isEN ? "Why it matters" : "Por qué importa"}
                          </p>
                          <p className="text-[12px] text-foreground/75 leading-relaxed">
                            {ej.importancia}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div
                      className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                      style={fontMono}
                    >
                      <XCircle className="h-3 w-3 text-red-500" />
                      {isEN ? "Weak examples" : "Ejemplos débiles"}
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
                      <span className="font-medium text-foreground">
                        {isEN ? "Why they work: " : "Por qué funcionan: "}
                      </span>
                      {campo.porQueFuncionan}
                    </p>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </AccordionContent>
        </AccordionItem>

        {/* ── Sección 2: Estructura y minutaje ── */}
        <AccordionItem value="estructura" className="rounded-xl border px-4">
          <AccordionTrigger className="text-left py-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold shrink-0">
                2
              </span>
              <span className="font-medium text-[15px]">
                {isEN ? "Structure and timing" : "Estructura y minutaje"}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <AvisoRepetible>
              {isEN
                ? "School-supported self-taught students have no teacher questions. Their presentation must be self-sufficient: what a taught student completes in the 5 minutes of questions must be integrated within the 15 minutes."
                : "El alumno de aprendizaje autodidacta con apoyo del colegio no tiene preguntas del profesor. Su exposición debe ser autosuficiente: lo que un alumno con profesor completa en los 5 minutos de preguntas debe integrarlo dentro de sus 15 minutos."}
            </AvisoRepetible>

            <Tabs defaultValue="self_taught">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="taught" className="flex-1 sm:flex-none text-[13px]">
                  {isEN ? "Taught student" : "Alumno con profesor"}
                </TabsTrigger>
                <TabsTrigger value="self_taught" className="flex-1 sm:flex-none text-[13px]">
                  {isEN
                    ? "School-supported self-taught"
                    : "Aprendizaje autodidacta con apoyo del colegio"}
                </TabsTrigger>
              </TabsList>

              {estructurasOral.map((estructura) => (
                <TabsContent
                  key={estructura.tipo}
                  value={estructura.tipo}
                  className="space-y-4 mt-4"
                >
                  <div className="flex flex-wrap gap-2 text-[12px]">
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {estructura.exposicionMin}{" "}
                      {isEN ? "min of presentation" : "min de exposición"}
                    </Badge>
                    {estructura.preguntasMin && (
                      <Badge variant="outline" className="gap-1">
                        <BookOpen className="h-3 w-3" />
                        {estructura.preguntasMin}{" "}
                        {isEN ? "min of teacher questions" : "min de preguntas del profesor"}
                      </Badge>
                    )}
                    {!estructura.preguntasMin && (
                      <Badge variant="secondary" className="gap-1 text-[11px]">
                        {isEN ? "No teacher questions" : "Sin preguntas del profesor"}
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
                      <p
                        className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground"
                        style={fontMono}
                      >
                        {isEN
                          ? "For the 5 minutes of questions"
                          : "Para los 5 minutos de preguntas"}
                      </p>
                      <div className="rounded-xl border border-border bg-muted/30 p-3 text-[12px] leading-relaxed text-foreground/75">
                        {isEN
                          ? "The teacher's questions are not a second oral. They are a chance to clarify evidence, deepen one formal choice, or connect an answer back to the global issue. For example, if asked why the chosen extract matters, answer with its location in the work, one precise detail, and the way that detail sharpens the global issue."
                          : "Las preguntas del profesor no son un segundo oral. Sirven para aclarar una prueba, profundizar en una decisión formal o volver al asunto global. Por ejemplo, si te preguntan por qué importa el extracto elegido, responde ubicándolo en la obra, citando un detalle preciso y explicando cómo ese detalle afina el asunto global."}
                      </div>
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
                        <span className="font-medium">{isEN ? "Remember: " : "Recuerda: "}</span>
                        {isEN
                          ? "the synthesis and closing are longer than in the taught modality because you must close all ideas without external support. Do not leave obvious gaps unaddressed."
                          : "la síntesis y el cierre son más largos que en la modalidad con profesor porque debes cerrar todas las ideas sin apoyo externo. No dejes lagunas evidentes sin abordar."}
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
