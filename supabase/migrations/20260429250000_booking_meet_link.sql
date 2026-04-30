ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS meet_link text,
  ADD COLUMN IF NOT EXISTS calendar_event_id text;
