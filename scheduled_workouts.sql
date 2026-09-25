-- =============================================
-- SCHEDULED WORKOUTS TABLE
-- Tabla para entrenamientos programados (Planner)
-- =============================================

CREATE TABLE IF NOT EXISTS scheduled_workouts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  routine_id       UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  schedule_type    TEXT NOT NULL DEFAULT 'today'
    CHECK (schedule_type IN ('today', 'recurring')),
  scheduled_date   DATE,
  recurrence_days  INTEGER[],
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_user
  ON scheduled_workouts(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_date
  ON scheduled_workouts(user_id, scheduled_date)
  WHERE schedule_type = 'today';

ALTER TABLE scheduled_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scheduled workouts"
  ON scheduled_workouts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
