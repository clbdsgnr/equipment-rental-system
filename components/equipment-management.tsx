"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Equipment {
  id: string
  name: string
  description: string | null
  serial_number: string | null
  status: "available" | "rented" | "maintenance"
  created_at: string
}

interface Accessory {
  id: string
  equipment_id: string
  name: string
  description: string | null
}

interface EquipmentManagementProps {
  onEquipmentUpdated: () => void
}

export default function EquipmentManagement({ onEquipmentUpdated }: EquipmentManagementProps) {
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAccessoryDialogOpen, setIsAccessoryDialogOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    serial_number: "",
    status: "available" as const,
  })
  const [accessoryFormData, setAccessoryFormData] = useState({
    equipment_id: "",
    name: "",
    description: "",
  })

  useEffect(() => {
    loadEquipments()
    loadAccessories()
  }, [])

  const loadEquipments = async () => {
    try {
      const { data, error } = await supabase.from("equipments").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setEquipments(data || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAccessories = async () => {
    try {
      const { data, error } = await supabase.from("accessories").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setAccessories(data || [])
    } catch (error: any) {
      console.error("Erro ao carregar acessórios:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (selectedEquipment) {
        // Atualizar equipamento
        const { error } = await supabase.from("equipments").update(formData).eq("id", selectedEquipment.id)

        if (error) throw error
      } else {
        // Criar novo equipamento
        const { error } = await supabase.from("equipments").insert([formData])

        if (error) throw error
      }

      await loadEquipments()
      onEquipmentUpdated()
      setIsDialogOpen(false)
      resetForm()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAccessorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { error } = await supabase.from("accessories").insert([accessoryFormData])

      if (error) throw error

      await loadAccessories()
      setIsAccessoryDialogOpen(false)
      setAccessoryFormData({ equipment_id: "", name: "", description: "" })
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este equipamento?")) return

    try {
      const { error } = await supabase.from("equipments").delete().eq("id", id)

      if (error) throw error

      await loadEquipments()
      onEquipmentUpdated()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      serial_number: "",
      status: "available",
    })
    setSelectedEquipment(null)
  }

  const openEditDialog = (equipment: Equipment) => {
    setSelectedEquipment(equipment)
    setFormData({
      name: equipment.name,
      description: equipment.description || "",
      serial_number: equipment.serial_number || "",
      status: equipment.status,
    })
    setIsDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      available: "default",
      rented: "destructive",
      maintenance: "secondary",
    } as const

    const labels = {
      available: "Disponível",
      rented: "Emprestado",
      maintenance: "Manutenção",
    }

    return <Badge variant={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>
  }

  const getEquipmentAccessories = (equipmentId: string) => {
    return accessories.filter((acc) => acc.equipment_id === equipmentId)
  }

  if (loading && equipments.length === 0) {
    return <div className="text-center py-8">Carregando equipamentos...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Equipamentos</h2>
          <p className="text-gray-600">Cadastre e gerencie equipamentos e seus acessórios</p>
        </div>
        <div className="space-x-2">
          <Dialog open={isAccessoryDialogOpen} onOpenChange={setIsAccessoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Acessório
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Acessório</DialogTitle>
                <DialogDescription>Adicione um novo acessório para um equipamento</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAccessorySubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="equipment_select">Equipamento</Label>
                  <Select
                    value={accessoryFormData.equipment_id}
                    onValueChange={(value) => setAccessoryFormData((prev) => ({ ...prev, equipment_id: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um equipamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipments.map((equipment) => (
                        <SelectItem key={equipment.id} value={equipment.id}>
                          {equipment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessory_name">Nome do Acessório</Label>
                  <Input
                    id="accessory_name"
                    value={accessoryFormData.name}
                    onChange={(e) => setAccessoryFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessory_description">Descrição</Label>
                  <Textarea
                    id="accessory_description"
                    value={accessoryFormData.description}
                    onChange={(e) => setAccessoryFormData((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar Acessório"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Equipamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedEquipment ? "Editar Equipamento" : "Novo Equipamento"}</DialogTitle>
                <DialogDescription>
                  {selectedEquipment
                    ? "Edite as informações do equipamento"
                    : "Adicione um novo equipamento ao sistema"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serial_number">Número de Série</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData((prev) => ({ ...prev, serial_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "available" | "rented" | "maintenance") =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="rented">Emprestado</SelectItem>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : selectedEquipment ? "Atualizar" : "Criar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Equipamentos</CardTitle>
          <CardDescription>Todos os equipamentos cadastrados no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Número de Série</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acessórios</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipments.map((equipment) => {
                const equipmentAccessories = getEquipmentAccessories(equipment.id)
                return (
                  <TableRow key={equipment.id}>
                    <TableCell className="font-medium">{equipment.name}</TableCell>
                    <TableCell>{equipment.description || "-"}</TableCell>
                    <TableCell>{equipment.serial_number || "-"}</TableCell>
                    <TableCell>{getStatusBadge(equipment.status)}</TableCell>
                    <TableCell>
                      {equipmentAccessories.length > 0 ? (
                        <div className="space-y-1">
                          {equipmentAccessories.map((accessory) => (
                            <Badge key={accessory.id} variant="outline" className="mr-1">
                              {accessory.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">Nenhum</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(equipment)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(equipment.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
