import { createClient } from "@supabase/supabase-js"
import type { Database } from "./supabase"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente Supabase para uso no lado do SERVIDOR (bypass RLS)
// Esta chave NUNCA deve ser exposta no cliente!
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey)
