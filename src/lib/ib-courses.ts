// Módulo compartido: cursos del IB (frontend)

export type CourseKey = "spanish-a-literature" | "english-a-literature" | "spanish-b-language";

// SL = Standard Level (alias NM para Español A)
// HL = Higher Level  (alias NS para Español A)
export type Nivel = "SL" | "HL";

export type TipoObraOral = "original_language" | "in_translation" | "unspecified";

export type UiLang = "es" | "en";

type CourseCapabilities = {
  paper1Enabled: boolean;
  paper2Enabled: boolean;
  oralEnabled: boolean;
  practiceLibrary: boolean;
  oralSimulator: boolean;
  studyPlan: boolean;
  exercises: boolean;
  theory: boolean;
  questionBank: boolean;
};

type CourseDef = {
  label: string;
  niveles: Nivel[];
  capabilities: CourseCapabilities;
  defaultUiLang: UiLang;
  supportedUiLangs: readonly UiLang[];
};

export const COURSES: Record<CourseKey, CourseDef> = {
  "spanish-a-literature": {
    label: "Español A: Literatura",
    niveles: ["SL", "HL"],
    capabilities: {
      paper1Enabled: true,
      paper2Enabled: true,
      oralEnabled: true,
      practiceLibrary: true,
      oralSimulator: true,
      studyPlan: true,
      exercises: true,
      theory: true,
      questionBank: true,
    },
    defaultUiLang: "es",
    supportedUiLangs: ["es"],
  },
  "english-a-literature": {
    label: "English A: Literature",
    niveles: ["SL", "HL"],
    capabilities: {
      paper1Enabled: true,
      paper2Enabled: true,
      oralEnabled: true,
      practiceLibrary: false,
      oralSimulator: true,
      studyPlan: true,
      exercises: false,
      theory: false,
      questionBank: false,
    },
    defaultUiLang: "en",
    supportedUiLangs: ["en"],
  },
  "spanish-b-language": {
    label: "Spanish B (Acquisition)",
    niveles: ["SL"],
    capabilities: {
      paper1Enabled: true,
      paper2Enabled: false,
      oralEnabled: false,
      practiceLibrary: false,
      oralSimulator: false,
      studyPlan: false,
      exercises: false,
      theory: false,
      questionBank: false,
    },
    defaultUiLang: "en",
    supportedUiLangs: ["en", "es"],
  },
};

export function parseUiLang(value: string | undefined | null): UiLang {
  return value === "en" ? "en" : value === "es" ? "es" : "es";
}

/** Alias de nivel según el curso para mostrar en UI. */
export function nivelDisplayLabel(nivel: Nivel, courseKey: CourseKey): string {
  if (courseKey === "spanish-a-literature") return nivel === "SL" ? "NM" : "NS";
  return nivel;
}

/** Alias de nivel inverso: convierte NM/NS legacy a SL/HL normalizado. */
export function parseNivel(value: string | undefined | null): Nivel {
  if (value === "HL" || value === "NS") return "HL";
  return "SL";
}

/** Valida y normaliza course_key; default: spanish-a-literature. */
export function parseCourseKey(value: string | undefined | null): CourseKey {
  if (value === "english-a-literature") return "english-a-literature";
  if (value === "spanish-b-language") return "spanish-b-language";
  return "spanish-a-literature";
}

export const OBRA_TIPO_LABELS: Record<TipoObraOral, string> = {
  original_language: "Escrita en la lengua del curso",
  in_translation: "Estudiada en traducción",
  unspecified: "No especificado",
};

/** Devuelve opciones de tipo de obra con labels bilingües (ES/EN). */
export function getObraTipoOpciones(isEN: boolean) {
  return [
    {
      value: "original_language" as TipoObraOral,
      label: isEN ? "Written in the language of study" : "Escrita en la lengua del curso",
    },
    {
      value: "in_translation" as TipoObraOral,
      label: isEN ? "Studied in translation" : "Estudiada en traducción",
    },
    {
      value: "unspecified" as TipoObraOral,
      label: isEN ? "Not specified" : "No especificado",
    },
  ];
}

/** Convierte valores legacy de TipoObraOral a los nuevos valores normalizados. */
export function parseObraTipo(value: string | undefined | null): TipoObraOral {
  if (value === "in_translation" || value === "traducida") return "in_translation";
  if (value === "original_language" || value === "original_espanol") return "original_language";
  return "unspecified";
}

/** Badge corto para historial: "ES" (Spanish A Lit), "EN" (English A Lit), "ES-B" (Spanish B). */
export function courseBadge(courseKey: CourseKey): string {
  if (courseKey === "english-a-literature") return "EN";
  if (courseKey === "spanish-b-language") return "ES-B";
  return "ES";
}
