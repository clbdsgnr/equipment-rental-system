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
import { FileText, Download, Search } from "lucide-react"

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
}

export default function RentalReports() {
  const [rentals, setRentals] = useState<RentalReport[]>([])
  const [filteredRentals, setFilteredRentals] = useState<RentalReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
  })

  useEffect(() => {
    loadRentals()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [rentals, filters])

  const loadRentals = async () => {
    try {
      setLoading(true)

      // Buscar empréstimos com informações relacionadas
      const { data: rentalsData, error: rentalsError } = await supabase
        .from("rentals")
        .select(`
          *,
          profiles!inner(name, email),
          equipments!inner(name, description)
        `)
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
          }
        }),
      )

      setRentals(rentalsWithAccessories)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...rentals]

    // Filtro de busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (rental) =>
          rental.user_name.toLowerCase().includes(searchLower) ||
          rental.user_email.toLowerCase().includes(searchLower) ||
          rental.equipment_name.toLowerCase().includes(searchLower),
      )
    }

    // Filtro de status
    if (filters.status !== "all") {
      filtered = filtered.filter((rental) => rental.status === filters.status)
    }

    // Filtro de data
    if (filters.dateFrom) {
      filtered = filtered.filter((rental) => rental.rental_date >= filters.dateFrom)
    }
    if (filters.dateTo) {
      filtered = filtered.filter((rental) => rental.rental_date <= filters.dateTo)
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
      headers.join(","),
      ...filteredRentals.map((rental) =>
        [
          `"${rental.user_name}"`,
          `"${rental.user_email}"`,
          `"${rental.equipment_name}"`,
          `"${rental.equipment_description || ""}"`,
          rental.accessories_taken ? "Sim" : "Não",
          `"${rental.accessories_names.join(", ")}"`,
          rental.rental_date,
          rental.rental_time,
          rental.return_date || "",
          rental.return_time || "",
          rental.expected_return_date || "",
          rental.status,
          `"${rental.observations || ""}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `relatorio-emprestimos-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Ativo</Badge>
      case "returned":
        return <Badge variant="secondary">Devolvido</Badge>
      case "overdue":
        return <Badge variant="destructive">Atrasado</Badge>
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
          <div className="text-center">Carregando relatórios...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatório de Empréstimos
          </CardTitle>
          <CardDescription>Visualize e exporte relatórios completos de empréstimos de equipamentos</CardDescription>
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
                    <SelectValue />
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
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">Data Final</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                />
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

      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600">Erro: {error}</div>
          </CardContent>
        </Card>
      )}

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
                      <div className="text-sm max-w-xs truncate">{rental.observations || "-"}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
