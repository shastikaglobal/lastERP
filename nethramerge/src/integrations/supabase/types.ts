export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          id: string
          company_id: string | null
          actor_id: string | null
          actor_name: string | null
          entity: string | null
          action: string | null
          team: string | null
          created_at: string
          user_id: string | null
          user_name: string | null
          module: string | null
          event_type: string | null
          session_id: string | null
        }
        Insert: {
          id?: string
          company_id?: string | null
          actor_id?: string | null
          actor_name?: string | null
          entity?: string | null
          action?: string | null
          team?: string | null
          created_at?: string
          user_id?: string | null
          user_name?: string | null
          module?: string | null
          event_type?: string | null
          session_id?: string | null
        }
        Update: {
          id?: string
          company_id?: string | null
          actor_id?: string | null
          actor_name?: string | null
          entity?: string | null
          action?: string | null
          team?: string | null
          created_at?: string
          user_id?: string | null
          user_name?: string | null
          module?: string | null
          event_type?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          company_id: string | null
          full_name: string | null
          email: string | null
          avatar_url: string | null
          status: string | null
          requested_role: string | null
          rejection_reason: string | null
          email_signature: string | null
          phone: string | null
          biometric_id: string | null
          monthly_salary: number | null
          punch_deadline: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Insert: {
          id: string
          company_id?: string | null
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          status?: string | null
          requested_role?: string | null
          rejection_reason?: string | null
          email_signature?: string | null
          phone?: string | null
          biometric_id?: string | null
          monthly_salary?: number | null
          punch_deadline?: string | null
        }
        Update: {
          id?: string
          company_id?: string | null
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          status?: string | null
          requested_role?: string | null
          rejection_reason?: string | null
          email_signature?: string | null
          phone?: string | null
          biometric_id?: string | null
          monthly_salary?: number | null
          punch_deadline?: string | null
        }
        Relationships: []
      }
      attendance_logs: {
        Row: {
          id: string
          employee_id: string
          company_id: string
          date: string
          status: string
          clock_in: string | null
          clock_out: string | null
          notes: string | null
          is_manual: boolean
          is_excused: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          company_id: string
          date?: string
          status?: string
          clock_in?: string | null
          clock_out?: string | null
          notes?: string | null
          is_manual?: boolean
          is_excused?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          company_id?: string
          date?: string
          status?: string
          clock_in?: string | null
          clock_out?: string | null
          notes?: string | null
          is_manual?: boolean
          is_excused?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      screen_signals: {
        Row: {
          id: string
          from_user_id: string
          to_user_id: string
          signal_type: string
          payload: string
          created_at: string
        }
        Insert: {
          id?: string
          from_user_id: string
          to_user_id: string
          signal_type: string
          payload: string
          created_at?: string
        }
        Update: {
          id?: string
          from_user_id?: string
          to_user_id?: string
          signal_type?: string
          payload?: string
          created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          company_id: string
          payment_number: string | null
          payer_name: string
          amount: number
          currency: string
          method: string
          status: string
          reference_number: string | null
          received_at: string | null
          created_by: string | null
          created_at: string
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          company_id?: string
          payment_number?: string | null
          payer_name: string
          amount: number
          currency?: string
          method?: string
          status?: string
          reference_number?: string | null
          received_at?: string | null
          created_by?: string | null
          created_at?: string
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          payment_number?: string | null
          payer_name?: string
          amount?: number
          currency?: string
          method?: string
          status?: string
          reference_number?: string | null
          received_at?: string | null
          created_by?: string | null
          created_at?: string
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: []
      }
      export_orders: {
        Row: {
          id: string
          company_id: string
          order_number: string
          customer_name: string | null
          total_amount: number
          currency: string
          payment_status: string
          created_at: string
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          company_id: string
          order_number: string
          customer_name?: string | null
          total_amount: number
          currency?: string
          payment_status?: string
          created_at?: string
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          order_number?: string
          customer_name?: string | null
          total_amount?: number
          currency?: string
          payment_status?: string
          created_at?: string
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          company_id: string
          full_name: string
          email: string | null
          phone: string | null
          status: string
          created_at: string
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          company_id: string
          full_name: string
          email?: string | null
          phone?: string | null
          status?: string
          created_at?: string
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          status?: string
          created_at?: string
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          id: string
          company_id: string
          name: string
          warehouse_type: string
          address: string | null
          city: string
          state: string | null
          location: string | null
          capacity_kg: number | null
          manager_name: string | null
          manager_phone: string | null
          is_cold_chain: boolean
          is_active: boolean
          created_at: string
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          warehouse_type?: string
          address?: string | null
          city: string
          state?: string | null
          location?: string | null
          capacity_kg?: number | null
          manager_name?: string | null
          manager_phone?: string | null
          is_cold_chain?: boolean
          is_active?: boolean
          created_at?: string
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          warehouse_type?: string
          address?: string | null
          city?: string
          state?: string | null
          location?: string | null
          capacity_kg?: number | null
          manager_name?: string | null
          manager_phone?: string | null
          is_cold_chain?: boolean
          is_active?: boolean
          created_at?: string
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: []
      }
      inventory_batches: {
        Row: {
          id: string
          company_id: string
          warehouse_id: string | null
          product_id: string | null
          lot_number: string
          quantity_remaining_kg: number
          received_date: string
          status: string
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          company_id: string
          warehouse_id?: string | null
          product_id?: string | null
          lot_number: string
          quantity_remaining_kg: number
          received_date?: string
          status?: string
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          warehouse_id?: string | null
          product_id?: string | null
          lot_number?: string
          quantity_remaining_kg?: number
          received_date?: string
          status?: string
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          logo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          logo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          logo_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      packing_protocols: {
        Row: {
          id: string
          receiving_id: string
          carton_count: number
          net_weight: number
          gross_weight: number
          pallet_config: string | null
          export_marks: string | null
          status: string
          company_id: string
          created_by: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          receiving_id: string
          carton_count: number
          net_weight: number
          gross_weight: number
          pallet_config?: string | null
          export_marks?: string | null
          status?: string
          company_id: string
          created_by: string
          created_at?: string
          updated_at?: string
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          receiving_id?: string
          carton_count?: number
          net_weight?: number
          gross_weight?: number
          pallet_config?: string | null
          export_marks?: string | null
          status?: string
          company_id?: string
          created_by?: string
          created_at?: string
          updated_at?: string
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}