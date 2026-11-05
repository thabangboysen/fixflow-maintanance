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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          block_name: string
          created_at: string
          gender_group: string
          id: string
        }
        Insert: {
          block_name: string
          created_at?: string
          gender_group: string
          id?: string
        }
        Update: {
          block_name?: string
          created_at?: string
          gender_group?: string
          id?: string
        }
        Relationships: []
      }
      maintenance_reports: {
        Row: {
          assigned_at: string | null
          assigned_staff_id: string | null
          block_name: string
          category: Database["public"]["Enums"]["problem_category"]
          completed_at: string | null
          completion_photo_path: string | null
          created_at: string
          description: string
          id: string
          photo_path: string | null
          priority: Database["public"]["Enums"]["report_priority"]
          report_reference: string
          residence: string
          room_name: string
          staff_notes: string | null
          status: Database["public"]["Enums"]["report_status"]
          student_id: string
          student_name: string
          student_number: string
          unit_number: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_staff_id?: string | null
          block_name: string
          category: Database["public"]["Enums"]["problem_category"]
          completed_at?: string | null
          completion_photo_path?: string | null
          created_at?: string
          description: string
          id?: string
          photo_path?: string | null
          priority?: Database["public"]["Enums"]["report_priority"]
          report_reference: string
          residence: string
          room_name: string
          staff_notes?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          student_id: string
          student_name: string
          student_number: string
          unit_number: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_staff_id?: string | null
          block_name?: string
          category?: Database["public"]["Enums"]["problem_category"]
          completed_at?: string | null
          completion_photo_path?: string | null
          created_at?: string
          description?: string
          id?: string
          photo_path?: string | null
          priority?: Database["public"]["Enums"]["report_priority"]
          report_reference?: string
          residence?: string
          room_name?: string
          staff_notes?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          student_id?: string
          student_name?: string
          student_number?: string
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_reports_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          staff_id: string | null
          student_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          staff_id?: string | null
          student_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          staff_id?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      report_history: {
        Row: {
          action: string
          actor_name: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["report_status"] | null
          note: string | null
          previous_status: Database["public"]["Enums"]["report_status"] | null
          report_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          actor_name?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["report_status"] | null
          note?: string | null
          previous_status?: Database["public"]["Enums"]["report_status"] | null
          report_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_name?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["report_status"] | null
          note?: string | null
          previous_status?: Database["public"]["Enums"]["report_status"] | null
          report_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "maintenance_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      residence_students: {
        Row: {
          block: string | null
          created_at: string
          full_name: string
          id: string
          room_number: string | null
          student_number: string
          user_id: string | null
        }
        Insert: {
          block?: string | null
          created_at?: string
          full_name: string
          id?: string
          room_number?: string | null
          student_number: string
          user_id?: string | null
        }
        Update: {
          block?: string | null
          created_at?: string
          full_name?: string
          id?: string
          room_number?: string | null
          student_number?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rooms: {
        Row: {
          created_at: string
          id: string
          room_name: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_name: string
          unit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          room_name?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_accounts: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          is_demo: boolean
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          skill_category: Database["public"]["Enums"]["problem_category"] | null
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_demo?: boolean
          phone?: string | null
          role: Database["public"]["Enums"]["app_role"]
          skill_category?:
            | Database["public"]["Enums"]["problem_category"]
            | null
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_demo?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          skill_category?:
            | Database["public"]["Enums"]["problem_category"]
            | null
          user_id?: string | null
        }
        Relationships: []
      }
      student_otp_requests: {
        Row: {
          created_at: string
          id: string
          student_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_number: string
        }
        Update: {
          created_at?: string
          id?: string
          student_number?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          is_demo: boolean
          residence: string
          room_id: string | null
          student_number: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_demo?: boolean
          residence?: string
          room_id?: string | null
          student_number: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_demo?: boolean
          residence?: string
          room_id?: string | null
          student_number?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          block_id: string
          created_at: string
          id: string
          unit_number: string
        }
        Insert: {
          block_id: string
          created_at?: string
          id?: string
          unit_number: string
        }
        Update: {
          block_id?: string
          created_at?: string
          id?: string
          unit_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_staff_id: { Args: never; Returns: string }
      current_student_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_office: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "student" | "staff" | "management" | "admin"
      problem_category:
        | "Toilet"
        | "Shower"
        | "Sink/Basin"
        | "Tap"
        | "Door"
        | "Window"
        | "Electricity"
        | "Lighting"
        | "Plumbing"
        | "Furniture"
        | "Other"
        | "Electrical"
        | "Broken/Damaged"
        | "Cleaning"
        | "Safety/Security"
      report_priority: "Low" | "Medium" | "High" | "Urgent"
      report_status:
        | "Submitted"
        | "Acknowledged"
        | "Assigned"
        | "In Progress"
        | "Completed"
        | "Closed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "staff", "management", "admin"],
      problem_category: [
        "Toilet",
        "Shower",
        "Sink/Basin",
        "Tap",
        "Door",
        "Window",
        "Electricity",
        "Lighting",
        "Plumbing",
        "Furniture",
        "Other",
        "Electrical",
        "Broken/Damaged",
        "Cleaning",
        "Safety/Security",
      ],
      report_priority: ["Low", "Medium", "High", "Urgent"],
      report_status: [
        "Submitted",
        "Acknowledged",
        "Assigned",
        "In Progress",
        "Completed",
        "Closed",
      ],
    },
  },
} as const
