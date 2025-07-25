-- Criar tabela de usuários (profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de equipamentos
CREATE TABLE IF NOT EXISTS equipments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de acessórios
CREATE TABLE IF NOT EXISTS accessories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID REFERENCES equipments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de empréstimos
CREATE TABLE IF NOT EXISTS rentals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  equipment_id UUID REFERENCES equipments(id),
  rental_date DATE NOT NULL,
  rental_time TIME NOT NULL,
  expected_return_date DATE,
  actual_return_date DATE,
  actual_return_time TIME,
  accessories_taken BOOLEAN DEFAULT FALSE,
  accessories_list TEXT[],
  return_observations TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_rentals_user_id ON rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_rentals_equipment_id ON rentals(equipment_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_accessories_equipment_id ON accessories(equipment_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança CORRIGIDAS
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view equipments" ON equipments;
DROP POLICY IF EXISTS "Anyone can view accessories" ON accessories;
DROP POLICY IF EXISTS "Users can view all rentals" ON rentals;
DROP POLICY IF EXISTS "Users can create rentals" ON rentals;
DROP POLICY IF EXISTS "Users can update their own rentals" ON rentals;

-- Políticas para profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para equipments (permitir todas as operações para usuários autenticados)
CREATE POLICY "Authenticated users can view equipments" ON equipments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert equipments" ON equipments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update equipments" ON equipments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete equipments" ON equipments
  FOR DELETE TO authenticated USING (true);

-- Políticas para accessories
CREATE POLICY "Authenticated users can view accessories" ON accessories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert accessories" ON accessories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update accessories" ON accessories
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete accessories" ON accessories
  FOR DELETE TO authenticated USING (true);

-- Políticas para rentals
CREATE POLICY "Authenticated users can view all rentals" ON rentals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create rentals" ON rentals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rentals" ON rentals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_equipments_updated_at ON equipments;
DROP TRIGGER IF EXISTS update_rentals_updated_at ON rentals;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipments_updated_at BEFORE UPDATE ON equipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rentals_updated_at BEFORE UPDATE ON rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para criar perfil automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', 'Usuário'));
  RETURN new;
END;
$$ language plpgsql security definer;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
