-- Desabilitar RLS temporariamente para configurar
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE accessories DISABLE ROW LEVEL SECURITY;
ALTER TABLE rentals DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view equipments" ON equipments;
DROP POLICY IF EXISTS "Authenticated users can insert equipments" ON equipments;
DROP POLICY IF EXISTS "Authenticated users can update equipments" ON equipments;
DROP POLICY IF EXISTS "Authenticated users can delete equipments" ON equipments;
DROP POLICY IF EXISTS "Authenticated users can view accessories" ON accessories;
DROP POLICY IF EXISTS "Authenticated users can insert accessories" ON accessories;
DROP POLICY IF EXISTS "Authenticated users can update accessories" ON accessories;
DROP POLICY IF EXISTS "Authenticated users can delete accessories" ON accessories;
DROP POLICY IF EXISTS "Authenticated users can view all rentals" ON rentals;
DROP POLICY IF EXISTS "Users can create rentals" ON rentals;
DROP POLICY IF EXISTS "Users can update their own rentals" ON rentals;

-- Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

-- Criar políticas mais permissivas
-- Profiles
CREATE POLICY "Enable all for authenticated users" ON profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Equipments
CREATE POLICY "Enable all for authenticated users" ON equipments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Accessories
CREATE POLICY "Enable all for authenticated users" ON accessories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Rentals
CREATE POLICY "Enable all for authenticated users" ON rentals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
