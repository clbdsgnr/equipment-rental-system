"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Calendar, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface RentalReport {
  id: string
  user_name: string
  user_email: string
  equipment_name: string
  equipment_description: string | null
  rental_date: string
  rental_time: string
  expected_return_date: string | null
  actual_return_date: string | null
  actual_return_time: string | null
  accessories_taken: boolean
  accessories_list: string[] | null
  accessories_names: string[]
  return_observations: string | null
  status: "active" | "returned" | "overdue"
}

export default function RentalReports() {
  const [rentals, setRentals] = useState<RentalReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedRental, setSelectedRental] = useState<RentalReport | null>(null)
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
  const [returnData, setReturnData] = useState({
    return_date: new Date().toISOString().split("T")[0],
    return_time: new Date().toTimeString().slice(0, 5),
    observations: "",
  })
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
  })

  useEffect(() => {
    loadRentals()
  }, [])

  const loadRentals = async () => {
    try {
      const { data, error } = await supabase
        .from("rentals")
        .select(`
          *,
          profiles!rentals_user_id_fkey (name, email),
          equipments!rentals_equipment_id_fkey (name, description)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Buscar nomes dos acessórios
      const accessoryIds = data?.flatMap((rental) => rental.accessories_list || []) || []
      const { data: accessoriesData } = await supabase.from("accessories").select("id, name").in("id", accessoryIds)

      const accessoriesMap = new Map(accessoriesData?.map((acc) => [acc.id, acc.name]) || [])

      const formattedRentals: RentalReport[] =
        data?.map((rental) => ({
          id: rental.id,
          user_name: rental.profiles?.name || "N/A",
          user_email: rental.profiles?.email || "N/A",
          equipment_name: rental.equipments?.name || "N/A",
          equipment_description: rental.equipments?.description,
          rental_date: rental.rental_date,
          rental_time: rental.rental_time,
          expected_return_date: rental.expected_return_date,
          actual_return_date: rental.actual_return_date,
          actual_return_time: rental.actual_return_time,
          accessories_taken: rental.accessories_taken,
          accessories_list: rental.accessories_list,
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

      await loadRentals()
      setIsReturnDialogOpen(false)
      setSelectedRental(null)
      setReturnData({
        return_date: new Date().toISOString().split("T")[0],
        return_time: new Date().toTimeString().slice(0, 5),
        observations: "",
      })
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

  const filteredRentals = rentals.filter((rental) => {
    const matchesStatus = filters.status === "all" || rental.status === filters.status
    const matchesSearch =
      rental.user_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      rental.equipment_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      rental.user_email.toLowerCase().includes(filters.search.toLowerCase())

    return matchesStatus && matchesSearch
  })

  const openReturnDialog = (rental: RentalReport) => {
    setSelectedRental(rental)
    setIsReturnDialogOpen(true)
  }

  if (loading && rentals.length === 0) {
    return <div className="text-center py-8">Carregando relatórios...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Relatórios de Empréstimos
          </h2>
          <p className="text-gray-600">Histórico completo de todos os empréstimos</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="Nome do usuário, equipamento ou email..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="returned">Devolvidos</SelectItem>
                  <SelectItem value="overdue">Atrasados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de relatórios */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Empréstimos</CardTitle>
          <CardDescription>{filteredRentals.length} empréstimo(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Acessórios</TableHead>
                  <TableHead>Data/Hora Retirada</TableHead>
                  <TableHead>Data/Hora Devolução</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRentals.map((rental) => (
                  <TableRow key={rental.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rental.user_name}</div>
                        <div className="text-sm text-gray-500">{rental.user_email}</div>
                      </div>
                    </TableCell>
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
                        <span className="text-gray-500">Não devolvido</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(rental.status)}</TableCell>
                    <TableCell>
                      {rental.status === "active" && (
                        <Button variant="outline" size="sm" onClick={() => openReturnDialog(rental)}>
                          Devolver
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
    </div>
  )
}
