ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS calendar_id text,
  ADD COLUMN IF NOT EXISTS calendar_sync_status text NOT NULL DEFAULT 'not_attempted'
    CHECK (calendar_sync_status IN (
      'not_attempted',
      'synced',
      'failed',
      'cancelled'
    )),
  ADD COLUMN IF NOT EXISTS calendar_sync_error text,
  ADD COLUMN IF NOT EXISTS calendar_synced_at timestamptz;
