-- Migración: Añadir campo routine_name_snapshot a la tabla workouts
-- Este campo permite que el historial recuerde el nombre de la rutina 
-- incluso si el molde original es eliminado de la biblioteca.

ALTER TABLE workouts
ADD COLUMN routine_name_snapshot TEXT;
