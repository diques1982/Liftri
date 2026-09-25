-- Habilitar permisos de escritura, actualización y eliminación para los administradores en la tabla exercises
DROP POLICY IF EXISTS "Admins can manage exercises" ON exercises;
DROP POLICY IF EXISTS "Admins can update exercises" ON exercises;
DROP POLICY IF EXISTS "Admins can delete exercises" ON exercises;
DROP POLICY IF EXISTS "Admins can insert exercises" ON exercises;

CREATE POLICY "Admins can manage exercises" ON exercises 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
