"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CalendarIcon, Clock } from "lucide-react"

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
  })
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      // Criar o empréstimo
      const rentalData = {
        user_id: user.id,
        equipment_id: formData.equipment_id,
        rental_date: formData.rental_date,
        rental_time: formData.rental_time,
        expected_return_date: formData.expected_return_date || null,
        accessories_taken: selectedAccessories.length > 0,
        accessories_list: selectedAccessories,
        status: "active",
      }

      const { error: rentalError } = await supabase.from("rentals").insert([rentalData])

      if (rentalError) throw rentalError

      // Atualizar status do equipamento para "rented"
      const { error: updateError } = await supabase
        .from("equipments")
        .update({ status: "rented" })
        .eq("id", formData.equipment_id)

      if (updateError) throw updateError

      setSuccess("Empréstimo registrado com sucesso!")
      setFormData({
        equipment_id: "",
        rental_date: new Date().toISOString().split("T")[0],
        rental_time: new Date().toTimeString().slice(0, 5),
        expected_return_date: "",
      })
      setSelectedAccessories([])

      await loadEquipments()
      onRentalCreated()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAccessoryChange = (accessoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedAccessories([...selectedAccessories, accessoryId])
    } else {
      setSelectedAccessories(selectedAccessories.filter((id) => id !== accessoryId))
    }
  }

  const getEquipmentAccessories = (equipmentId: string) => {
    return accessories.filter((acc) => acc.equipment_id === equipmentId)
  }

  const selectedEquipment = equipments.find((eq) => eq.id === formData.equipment_id)
  const equipmentAccessories = selectedEquipment ? getEquipmentAccessories(selectedEquipment.id) : []

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Novo Empréstimo
        </CardTitle>
        <CardDescription>Registre um novo empréstimo de equipamento</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="equipment">Equipamento</Label>
              <Select
                value={formData.equipment_id}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, equipment_id: value }))
                  setSelectedAccessories([]) // Reset accessories when equipment changes
                }}
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

            {equipmentAccessories.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Acessórios Disponíveis</Label>
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                  {equipmentAccessories.map((accessory) => (
                    <div key={accessory.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={accessory.id}
                        checked={selectedAccessories.includes(accessory.id)}
                        onCheckedChange={(checked) => handleAccessoryChange(accessory.id, checked as boolean)}
                      />
                      <Label htmlFor={accessory.id} className="flex-1 cursor-pointer">
                        <span className="font-medium">{accessory.name}</span>
                        {accessory.description && (
                          <span className="text-sm text-gray-600 ml-2">- {accessory.description}</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedAccessories.length > 0 && (
                  <p className="text-sm text-blue-600">{selectedAccessories.length} acessório(s) selecionado(s)</p>
                )}
              </div>
            )}

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
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="rental_time"
                    type="time"
                    value={formData.rental_time}
                    onChange={(e) => setFormData((prev) => ({ ...prev, rental_time: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_return_date">Data Prevista de Devolução (Opcional)</Label>
              <Input
                id="expected_return_date"
                type="date"
                value={formData.expected_return_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, expected_return_date: e.target.value }))}
                min={formData.rental_date}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription className="text-green-600">{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={loading || !formData.equipment_id} className="w-full">
            {loading ? "Registrando..." : "Registrar Empréstimo"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
