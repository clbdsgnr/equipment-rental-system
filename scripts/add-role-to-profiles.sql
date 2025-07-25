-- Adicionar a coluna 'role' à tabela profiles se ela não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Criar índice para melhorar performance nas consultas por role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Definir um usuário como administrador (substitua o email pelo seu)
-- UPDATE public.profiles 
-- SET role = 'admin' 
-- WHERE email = 'admin@example.com';

-- Políticas RLS para a tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seu próprio perfil
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Usuários podem inserir apenas seu próprio perfil durante o registro
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas RLS para a tabela rentals (controle de acesso baseado em role)
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seus próprios aluguéis
CREATE POLICY "Users can view own rentals" ON public.rentals
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Usuários podem atualizar apenas seus próprios aluguéis, ou admins podem atualizar qualquer aluguel
CREATE POLICY "Users can update own rentals or admin can update any" ON public.rentals
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Usuários podem inserir aluguéis apenas para si mesmos
CREATE POLICY "Users can insert own rentals" ON public.rentals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para a tabela equipments
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados podem ver equipamentos
CREATE POLICY "Authenticated users can view equipments" ON public.equipments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas admins podem inserir, atualizar ou excluir equipamentos
CREATE POLICY "Only admins can manage equipments" ON public.equipments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Políticas RLS para a tabela accessories
ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados podem ver acessórios
CREATE POLICY "Authenticated users can view accessories" ON public.accessories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas admins podem inserir, atualizar ou excluir acessórios
CREATE POLICY "Only admins can manage accessories" ON public.accessories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Comentário: Para definir um usuário como admin, execute:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'seu_email@example.com';
