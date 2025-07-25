-- Remover todas as tabelas existentes para recriá-las corretamente
DROP TABLE IF EXISTS rentals CASCADE;
DROP TABLE IF EXISTS accessories CASCADE;
DROP TABLE IF EXISTS equipments CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Criar tabela de perfis
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de equipamentos
CREATE TABLE equipments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de acessórios
CREATE TABLE accessories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID REFERENCES equipments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de empréstimos
CREATE TABLE rentals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES equipments(id) ON DELETE CASCADE NOT NULL,
  rental_date DATE NOT NULL,
  rental_time TIME NOT NULL,
  expected_return_date DATE,
  return_date DATE,
  return_time TIME,
  accessories_taken BOOLEAN DEFAULT FALSE,
  accessories_list UUID[],
  observations TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

-- Criar políticas permissivas para usuários autenticados
CREATE POLICY "Enable all for authenticated users" ON profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON equipments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON accessories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON rentals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Criar perfis para usuários existentes que não têm perfil
INSERT INTO profiles (id, email, name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', 'Usuário')
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;
