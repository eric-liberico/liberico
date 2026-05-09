export type Paper = "p1" | "p2" | "oral";

export type UiLang = "es" | "en";

export type CriteriaItem = {
  readonly key: string;
  readonly label: string;
  readonly nameEs: string;
  readonly nameEn: string;
  readonly max: number;
};

export type IBScaleBand = {
  readonly upTo: number;
  readonly nota: 1 | 2 | 3 | 4 | 5 | 6 | 7;
};

export type CriteriaSet = {
  readonly paper: Paper;
  readonly criteria: readonly CriteriaItem[];
  readonly total: number;
  readonly ibScale: readonly IBScaleBand[];
};

export function notaIBFromScale(scale: readonly IBScaleBand[], total: number): number {
  for (const band of scale) {
    if (total <= band.upTo) return band.nota;
  }
  return 7;
}

export function criterionName(item: CriteriaItem, lang: UiLang): string {
  return lang === "en" ? item.nameEn : item.nameEs;
}
