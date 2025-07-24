"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { User, Calendar, Clock, Package, Edit } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface UserProfile {
  id: string
  name: string
  email: string
  created_at: string
}

interface UserRental {
  id: string
  equipment_name: string
  equipment_description: string | null
  rental_date: string
  rental_time: string
  actual_return_date: string | null
  actual_return_time: string | null
  accessories_taken: boolean
  accessories_names: string[]
  return_observations: string | null
  status: "active" | "returned" | "overdue"
}

export default function UserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [rentals, setRentals] = useState<UserRental[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
  const [selectedRental, setSelectedRental] = useState<UserRental | null>(null)
  const [editData, setEditData] = useState({
    name: "",
    email: "",
  })
  const [returnData, setReturnData] = useState({
    return_date: new Date().toISOString().split("T")[0],
    return_time: new Date().toTimeString().slice(0, 5),
    observations: "",
  })

  useEffect(() => {
    if (user) {
      loadProfile()
      loadUserRentals()
    }
  }, [user])

  const loadProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (error) throw error

      setProfile(data)
      setEditData({
        name: data.name,
        email: data.email,
      })
    } catch (error: any) {
      setError(error.message)
    }
  }

  const loadUserRentals = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("rentals")
        .select(`
          *,
          equipments!rentals_equipment_id_fkey (name, description)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Buscar nomes dos acessórios
      const accessoryIds = data?.flatMap((rental) => rental.accessories_list || []) || []
      const { data: accessoriesData } = await supabase.from("accessories").select("id, name").in("id", accessoryIds)

      const accessoriesMap = new Map(accessoriesData?.map((acc) => [acc.id, acc.name]) || [])

      const formattedRentals: UserRental[] =
        data?.map((rental) => ({
          id: rental.id,
          equipment_name: rental.equipments?.name || "N/A",
          equipment_description: rental.equipments?.description,
          rental_date: rental.rental_date,
          rental_time: rental.rental_time,
          actual_return_date: rental.actual_return_date,
          actual_return_time: rental.actual_return_time,
          accessories_taken: rental.accessories_taken,
          accessories_names: rental.accessories_list?.map((id: string) => accessoriesMap.get(id) || id) || [],
          return_observations: rental.return_observations,
          status: rental.status,
        })) || []

      setRentals(formattedRentals)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: editData.name,
          email: editData.email,
        })
        .eq("id", user.id)

      if (error) throw error

      setSuccess("Perfil atualizado com sucesso!")
      await loadProfile()
      setIsEditDialogOpen(false)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReturn = async () => {
    if (!selectedRental) return

    setLoading(true)
    setError("")

    try {
      // Atualizar o empréstimo
      const { error: rentalError } = await supabase
        .from("rentals")
        .update({
          actual_return_date: returnData.return_date,
          actual_return_time: returnData.return_time,
          return_observations: returnData.observations,
          status: "returned",
        })
        .eq("id", selectedRental.id)

      if (rentalError) throw rentalError

      // Atualizar status do equipamento para 'available'
      const { error: equipmentError } = await supabase
        .from("equipments")
        .update({ status: "available" })
        .eq("name", selectedRental.equipment_name)

      if (equipmentError) throw equipmentError

      await loadUserRentals()
      setIsReturnDialogOpen(false)
      setSelectedRental(null)
      setReturnData({
        return_date: new Date().toISOString().split("T")[0],
        return_time: new Date().toTimeString().slice(0, 5),
        observations: "",
      })
      setSuccess("Devolução registrada com sucesso!")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      returned: "secondary",
      overdue: "destructive",
    } as const

    const labels = {
      active: "Ativo",
      returned: "Devolvido",
      overdue: "Atrasado",
    }

    return <Badge variant={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>
  }

  const openReturnDialog = (rental: UserRental) => {
    setSelectedRental(rental)
    setIsReturnDialogOpen(true)
  }

  const activeRentals = rentals.filter((rental) => rental.status === "active")
  const completedRentals = rentals.filter((rental) => rental.status === "returned")

  if (loading && !profile) {
    return <div className="text-center py-8">Carregando perfil...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6" />
            Meu Perfil
          </h2>
          <p className="text-gray-600">Gerencie suas informações e histórico de empréstimos</p>
        </div>
      </div>

      {/* Informações do perfil */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Suas informações de cadastro</CardDescription>
            </div>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Perfil</DialogTitle>
                  <DialogDescription>Atualize suas informações pessoais</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={editData.name}
                      onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData((prev) => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {profile && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Nome</Label>
                <p className="text-lg">{profile.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Email</Label>
                <p className="text-lg">{profile.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Membro desde</Label>
                <p className="text-lg">{new Date(profile.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Total de empréstimos</Label>
                <p className="text-lg">{rentals.length}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empréstimos ativos */}
      {activeRentals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Empréstimos Ativos ({activeRentals.length})
            </CardTitle>
            <CardDescription>Equipamentos que você possui atualmente</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Acessórios</TableHead>
                  <TableHead>Data/Hora Retirada</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRentals.map((rental) => (
                  <TableRow key={rental.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rental.equipment_name}</div>
                        {rental.equipment_description && (
                          <div className="text-sm text-gray-500">{rental.equipment_description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {rental.accessories_taken ? (
                        <div className="space-y-1">
                          {rental.accessories_names.map((name, index) => (
                            <Badge key={index} variant="outline" className="mr-1">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">Não</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4" />
                        {new Date(rental.rental_date).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        {rental.rental_time}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(rental.status)}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => openReturnDialog(rental)}>
                        Devolver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Histórico de empréstimos */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Empréstimos</CardTitle>
          <CardDescription>Todos os seus empréstimos anteriores ({completedRentals.length})</CardDescription>
        </CardHeader>
        <CardContent>
          {completedRentals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Acessórios</TableHead>
                  <TableHead>Data/Hora Retirada</TableHead>
                  <TableHead>Data/Hora Devolução</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedRentals.map((rental) => (
                  <TableRow key={rental.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rental.equipment_name}</div>
                        {rental.equipment_description && (
                          <div className="text-sm text-gray-500">{rental.equipment_description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {rental.accessories_taken ? (
                        <div className="space-y-1">
                          {rental.accessories_names.map((name, index) => (
                            <Badge key={index} variant="outline" className="mr-1">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">Não</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4" />
                        {new Date(rental.rental_date).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        {rental.rental_time}
                      </div>
                    </TableCell>
                    <TableCell>
                      {rental.actual_return_date ? (
                        <div>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-4 w-4" />
                            {new Date(rental.actual_return_date).toLocaleDateString("pt-BR")}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            {rental.actual_return_time}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {rental.return_observations ? (
                        <div className="text-sm max-w-xs truncate" title={rental.return_observations}>
                          {rental.return_observations}
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">Nenhum empréstimo concluído ainda</div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de devolução */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Devolução</DialogTitle>
            <DialogDescription>Registre a devolução do equipamento {selectedRental?.equipment_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="return_date">Data de Devolução</Label>
                <Input
                  id="return_date"
                  type="date"
                  value={returnData.return_date}
                  onChange={(e) => setReturnData((prev) => ({ ...prev, return_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="return_time">Hora de Devolução</Label>
                <Input
                  id="return_time"
                  type="time"
                  value={returnData.return_time}
                  onChange={(e) => setReturnData((prev) => ({ ...prev, return_time: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                placeholder="Observações sobre a devolução (opcional)"
                value={returnData.observations}
                onChange={(e) => setReturnData((prev) => ({ ...prev, observations: e.target.value }))}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleReturn} disabled={loading}>
                {loading ? "Registrando..." : "Registrar Devolução"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mensagens de sucesso */}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
