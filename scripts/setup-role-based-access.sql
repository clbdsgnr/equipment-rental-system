-- Definir o usuário admin@admin.com como administrador
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@admin.com';

-- Se o usuário não existir, você precisará criar uma conta primeiro
-- INSERT INTO public.profiles (id, email, name, role) 
-- VALUES ('uuid-do-usuario', 'admin@admin.com', 'Administrador', 'admin');

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own rentals" ON public.rentals;
DROP POLICY IF EXISTS "Users can update own rentals or admin can update any" ON public.rentals;
DROP POLICY IF EXISTS "Users can insert own rentals" ON public.rentals;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.rentals;

DROP POLICY IF EXISTS "Authenticated users can view equipments" ON public.equipments;
DROP POLICY IF EXISTS "Only admins can manage equipments" ON public.equipments;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.equipments;

DROP POLICY IF EXISTS "Authenticated users can view accessories" ON public.accessories;
DROP POLICY IF EXISTS "Only admins can manage accessories" ON public.accessories;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.accessories;

-- Políticas para PROFILES
-- Admins podem ver todos os perfis, usuários só o próprio
CREATE POLICY "Admin can view all profiles, users can view own" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Admins podem atualizar qualquer perfil, usuários só o próprio
CREATE POLICY "Admin can update all profiles, users can update own" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Apenas admins podem inserir novos perfis (cadastrar usuários)
CREATE POLICY "Only admin can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Políticas para EQUIPMENTS
-- Todos podem ver equipamentos
CREATE POLICY "All authenticated users can view equipments" ON public.equipments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas admins podem gerenciar equipamentos
CREATE POLICY "Only admin can manage equipments" ON public.equipments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Políticas para ACCESSORIES
-- Todos podem ver acessórios
CREATE POLICY "All authenticated users can view accessories" ON public.accessories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas admins podem gerenciar acessórios
CREATE POLICY "Only admin can manage accessories" ON public.accessories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Políticas para RENTALS
-- Admins veem todos os empréstimos, usuários só os próprios
CREATE POLICY "Admin can view all rentals, users can view own" ON public.rentals
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Usuários podem criar empréstimos para si mesmos
CREATE POLICY "Users can create own rentals" ON public.rentals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins podem atualizar qualquer empréstimo, usuários só os próprios
CREATE POLICY "Admin can update all rentals, users can update own" ON public.rentals
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Verificar se o admin foi definido corretamente
SELECT id, email, name, role FROM public.profiles WHERE email = 'admin@admin.com';
