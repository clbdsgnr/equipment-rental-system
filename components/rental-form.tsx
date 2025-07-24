"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar } from "lucide-react"

interface Equipment {
  id: string
  name: string
  description: string | null
  status: "available" | "rented" | "maintenance"
}

interface Accessory {
  id: string
  equipment_id: string
  name: string
  description: string | null
}

interface RentalFormProps {
  onRentalCreated: () => void
}

export default function RentalForm({ onRentalCreated }: RentalFormProps) {
  const { user } = useAuth()
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [formData, setFormData] = useState({
    equipment_id: "",
    rental_date: new Date().toISOString().split("T")[0],
    rental_time: new Date().toTimeString().slice(0, 5),
    expected_return_date: "",
    accessories_taken: false,
    accessories_list: [] as string[],
  })

  useEffect(() => {
    loadEquipments()
    loadAccessories()
  }, [])

  const loadEquipments = async () => {
    try {
      const { data, error } = await supabase.from("equipments").select("*").eq("status", "available").order("name")

      if (error) throw error
      setEquipments(data || [])
    } catch (error: any) {
      setError(error.message)
    }
  }

  const loadAccessories = async () => {
    try {
      const { data, error } = await supabase.from("accessories").select("*")

      if (error) throw error
      setAccessories(data || [])
    } catch (error: any) {
      console.error("Erro ao carregar acessórios:", error)
    }
  }

  const getEquipmentAccessories = (equipmentId: string) => {
    return accessories.filter((acc) => acc.equipment_id === equipmentId)
  }

  const handleAccessoryChange = (accessoryId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      accessories_list: checked
        ? [...prev.accessories_list, accessoryId]
        : prev.accessories_list.filter((id) => id !== accessoryId),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    if (!user) {
      setError("Usuário não autenticado")
      setLoading(false)
      return
    }

    try {
      // Criar o empréstimo
      const { error: rentalError } = await supabase.from("rentals").insert([
        {
          user_id: user.id,
          equipment_id: formData.equipment_id,
          rental_date: formData.rental_date,
          rental_time: formData.rental_time,
          expected_return_date: formData.expected_return_date || null,
          accessories_taken: formData.accessories_taken,
          accessories_list: formData.accessories_list.length > 0 ? formData.accessories_list : null,
          status: "active",
        },
      ])

      if (rentalError) throw rentalError

      // Atualizar status do equipamento para 'rented'
      const { error: equipmentError } = await supabase
        .from("equipments")
        .update({ status: "rented" })
        .eq("id", formData.equipment_id)

      if (equipmentError) throw equipmentError

      setSuccess("Empréstimo registrado com sucesso!")
      setFormData({
        equipment_id: "",
        rental_date: new Date().toISOString().split("T")[0],
        rental_time: new Date().toTimeString().slice(0, 5),
        expected_return_date: "",
        accessories_taken: false,
        accessories_list: [],
      })

      await loadEquipments()
      onRentalCreated()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedEquipmentAccessories = formData.equipment_id ? getEquipmentAccessories(formData.equipment_id) : []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Novo Empréstimo
        </CardTitle>
        <CardDescription>Registre um novo empréstimo de equipamento</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="equipment">Equipamento</Label>
              <Select
                value={formData.equipment_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    equipment_id: value,
                    accessories_list: [], // Reset accessories when equipment changes
                  }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um equipamento" />
                </SelectTrigger>
                <SelectContent>
                  {equipments.map((equipment) => (
                    <SelectItem key={equipment.id} value={equipment.id}>
                      {equipment.name}
                      {equipment.description && (
                        <span className="text-sm text-gray-500 ml-2">- {equipment.description}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_return_date">Data Prevista de Devolução</Label>
              <Input
                id="expected_return_date"
                type="date"
                value={formData.expected_return_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, expected_return_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rental_date">Data de Retirada</Label>
              <Input
                id="rental_date"
                type="date"
                value={formData.rental_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, rental_date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rental_time">Hora de Retirada</Label>
              <Input
                id="rental_time"
                type="time"
                value={formData.rental_time}
                onChange={(e) => setFormData((prev) => ({ ...prev, rental_time: e.target.value }))}
                required
              />
            </div>
          </div>

          {selectedEquipmentAccessories.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="accessories_taken"
                  checked={formData.accessories_taken}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      accessories_taken: checked as boolean,
                      accessories_list: checked ? prev.accessories_list : [],
                    }))
                  }
                />
                <Label htmlFor="accessories_taken">Retirar acessórios junto com o equipamento</Label>
              </div>

              {formData.accessories_taken && (
                <div className="space-y-2 pl-6">
                  <Label>Selecione os acessórios:</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedEquipmentAccessories.map((accessory) => (
                      <div key={accessory.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`accessory-${accessory.id}`}
                          checked={formData.accessories_list.includes(accessory.id)}
                          onCheckedChange={(checked) => handleAccessoryChange(accessory.id, checked as boolean)}
                        />
                        <Label htmlFor={`accessory-${accessory.id}`} className="text-sm">
                          {accessory.name}
                          {accessory.description && (
                            <span className="text-gray-500 ml-1">- {accessory.description}</span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={loading || !formData.equipment_id}>
            {loading ? "Registrando..." : "Registrar Empréstimo"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
