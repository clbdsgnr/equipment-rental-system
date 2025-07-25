// Este é um novo arquivo para definir seus tipos de banco de dados,
// tornando-os reutilizáveis para ambos os clientes Supabase.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          created_at: string
          updated_at: string
          role: string
        }
        Insert: {
          id: string
          email: string
          name: string
          role?: string
        }
        Update: {
          email?: string
          name?: string
          role?: string
        }
      }
      equipments: {
        Row: {
          id: string
          name: string
          description: string | null
          serial_number: string | null
          status: "available" | "rented" | "maintenance"
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          description?: string
          serial_number?: string
          status?: "available" | "rented" | "maintenance"
        }
        Update: {
          name?: string
          description?: string
          serial_number?: string
          status?: "available" | "rented" | "maintenance"
        }
      }
      accessories: {
        Row: {
          id: string
          equipment_id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          equipment_id: string
          name: string
          description?: string
        }
        Update: {
          name?: string
          description?: string
        }
      }
      rentals: {
        Row: {
          id: string
          user_id: string
          equipment_id: string
          rental_date: string
          rental_time: string
          expected_return_date: string | null
          actual_return_date: string | null
          actual_return_time: string | null
          accessories_taken: boolean
          accessories_list: string[] | null
          return_observations: string | null
          status: "active" | "returned" | "overdue"
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          equipment_id: string
          rental_date: string
          rental_time: string
          expected_return_date?: string
          accessories_taken?: boolean
          accessories_list?: string[]
        }
        Update: {
          actual_return_date?: string
          actual_return_time?: string
          return_observations?: string
          status?: "active" | "returned" | "overdue"
        }
      }
    }
  }
}
