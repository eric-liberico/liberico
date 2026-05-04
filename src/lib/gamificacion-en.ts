// English translations for gamification UI (English A: Literature)

// Level names — English literary figures (matches Spanish Golden Age theme)
export const NOMBRES_EN = [
  "Apprentice",
  "Balladeer",
  "Playwright",
  "Scholar",
  "Rhetorician",
  "Satirist",
  "The Bard",
  "Shakespeare",
];

// Achievement catalog — English translations keyed by logro_id
export const LOGROS_EN: Record<string, { nombre: string; descripcion: string }> = {
  primera_evaluacion:     { nombre: "First assessment",     descripcion: "Complete your first assessment in any component." },
  tres_evaluaciones:      { nombre: "First steps",          descripcion: "Complete 3 assessments in total." },
  primera_p2:             { nombre: "Comparison unlocked",  descripcion: "Complete your first Paper 2 assessment." },
  primer_oral:            { nombre: "Voice takes shape",    descripcion: "Complete your first Individual Oral assessment." },
  tres_pruebas:           { nombre: "Complete explorer",    descripcion: "Assess in Paper 1, Paper 2 and Oral at least once." },
  racha_3:                { nombre: "Three-day streak",     descripcion: "Assess for 3 consecutive days." },
  racha_7:                { nombre: "Week on fire",         descripcion: "Assess for 7 consecutive days." },
  banda_maxima_p1:        { nombre: "Band 5 in Paper 1",    descripcion: "Score 5/5 on any criterion in a Paper 1 assessment." },
  nota_6_p1:              { nombre: "Grade 6 in Paper 1",   descripcion: "Reach IB grade 6 or above in a Paper 1 assessment." },
  nota_7_p1:              { nombre: "Excellence in Paper 1",descripcion: "Reach IB grade 7 in a Paper 1 assessment." },
  mejora_criterio:        { nombre: "In progress",          descripcion: "Improve on the same criterion compared to your previous Paper 1 assessment." },
  mejora_consecutiva:     { nombre: "Upward trend",         descripcion: "Raise your total Paper 1 score in two consecutive assessments." },
  diez_evaluaciones:      { nombre: "Consistent",           descripcion: "Complete 10 assessments in total." },
  veinte_evaluaciones:    { nombre: "Relentless",           descripcion: "Complete 20 assessments in total." },
  oral_alta:              { nombre: "High-level oral",      descripcion: "Score ≥ 32/40 in an Individual Oral assessment." },
  nota_6_p2:              { nombre: "Grade 6 in Paper 2",   descripcion: "Reach IB grade 6 or above in a Paper 2 assessment." },
  nota_7_p2:              { nombre: "Excellence in Paper 2",descripcion: "Reach IB grade 7 in a Paper 2 assessment." },
  mejora_consecutiva_p2:  { nombre: "P2 upward trend",      descripcion: "Raise your total Paper 2 score in two consecutive assessments." },
  nota_6_oral:            { nombre: "Brilliant oral",       descripcion: "Reach IB grade 6 or above in an Individual Oral assessment." },
  nota_7_oral:            { nombre: "Perfect oral",         descripcion: "Reach IB grade 7 in an Individual Oral assessment." },
  mejora_consecutiva_oral:{ nombre: "Voice in progress",    descripcion: "Raise your total Oral score in two consecutive assessments." },
};

// Category labels
export const CATEGORIAS_EN: Record<string, string> = {
  comienzo:   "Getting started",
  constancia: "Consistency",
  calidad:    "Quality",
  cobertura:  "Coverage",
};
