"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, Users, LogOut, Shield, UserIcon } from "lucide-react"
import EquipmentManagement from "@/components/equipment-management"
import RentalForm from "@/components/rental-form"
import RentalReports from "@/components/rental-reports"
import UserProfile from "@/components/user-profile"
import UserManagement from "@/components/user-management"

export default function Dashboard() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalEquipments: 0,
    activeRentals: 0,
    availableEquipments: 0,
    totalUsers: 0,
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && profile) {
      loadStats()
    }
  }, [user, profile])

  const loadStats = async () => {
    try {
      const promises = [
        supabase.from("equipments").select("status"),
        supabase.from("rentals").select("status").eq("status", "active"),
      ]

      // Apenas admin pode ver estatísticas de usuários
      if (profile?.role === "admin") {
        promises.push(supabase.from("profiles").select("id"))
      }

      const results = await Promise.all(promises)

      const totalEquipments = results[0].data?.length || 0
      const activeRentals = results[1].data?.length || 0
      const availableEquipments = results[0].data?.filter((eq) => eq.status === "available").length || 0
      const totalUsers = profile?.role === "admin" ? results[2]?.data?.length || 0 : 0

      setStats({
        totalEquipments,
        activeRentals,
        availableEquipments,
        totalUsers,
      })
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/auth")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const isAdmin = profile.role === "admin"

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Sistema de Empréstimo</h1>
              <div className="flex items-center gap-1">
                {isAdmin ? <Shield className="h-4 w-4 text-red-600" /> : <UserIcon className="h-4 w-4 text-blue-600" />}
                <span className="text-sm font-medium text-gray-600">{isAdmin ? "Administrador" : "Usuário"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Olá, {profile.name}</span>
              <Button onClick={handleSignOut} variant="outline">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de estatísticas */}
        <div className={`grid grid-cols-1 ${isAdmin ? "md:grid-cols-4" : "md:grid-cols-3"} gap-6 mb-8`}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Equipamentos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEquipments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isAdmin ? "Empréstimos Ativos" : "Meus Empréstimos Ativos"}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeRentals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Equipamentos Disponíveis</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.availableEquipments}</div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs baseadas na role */}
        <Tabs defaultValue={isAdmin ? "reports" : "rental"} className="space-y-4">
          <TabsList>
            {!isAdmin && <TabsTrigger value="rental">Novo Empréstimo</TabsTrigger>}
            {isAdmin && <TabsTrigger value="reports">Relatórios</TabsTrigger>}
            {isAdmin && <TabsTrigger value="equipments">Equipamentos</TabsTrigger>}
            {isAdmin && <TabsTrigger value="users">Usuários</TabsTrigger>}
            <TabsTrigger value="profile">{isAdmin ? "Meu Perfil" : "Meus Empréstimos"}</TabsTrigger>
          </TabsList>

          {!isAdmin && (
            <TabsContent value="rental">
              <RentalForm onRentalCreated={loadStats} />
            </TabsContent>
          )}

          {isAdmin && (
            <>
              <TabsContent value="reports">
                <RentalReports />
              </TabsContent>

              <TabsContent value="equipments">
                <EquipmentManagement onEquipmentUpdated={loadStats} />
              </TabsContent>

              <TabsContent value="users">
                <UserManagement />
              </TabsContent>
            </>
          )}

          <TabsContent value="profile">
            <UserProfile />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
