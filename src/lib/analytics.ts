import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type FeatureEvent =
  | "evaluation_started"
  | "evaluation_completed"
  | "feedback_opened"
  | "rewrite_used"
  | "oral_started"
  | "booking_requested";

export type FeatureName =
  | "p1_literature"
  | "p2_literature"
  | "oral_literature"
  | "p1_spanish_b"
  | "oral_spanish_b"
  | "p2_spanish_b"
  | "teacher_chat";

export function trackEvent(
  event_type: FeatureEvent,
  feature: FeatureName,
  metadata?: Record<string, unknown>,
): void {
  supabase
    .from("feature_events")
    .insert({ event_type, feature, metadata: (metadata ?? null) as Json | null })
    .then(() => {});
}
