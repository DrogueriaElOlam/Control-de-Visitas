export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      apertura_codigo_history: {
        Row: {
          created_at: string | null
          datos: Json
          fecha_creacion: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          datos: Json
          fecha_creacion?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          datos?: Json
          fecha_creacion?: string | null
          id?: string
        }
        Relationships: []
      }
      broadcast_details: {
        Row: {
          confirmed: boolean | null
          id: string
          name: string | null
          phone: string
          sent_date: string | null
          session_id: string | null
        }
        Insert: {
          confirmed?: boolean | null
          id?: string
          name?: string | null
          phone: string
          sent_date?: string | null
          session_id?: string | null
        }
        Update: {
          confirmed?: boolean | null
          id?: string
          name?: string | null
          phone?: string
          sent_date?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_details_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "broadcast_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_sessions: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          total_contacts: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          total_contacts?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          total_contacts?: number | null
        }
        Relationships: []
      }
      client_codes: {
        Row: {
          client_name: string
          code: string
          created_at: string | null
        }
        Insert: {
          client_name: string
          code: string
          created_at?: string | null
        }
        Update: {
          client_name?: string
          code?: string
          created_at?: string | null
        }
        Relationships: []
      }
      config_tienda: {
        Row: {
          color_primario: string | null
          color_secundario: string | null
          created_at: string | null
          descripcion: string | null
          direccion: string | null
          email: string | null
          id: number
          logo_url: string | null
          nombre_tienda: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          color_primario?: string | null
          color_secundario?: string | null
          created_at?: string | null
          descripcion?: string | null
          direccion?: string | null
          email?: string | null
          id?: number
          logo_url?: string | null
          nombre_tienda?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          color_primario?: string | null
          color_secundario?: string | null
          created_at?: string | null
          descripcion?: string | null
          direccion?: string | null
          email?: string | null
          id?: number
          logo_url?: string | null
          nombre_tienda?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_goals: {
        Row: {
          achieved_amount: number | null
          created_at: string | null
          daily_commitment: number | null
          deficit: number | null
          id: number
          route: string
          team_goal: number | null
          vendor_name: string
          visit_date: string
        }
        Insert: {
          achieved_amount?: number | null
          created_at?: string | null
          daily_commitment?: number | null
          deficit?: number | null
          id?: number
          route: string
          team_goal?: number | null
          vendor_name: string
          visit_date: string
        }
        Update: {
          achieved_amount?: number | null
          created_at?: string | null
          daily_commitment?: number | null
          deficit?: number | null
          id?: number
          route?: string
          team_goal?: number | null
          vendor_name?: string
          visit_date?: string
        }
        Relationships: []
      }
      daily_supervision_history: {
        Row: {
          created_at: string | null
          date: string
          datos: Json
          id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          datos: Json
          id?: string
        }
        Update: {
          created_at?: string | null
          date?: string
          datos?: Json
          id?: string
        }
        Relationships: []
      }
      liquidacion_recibos_history: {
        Row: {
          created_at: string | null
          datos: Json
          fecha_creacion: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          datos: Json
          fecha_creacion?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          datos?: Json
          fecha_creacion?: string | null
          id?: string
        }
        Relationships: []
      }
      liquidacion_viaticos_history: {
        Row: {
          created_at: string | null
          datos: Json
          fecha_creacion: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          datos: Json
          fecha_creacion?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          datos?: Json
          fecha_creacion?: string | null
          id?: string
        }
        Relationships: []
      }
      productos_tienda: {
        Row: {
          activo: boolean | null
          categoria: string | null
          created_at: string | null
          descripcion: string | null
          id: number
          imagen_url: string | null
          nombre: string
          orden: number | null
          precio: number
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          imagen_url?: string | null
          nombre: string
          orden?: number | null
          precio: number
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          imagen_url?: string | null
          nombre?: string
          orden?: number | null
          precio?: number
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          rol: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          rol?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          rol?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      route_templates: {
        Row: {
          alimentacion: number | null
          combustible: number | null
          created_at: string
          fotocopias: number | null
          hospedaje: number | null
          id: number
          lugares_visitar: string | null
          otros: number | null
          route_name: string
        }
        Insert: {
          alimentacion?: number | null
          combustible?: number | null
          created_at?: string
          fotocopias?: number | null
          hospedaje?: number | null
          id?: number
          lugares_visitar?: string | null
          otros?: number | null
          route_name: string
        }
        Update: {
          alimentacion?: number | null
          combustible?: number | null
          created_at?: string
          fotocopias?: number | null
          hospedaje?: number | null
          id?: number
          lugares_visitar?: string | null
          otros?: number | null
          route_name?: string
        }
        Relationships: []
      }
      routes: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: number
          name: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: number
          name: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      solicitud_viaticos_history: {
        Row: {
          created_at: string | null
          datos: Json
          fecha_creacion: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          datos: Json
          fecha_creacion?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          datos?: Json
          fecha_creacion?: string | null
          id?: string
        }
        Relationships: []
      }
      supervision_comisiones_history: {
        Row: {
          created_at: string | null
          datos: Json
          fecha_creacion: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          datos: Json
          fecha_creacion?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          datos?: Json
          fecha_creacion?: string | null
          id?: string
        }
        Relationships: []
      }
      supervision_evaluaciones_history: {
        Row: {
          created_at: string | null
          datos: Json
          fecha_creacion: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          datos: Json
          fecha_creacion?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          datos?: Json
          fecha_creacion?: string | null
          id?: string
        }
        Relationships: []
      }
      supervision_recibos_history: {
        Row: {
          created_at: string | null
          datos: Json
          fecha_creacion: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          datos: Json
          fecha_creacion?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          datos?: Json
          fecha_creacion?: string | null
          id?: string
        }
        Relationships: []
      }
      supervision_settings: {
        Row: {
          created_at: string | null
          id: string
          meeting_points: Json | null
          monthly_goal: number | null
          monthly_goals: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meeting_points?: Json | null
          monthly_goal?: number | null
          monthly_goals?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meeting_points?: Json | null
          monthly_goal?: number | null
          monthly_goals?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      supervision_viaticos_history: {
        Row: {
          created_at: string | null
          datos: Json
          fecha_creacion: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          datos: Json
          fecha_creacion?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          datos?: Json
          fecha_creacion?: string | null
          id?: string
        }
        Relationships: []
      }
      supervision_visitas_history: {
        Row: {
          created_at: string | null
          datos: Json
          fecha_creacion: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          datos: Json
          fecha_creacion?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          datos?: Json
          fecha_creacion?: string | null
          id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          meta: number | null
          meta_mensual: number | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          meta?: number | null
          meta_mensual?: number | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          meta?: number | null
          meta_mensual?: number | null
          name?: string
        }
        Relationships: []
      }
      vendor_evaluation_settings: {
        Row: {
          aspects_template: Json | null
          created_at: string | null
          id: number
          table_headers: Json | null
          updated_at: string | null
          vendor_routes: Json | null
        }
        Insert: {
          aspects_template?: Json | null
          created_at?: string | null
          id?: number
          table_headers?: Json | null
          updated_at?: string | null
          vendor_routes?: Json | null
        }
        Update: {
          aspects_template?: Json | null
          created_at?: string | null
          id?: number
          table_headers?: Json | null
          updated_at?: string | null
          vendor_routes?: Json | null
        }
        Relationships: []
      }
      vendors: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: number
          last_name: string | null
          name: string
          team_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: number
          last_name?: string | null
          name: string
          team_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: number
          last_name?: string | null
          name?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      visitas_tienda: {
        Row: {
          contador: number | null
          created_at: string | null
          fecha: string
          id: number
        }
        Insert: {
          contador?: number | null
          created_at?: string | null
          fecha?: string
          id?: number
        }
        Update: {
          contador?: number | null
          created_at?: string | null
          fecha?: string
          id?: number
        }
        Relationships: []
      }
      visits: {
        Row: {
          client_code: string
          client_name: string
          client_type: string
          collection_amount: number | null
          collection_boleta: number | null
          collection_cash: number | null
          collection_check: number | null
          collection_transfer: number | null
          created_at: string | null
          day_period: string
          has_collection: boolean | null
          has_sale: boolean | null
          id: number
          latitude: number | null
          location_accuracy: number | null
          longitude: number | null
          observations: string | null
          phone: string | null
          route: string
          sale_amount: number | null
          sale_type: string | null
          sector: string
          timestamp: string | null
          vendor_name: string
          visit_date: string
          visit_type: string
        }
        Insert: {
          client_code: string
          client_name: string
          client_type: string
          collection_amount?: number | null
          collection_boleta?: number | null
          collection_cash?: number | null
          collection_check?: number | null
          collection_transfer?: number | null
          created_at?: string | null
          day_period: string
          has_collection?: boolean | null
          has_sale?: boolean | null
          id?: number
          latitude?: number | null
          location_accuracy?: number | null
          longitude?: number | null
          observations?: string | null
          phone?: string | null
          route: string
          sale_amount?: number | null
          sale_type?: string | null
          sector: string
          timestamp?: string | null
          vendor_name: string
          visit_date: string
          visit_type: string
        }
        Update: {
          client_code?: string
          client_name?: string
          client_type?: string
          collection_amount?: number | null
          collection_boleta?: number | null
          collection_cash?: number | null
          collection_check?: number | null
          collection_transfer?: number | null
          created_at?: string | null
          day_period?: string
          has_collection?: boolean | null
          has_sale?: boolean | null
          id?: number
          latitude?: number | null
          location_accuracy?: number | null
          longitude?: number | null
          observations?: string | null
          phone?: string | null
          route?: string
          sale_amount?: number | null
          sale_type?: string | null
          sector?: string
          timestamp?: string | null
          vendor_name?: string
          visit_date?: string
          visit_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_users: {
        Args: {
          page_limit?: number
          page_offset?: number
          search_email?: string
        }
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          id: string
          last_sign_in_at: string
          total_count: number
        }[]
      }
      get_storage_buckets: {
        Args: never
        Returns: {
          allowed_mime_types: string[]
          avif_autodetection: boolean
          created_at: string
          file_size_limit: number
          id: string
          name: string
          owner: string
          public: boolean
          updated_at: string
        }[]
      }
      incrementar_visitas: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
