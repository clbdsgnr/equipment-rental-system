"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
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
import { Plus, Edit, Trash2, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Equipment {
  id: string
  name: string
  description: string | null
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
  const { profile } = useAuth()
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "available" as const,
  })
  const [equipmentAccessories, setEquipmentAccessories] = useState<Array<{ name: string; description: string }>>([])
  const [newAccessory, setNewAccessory] = useState({ name: "", description: "" })

  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsAdmin(profile?.role === "admin")
  }, [profile])

  useEffect(() => {
    if (isAdmin) {
      loadEquipments()
      loadAccessories()
    }
  }, [isAdmin])

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
      let equipmentId: string

      if (selectedEquipment) {
        // Atualizar equipamento
        const { error } = await supabase.from("equipments").update(formData).eq("id", selectedEquipment.id)

        if (error) throw error
        equipmentId = selectedEquipment.id

        // Remover acessórios existentes
        await supabase.from("accessories").delete().eq("equipment_id", equipmentId)
      } else {
        // Criar novo equipamento
        const { data, error } = await supabase.from("equipments").insert([formData]).select().single()

        if (error) throw error
        equipmentId = data.id
      }

      // Adicionar acessórios
      if (equipmentAccessories.length > 0) {
        const accessoriesToInsert = equipmentAccessories.map((acc) => ({
          equipment_id: equipmentId,
          name: acc.name,
          description: acc.description,
        }))

        const { error: accessoryError } = await supabase.from("accessories").insert(accessoriesToInsert)

        if (accessoryError) throw accessoryError
      }

      await loadEquipments()
      await loadAccessories()
      onEquipmentUpdated()
      setIsDialogOpen(false)
      resetForm()
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
      await loadAccessories()
      onEquipmentUpdated()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      status: "available",
    })
    setEquipmentAccessories([])
    setNewAccessory({ name: "", description: "" })
    setSelectedEquipment(null)
  }

  const openEditDialog = (equipment: Equipment) => {
    setSelectedEquipment(equipment)
    setFormData({
      name: equipment.name,
      description: equipment.description || "",
      status: equipment.status,
    })

    // Carregar acessórios do equipamento
    const equipmentAccs = accessories.filter((acc) => acc.equipment_id === equipment.id)
    setEquipmentAccessories(equipmentAccs.map((acc) => ({ name: acc.name, description: acc.description || "" })))

    setIsDialogOpen(true)
  }

  const addAccessory = () => {
    if (newAccessory.name.trim()) {
      setEquipmentAccessories([...equipmentAccessories, { ...newAccessory }])
      setNewAccessory({ name: "", description: "" })
    }
  }

  const removeAccessory = (index: number) => {
    setEquipmentAccessories(equipmentAccessories.filter((_, i) => i !== index))
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

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>Apenas administradores podem gerenciar equipamentos.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Equipamentos</h2>
          <p className="text-gray-600">Cadastre e gerencie equipamentos e seus acessórios</p>
        </div>
        <div className="space-x-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Equipamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedEquipment ? "Editar Equipamento" : "Novo Equipamento"}</DialogTitle>
                <DialogDescription>
                  {selectedEquipment
                    ? "Edite as informações do equipamento e seus acessórios"
                    : "Adicione um novo equipamento ao sistema e seus acessórios"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
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
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Acessórios</Label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nome do acessório"
                        value={newAccessory.name}
                        onChange={(e) => setNewAccessory((prev) => ({ ...prev, name: e.target.value }))}
                      />
                      <Input
                        placeholder="Descrição (opcional)"
                        value={newAccessory.description}
                        onChange={(e) => setNewAccessory((prev) => ({ ...prev, description: e.target.value }))}
                      />
                      <Button type="button" onClick={addAccessory} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {equipmentAccessories.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Acessórios adicionados:</Label>
                      <div className="space-y-2">
                        {equipmentAccessories.map((accessory, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div>
                              <span className="font-medium">{accessory.name}</span>
                              {accessory.description && (
                                <span className="text-sm text-gray-600 ml-2">- {accessory.description}</span>
                              )}
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeAccessory(index)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={loading} className="w-full">
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
