export type SessionFocus = "p1" | "p2" | "oral";
export type ViewerRole = "teacher" | "student";

export type ClaseBooking = {
  id: string;
  status: string;
  student_id: string;
  teacher_id: string;
  student_goal: string | null;
  theory_focus_id: string | null;
  session_focus: SessionFocus | null;
  meet_link: string | null;
  slot_starts_at: string | null;
  slot_ends_at: string | null;
};
