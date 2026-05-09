import type { CourseKey } from "../ib-courses";
import type { CriteriaSet, Paper } from "./types";
import { SET_SPANISH_A_P1, SET_SPANISH_A_P2, SET_SPANISH_A_ORAL } from "./spanish-a-literature";
import { SET_SPANISH_B_P1 } from "./spanish-b-language";

export type { CriteriaItem, CriteriaSet, IBScaleBand, Paper, UiLang } from "./types";
export { criterionName, notaIBFromScale } from "./types";

export {
  CRITERIOS_SPANISH_A_P1_ES,
  CRITERIOS_SPANISH_A_P1_EN,
  CRITERIOS_SPANISH_A_P2_ES,
  CRITERIOS_SPANISH_A_P2_EN,
  CRITERIOS_SPANISH_A_ORAL_ES,
  CRITERIOS_SPANISH_A_ORAL_EN,
  SET_SPANISH_A_P1,
  SET_SPANISH_A_P2,
  SET_SPANISH_A_ORAL,
} from "./spanish-a-literature";

export {
  CRITERIOS_SPANISH_B_P1_ES,
  CRITERIOS_SPANISH_B_P1_EN,
  SET_SPANISH_B_P1,
  TEXT_TYPE_LABELS,
  THEME_LABELS,
  WORD_COUNT_RANGE_SL,
} from "./spanish-b-language";
export type { TextTypeP1B, ThemeP1B } from "./spanish-b-language";

const PAPER_TO_LIT_SET = {
  p1: SET_SPANISH_A_P1,
  p2: SET_SPANISH_A_P2,
  oral: SET_SPANISH_A_ORAL,
} as const satisfies Record<Paper, CriteriaSet>;

/** Devuelve el conjunto de criterios oficial para (curso, papel). */
export function getCriteriaSet(course: CourseKey, paper: Paper): CriteriaSet | null {
  if (course === "spanish-a-literature" || course === "english-a-literature") {
    return PAPER_TO_LIT_SET[paper];
  }
  if (course === "spanish-b-language") {
    if (paper === "p1") return SET_SPANISH_B_P1;
    return null; // P2/Oral aún no implementados para Spanish B
  }
  return null;
}
