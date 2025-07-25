"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        ensureProfile(session.user)
      }
      setLoading(false)
    })

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user && event === "SIGNED_IN") {
        await ensureProfile(session.user)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const ensureProfile = async (user: User) => {
    try {
      // Verificar se o perfil já existe
      const { data: profile, error } = await supabase.from("profiles").select("id").eq("id", user.id).single()

      if (error && error.code === "PGRST116") {
        // Perfil não existe, criar um novo
        const { error: insertError } = await supabase.from("profiles").insert({
          id: user.id,
          email: user.email || "",
          name: user.user_metadata?.name || "Usuário",
        })

        if (insertError) {
          console.error("Erro ao criar perfil:", insertError)
        }
      }
    } catch (error) {
      console.error("Erro ao verificar/criar perfil:", error)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    })

    if (!error && data.user) {
      // Tentar criar o perfil imediatamente
      try {
        await supabase.from("profiles").insert({
          id: data.user.id,
          email,
          name,
        })
      } catch (profileError) {
        console.error("Erro ao criar perfil durante signup:", profileError)
      }
    }

    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
