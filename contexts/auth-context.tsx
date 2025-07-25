"use client"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface Profile {
  id: string
  email: string
  name: string
  created_at: string
  updated_at: string
  role: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const handleAuthStateChange = async (event: string, session: any) => {
      console.log("Auth state change:", event, session?.user?.id)

      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchAndSetProfile(session.user)
      } else {
        setProfile(null)
      }
      setLoading(false)

      if (event === "SIGNED_IN") {
        toast({
          title: "Login bem-sucedido",
          description: `Bem-vindo!`,
        })
      }
      if (event === "SIGNED_OUT") {
        toast({
          title: "Sessão encerrada",
          description: "Você foi desconectado.",
        })
        router.push("/auth")
      }
    }

    // Verificação inicial da sessão
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log("Initial session:", session?.user?.id)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchAndSetProfile(session.user)
      }
      setLoading(false)
    })

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleAuthStateChange)

    return () => subscription.unsubscribe()
  }, [router])

  const fetchAndSetProfile = async (user: User) => {
    try {
      console.log("Fetching profile for user:", user.id)

      // Usar o cliente admin para evitar problemas de RLS
      const { data: profileData, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle() // Use maybeSingle instead of single to avoid errors when no row exists

      console.log("Profile query result:", { profileData, error })

      if (error) {
        console.error("Erro ao buscar perfil:", error)
        // Se houver erro, tente criar o perfil
        await createProfile(user)
        return
      }

      if (!profileData) {
        // Perfil não existe, criar um novo
        console.log("Profile not found, creating new one")
        await createProfile(user)
      } else {
        console.log("Profile found:", profileData)
        setProfile(profileData as Profile)
      }
    } catch (error) {
      console.error("Erro inesperado ao buscar perfil:", error)
      // Em caso de erro, tente criar o perfil
      await createProfile(user)
    }
  }

  const createProfile = async (user: User) => {
    try {
      console.log("Creating profile for user:", user.id)

      const newProfile = {
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.name || user.email?.split("@")[0] || "Usuário",
        role: "user",
      }

      const { data: insertedProfile, error: insertError } = await supabase
        .from("profiles")
        .insert([newProfile])
        .select()
        .single()

      if (insertError) {
        console.error("Erro ao criar perfil:", insertError)
        // Se falhar ao criar, use dados básicos do usuário
        setProfile({
          id: user.id,
          email: user.email || "",
          name: user.user_metadata?.name || "Usuário",
          role: "user",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      } else if (insertedProfile) {
        console.log("Profile created:", insertedProfile)
        setProfile(insertedProfile as Profile)
      }
    } catch (error) {
      console.error("Erro ao criar perfil:", error)
      // Fallback: usar dados básicos do usuário
      setProfile({
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.name || "Usuário",
        role: "user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        console.error("Erro no login:", error)
        return { error }
      }

      if (data.user) {
        console.log("Login successful for user:", data.user.id)
        // O perfil será buscado automaticamente pelo handleAuthStateChange
      }

      return { error: null }
    } catch (error) {
      console.error("Erro inesperado no login:", error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      })

      if (error) {
        console.error("Erro no registro:", error)
        return { error }
      }

      if (data.user) {
        console.log("Signup successful for user:", data.user.id)
        // O perfil será criado automaticamente pelo handleAuthStateChange
      }

      return { error: null }
    } catch (error) {
      console.error("Erro inesperado no registro:", error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("Erro ao fazer logout:", error.message)
        toast({
          title: "Erro ao sair",
          description: error.message,
          variant: "destructive",
        })
      } else {
        setUser(null)
        setProfile(null)
        router.push("/auth")
      }
    } catch (error) {
      console.error("Erro inesperado ao fazer logout:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
