-- Script para definir um usuário como administrador
-- Substitua 'seu_email@example.com' pelo email do usuário que deve ser admin

-- Primeiro, verifique se o usuário existe
SELECT id, email, name, role FROM public.profiles WHERE email = 'admin@admin.com';

-- Se o usuário existir, defina como admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@admin.com';

-- Verificar se a atualização funcionou
SELECT id, email, name, role FROM public.profiles WHERE email = 'admin@admin.com';
