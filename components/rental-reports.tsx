"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Search, Clock, CheckCircle, AlertCircle, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"

interface RentalReport {
  id: string
  user_name: string
  user_email: string
  equipment_name: string
  equipment_description: string | null
  rental_date: string
  rental_time: string
  return_date: string | null
  return_time: string | null
  expected_return_date: string | null
  accessories_taken: boolean
  accessories_list: string[]
  accessories_names: string[]
  status: "active" | "returned" | "overdue"
  observations: string | null
  equipment_id: string
}

export default function RentalReports() {
  const { user, profile, loading: authLoading } = useAuth()
  const [rentals, setRentals] = useState<RentalReport[]>([])
  const [filteredRentals, setFilteredRentals] = useState<RentalReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
  })
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
  const [selectedRentalForReturn, setSelectedRentalForReturn] = useState<RentalReport | null>(null)
  const [returnNotes, setReturnNotes] = useState("")
  const [submittingReturn, setSubmittingReturn] = useState(false)

  useEffect(() => {
    if (!authLoading && profile?.role !== "admin") {
      setError("Apenas administradores podem visualizar relatórios gerais.")
      setLoading(false)
    }
  }, [authLoading, profile])

  useEffect(() => {
    if (!authLoading && user && profile?.role === "admin") {
      loadRentals()
    }
  }, [authLoading, user, profile])

  useEffect(() => {
    applyFilters()
  }, [rentals, filters])

  const loadRentals = async () => {
    try {
      setLoading(true)
      setError("")

      const { data: rentalsData, error: rentalsError } = await supabase
        .from("rentals")
        .select(`
          id,
          user_id,
          equipment_id,
          rental_date,
          rental_time,
          expected_return_date,
          return_date,
          return_time,
          accessories_taken,
          accessories_list,
          observations,
          status,
          created_at,
          profiles!inner(name, email),
          equipments!inner(name, description)
        `)
        .order("created_at", { ascending: false })

      if (rentalsError) throw rentalsError

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
            user_name: rental.profiles.name,
            user_email: rental.profiles.email,
            equipment_name: rental.equipments.name,
            equipment_description: rental.equipments.description,
            rental_date: rental.rental_date,
            rental_time: rental.rental_time,
            return_date: rental.return_date,
            return_time: rental.return_time,
            expected_return_date: rental.expected_return_date,
            accessories_taken: rental.accessories_taken,
            accessories_list: rental.accessories_list || [],
            accessories_names: accessoriesNames,
            status: rental.status,
            observations: rental.observations,
            equipment_id: rental.equipment_id,
          }
        }),
      )

      setRentals(rentalsWithAccessories)
    } catch (error: any) {
      setError(error.message)
      toast({
        title: "Erro",
        description: "Erro ao carregar relatórios de empréstimos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...rentals]

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (rental) =>
          rental.user_name.toLowerCase().includes(searchLower) ||
          rental.user_email.toLowerCase().includes(searchLower) ||
          rental.equipment_name.toLowerCase().includes(searchLower),
      )
    }

    if (filters.status !== "all") {
      filtered = filtered.filter((rental) => rental.status === filters.status)
    }

    if (filters.dateFrom) {
      const filterDate = format(filters.dateFrom, "yyyy-MM-dd")
      filtered = filtered.filter((rental) => rental.rental_date >= filterDate)
    }
    if (filters.dateTo) {
      const filterDate = format(filters.dateTo, "yyyy-MM-dd")
      filtered = filtered.filter((rental) => rental.rental_date <= filterDate)
    }

    setFilteredRentals(filtered)
  }

  const exportToCSV = () => {
    const headers = [
      "Nome do Usuário",
      "Email",
      "Equipamento",
      "Descrição do Equipamento",
      "Acessórios Retirados",
      "Lista de Acessórios",
      "Data de Retirada",
      "Hora de Retirada",
      "Data de Devolução",
      "Hora de Devolução",
      "Data Prevista de Devolução",
      "Status",
      "Observações",
    ]

    const csvContent = [
      headers.join(";"),
      ...filteredRentals.map((rental) =>
        [
          `"${rental.user_name.replace(/"/g, '""')}"`,
          `"${rental.user_email.replace(/"/g, '""')}"`,
          `"${rental.equipment_name.replace(/"/g, '""')}"`,
          `"${(rental.equipment_description || "").replace(/"/g, '""')}"`,
          rental.accessories_taken ? "Sim" : "Não",
          `"${rental.accessories_names.join(", ").replace(/"/g, '""')}"`,
          rental.rental_date,
          rental.rental_time,
          rental.return_date || "",
          rental.return_time || "",
          rental.expected_return_date || "",
          getStatusText(rental.status),
          `"${(rental.observations || "").replace(/"/g, '""')}"`,
        ].join(";"),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `relatorio-emprestimos-${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({
      title: "Sucesso",
      description: "Relatório exportado para CSV.",
    })
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

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo"
      case "returned":
        return "Devolvido"
      case "overdue":
        return "Atrasado"
      default:
        return status
    }
  }

  const formatDateDisplay = (date: string | null) => {
    if (!date) return "-"
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR })
  }

  const formatTimeDisplay = (time: string | null) => {
    if (!time) return "-"
    return time.substring(0, 5)
  }

  const handleOpenReturnDialog = (rental: RentalReport) => {
    setSelectedRentalForReturn(rental)
    setReturnNotes(rental.observations || "")
    setIsReturnDialogOpen(true)
  }

  const handleConfirmReturn = async () => {
    if (!selectedRentalForReturn) return

    setSubmittingReturn(true)
    setError("")

    try {
      const { error: rentalUpdateError } = await supabase
        .from("rentals")
        .update({
          return_date: format(new Date(), "yyyy-MM-dd"),
          return_time: format(new Date(), "HH:mm:ss"),
          observations: returnNotes,
          status: "returned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedRentalForReturn.id)

      if (rentalUpdateError) throw rentalUpdateError

      const { error: equipmentUpdateError } = await supabase
        .from("equipments")
        .update({ status: "available" })
        .eq("id", selectedRentalForReturn.equipment_id)

      if (equipmentUpdateError) throw equipmentUpdateError

      toast({
        title: "Sucesso",
        description: "Devolução registrada com sucesso!",
      })
      setIsReturnDialogOpen(false)
      setSelectedRentalForReturn(null)
      setReturnNotes("")
      loadRentals()
    } catch (error: any) {
      setError(error.message || "Não foi possível registrar a devolução.")
      toast({
        title: "Erro",
        description: "Erro ao registrar devolução.",
        variant: "destructive",
      })
    } finally {
      setSubmittingReturn(false)
    }
  }

  if (authLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">Carregando informações do usuário...</div>
        </CardContent>
      </Card>
    )
  }

  if (error && !loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {profile?.role !== "admin" && (
        <Card>
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertDescription>Apenas administradores podem visualizar relatórios gerais.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
      {profile?.role === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatório Geral de Empréstimos
            </CardTitle>
            <CardDescription>
              Visualize e exporte relatórios completos de todos os empréstimos de equipamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Nome, email ou equipamento..."
                      value={filters.search}
                      onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="returned">Devolvido</SelectItem>
                      <SelectItem value="overdue">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFrom">Data Inicial</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={
                          "w-full justify-start text-left font-normal" + (!filters.dateFrom && " text-muted-foreground")
                        }
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateFrom
                          ? format(filters.dateFrom, "dd/MM/yyyy", { locale: ptBR })
                          : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) => setFilters((prev) => ({ ...prev, dateFrom: date || undefined }))}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateTo">Data Final</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={
                          "w-full justify-start text-left font-normal" + (!filters.dateTo && " text-muted-foreground")
                        }
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateTo ? format(filters.dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) => setFilters((prev) => ({ ...prev, dateTo: date || undefined }))}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">{filteredRentals.length} empréstimo(s) encontrado(s)</p>
                <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">Carregando relatórios...</div>
          </CardContent>
        </Card>
      ) : (
        profile?.role === "admin" && (
          <Card>
            <CardContent className="p-0">
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
                      <TableHead>Observações</TableHead>
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
                          <div>
                            <div className="text-sm">{rental.accessories_taken ? "Sim" : "Não"}</div>
                            {rental.accessories_names.length > 0 && (
                              <div className="text-xs text-gray-500">{rental.accessories_names.join(", ")}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatDateDisplay(rental.rental_date)}</div>
                            <div className="text-gray-500">{formatTimeDisplay(rental.rental_time)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatDateDisplay(rental.return_date)}</div>
                            <div className="text-gray-500">{formatTimeDisplay(rental.return_time)}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(rental.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm max-w-xs truncate">{rental.observations || "-"}</div>
                        </TableCell>
                        <TableCell>
                          {rental.status === "active" && (
                            <Button size="sm" onClick={() => handleOpenReturnDialog(rental)}>
                              Devolver
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredRentals.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhum empréstimo encontrado com os filtros aplicados.
                </div>
              )}
            </CardContent>
          </Card>
        )
      )}

      {/* Dialog de Devolução */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Devolução</DialogTitle>
            <DialogDescription>
              Confirme a devolução do equipamento: {selectedRentalForReturn?.equipment_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="return-notes">Observações da Devolução (Opcional)</Label>
              <Textarea
                id="return-notes"
                placeholder="Adicione observações sobre a condição do equipamento na devolução..."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmReturn} disabled={submittingReturn}>
              {submittingReturn ? "Registrando..." : "Confirmar Devolução"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
