"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { User, Package, Clock, CheckCircle, AlertCircle } from "lucide-react"

interface UserRental {
  id: string
  equipment_name: string
  equipment_description: string | null
  rental_date: string
  rental_time: string
  return_date: string | null
  return_time: string | null
  expected_return_date: string | null
  accessories_taken: boolean
  accessories_names: string[]
  status: "active" | "returned" | "overdue"
  observations: string | null
}

interface UserStats {
  total_rentals: number
  active_rentals: number
  returned_rentals: number
  overdue_rentals: number
}

export default function UserProfile() {
  const { user } = useAuth()
  const [userRentals, setUserRentals] = useState<UserRental[]>([])
  const [userStats, setUserStats] = useState<UserStats>({
    total_rentals: 0,
    active_rentals: 0,
    returned_rentals: 0,
    overdue_rentals: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [selectedRental, setSelectedRental] = useState<UserRental | null>(null)
  const [returnData, setReturnData] = useState({
    return_date: new Date().toISOString().split("T")[0],
    return_time: new Date().toTimeString().slice(0, 5),
    observations: "",
  })

  useEffect(() => {
    if (user) {
      loadUserRentals()
    }
  }, [user])

  const loadUserRentals = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Buscar empréstimos do usuário
      const { data: rentalsData, error: rentalsError } = await supabase
        .from("rentals")
        .select(`
          *,
          equipments!inner(name, description)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (rentalsError) throw rentalsError

      // Buscar acessórios para cada empréstimo
      const rentalsWithAccessories = await Promise.all(
        (rentalsData || []).map(async (rental) => {
          let accessoriesNames: string[] = []

          if (rental.accessories_list && rental.accessories_list.length > 0) {
            const { data: accessoriesData } = await supabase
              .from("accessories")
              .select("name")
              .in("id", rental.accessories_list)

            accessoriesNames = accessoriesData?.map((acc) => acc.name) || []
          }

          return {
            id: rental.id,
            equipment_name: rental.equipments.name,
            equipment_description: rental.equipments.description,
            rental_date: rental.rental_date,
            rental_time: rental.rental_time,
            return_date: rental.return_date,
            return_time: rental.return_time,
            expected_return_date: rental.expected_return_date,
            accessories_taken: rental.accessories_taken,
            accessories_names: accessoriesNames,
            status: rental.status,
            observations: rental.observations,
          }
        }),
      )

      setUserRentals(rentalsWithAccessories)

      // Calcular estatísticas
      const stats = {
        total_rentals: rentalsWithAccessories.length,
        active_rentals: rentalsWithAccessories.filter((r) => r.status === "active").length,
        returned_rentals: rentalsWithAccessories.filter((r) => r.status === "returned").length,
        overdue_rentals: rentalsWithAccessories.filter((r) => r.status === "overdue").length,
      }
      setUserStats(stats)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReturn = async () => {
    if (!selectedRental) return

    try {
      setLoading(true)
      setError("")
      setSuccess("")

      // Atualizar o empréstimo
      const { error: rentalError } = await supabase
        .from("rentals")
        .update({
          return_date: returnData.return_date,
          return_time: returnData.return_time,
          observations: returnData.observations,
          status: "returned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedRental.id)

      if (rentalError) throw rentalError

      // Atualizar status do equipamento para disponível
      const { data: rentalData } = await supabase
        .from("rentals")
        .select("equipment_id")
        .eq("id", selectedRental.id)
        .single()

      if (rentalData) {
        const { error: equipmentError } = await supabase
          .from("equipments")
          .update({ status: "available" })
          .eq("id", rentalData.equipment_id)

        if (equipmentError) throw equipmentError
      }

      setSuccess("Devolução registrada com sucesso!")
      setSelectedRental(null)
      setReturnData({
        return_date: new Date().toISOString().split("T")[0],
        return_time: new Date().toTimeString().slice(0, 5),
        observations: "",
      })

      await loadUserRentals()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Ativo
          </Badge>
        )
      case "returned":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Devolvido
          </Badge>
        )
      case "overdue":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Atrasado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("pt-BR")
  }

  const formatTime = (time: string | null) => {
    if (!time) return "-"
    return time
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">Carregando perfil...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas do usuário */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{userStats.total_rentals}</p>
                <p className="text-sm text-gray-600">Total de Empréstimos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{userStats.active_rentals}</p>
                <p className="text-sm text-gray-600">Empréstimos Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{userStats.returned_rentals}</p>
                <p className="text-sm text-gray-600">Devolvidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{userStats.overdue_rentals}</p>
                <p className="text-sm text-gray-600">Atrasados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de empréstimos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Meu Histórico de Empréstimos
          </CardTitle>
          <CardDescription>Visualize todos os seus empréstimos e gerencie devoluções</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4">
              <AlertDescription className="text-green-600">{success}</AlertDescription>
            </Alert>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Acessórios</TableHead>
                  <TableHead>Data/Hora Retirada</TableHead>
                  <TableHead>Data/Hora Devolução</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRentals.map((rental) => (
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
                      <div>
                        <div className="text-sm">{rental.accessories_taken ? "Sim" : "Não"}</div>
                        {rental.accessories_names.length > 0 && (
                          <div className="text-xs text-gray-500">{rental.accessories_names.join(", ")}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(rental.rental_date)}</div>
                        <div className="text-gray-500">{formatTime(rental.rental_time)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(rental.return_date)}</div>
                        <div className="text-gray-500">{formatTime(rental.return_time)}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(rental.status)}</TableCell>
                    <TableCell>
                      {rental.status === "active" && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setSelectedRental(rental)}>
                              Devolver
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Registrar Devolução</DialogTitle>
                              <DialogDescription>
                                Registre a devolução do equipamento {rental.equipment_name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="return_date">Data de Devolução</Label>
                                  <Input
                                    id="return_date"
                                    type="date"
                                    value={returnData.return_date}
                                    onChange={(e) =>
                                      setReturnData((prev) => ({ ...prev, return_date: e.target.value }))
                                    }
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="return_time">Hora de Devolução</Label>
                                  <Input
                                    id="return_time"
                                    type="time"
                                    value={returnData.return_time}
                                    onChange={(e) =>
                                      setReturnData((prev) => ({ ...prev, return_time: e.target.value }))
                                    }
                                    required
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="observations">Observações (Opcional)</Label>
                                <Textarea
                                  id="observations"
                                  placeholder="Adicione observações sobre a devolução..."
                                  value={returnData.observations}
                                  onChange={(e) => setReturnData((prev) => ({ ...prev, observations: e.target.value }))}
                                />
                              </div>
                              <Button onClick={handleReturn} disabled={loading} className="w-full">
                                {loading ? "Registrando..." : "Registrar Devolução"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {userRentals.length === 0 && (
            <div className="text-center py-8 text-gray-500">Você ainda não possui empréstimos registrados.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
