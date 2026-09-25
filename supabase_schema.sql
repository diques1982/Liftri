-- 1. Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Exercises (Public Dictionary)
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  muscle_group TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Routines
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Routine Days
CREATE TABLE routine_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES routines(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER
);

-- 5. Routine Exercises
CREATE TABLE routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_day_id UUID REFERENCES routine_days(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE RESTRICT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3,
  reps INTEGER NOT NULL DEFAULT 10
);

-- 6. Workouts
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  duration INTEGER -- e.g., in minutes
);

-- 7. Sets
CREATE TABLE sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE RESTRICT NOT NULL,
  reps INTEGER NOT NULL,
  weight NUMERIC NOT NULL
);

-- 8. Personal Records
CREATE TABLE personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE RESTRICT NOT NULL,
  max_weight NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, exercise_id) -- Ensures we only keep one record per exercise per user
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read, update, and insert their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Exercises: Public dictionary, anyone can read
CREATE POLICY "Exercises are viewable by everyone" ON exercises FOR SELECT USING (true);

-- Routines: Tied to user_id
CREATE POLICY "Users can manage own routines" ON routines FOR ALL USING (auth.uid() = user_id);

-- Routine Days: Access via parent routine's user_id
CREATE POLICY "Users can manage own routine days" ON routine_days FOR ALL USING (
  EXISTS (SELECT 1 FROM routines WHERE routines.id = routine_days.routine_id AND routines.user_id = auth.uid())
);

-- Routine Exercises: Access via parent routine_day -> routine -> user_id
CREATE POLICY "Users can manage own routine exercises" ON routine_exercises FOR ALL USING (
  EXISTS (
    SELECT 1 FROM routine_days 
    JOIN routines ON routine_days.routine_id = routines.id 
    WHERE routine_days.id = routine_exercises.routine_day_id AND routines.user_id = auth.uid()
  )
);

-- Workouts: Tied to user_id
CREATE POLICY "Users can manage own workouts" ON workouts FOR ALL USING (auth.uid() = user_id);

-- Sets: Access via parent workout's user_id
CREATE POLICY "Users can manage own sets" ON sets FOR ALL USING (
  EXISTS (SELECT 1 FROM workouts WHERE workouts.id = sets.workout_id AND workouts.user_id = auth.uid())
);

-- Personal Records: Tied to user_id
CREATE POLICY "Users can manage own personal records" ON personal_records FOR ALL USING (auth.uid() = user_id);
