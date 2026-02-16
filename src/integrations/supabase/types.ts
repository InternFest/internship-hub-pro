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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_queries: {
        Row: {
          category: Database["public"]["Enums"]["query_category"]
          created_at: string
          description: string
          id: string
          is_resolved: boolean | null
          resolved_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["query_category"]
          created_at?: string
          description: string
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["query_category"]
          created_at?: string
          description?: string
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          file_name: string
          file_url: string
          id: string
          student_id: string
          submitted_at: string
        }
        Insert: {
          assignment_id: string
          file_name: string
          file_url: string
          id?: string
          student_id: string
          submitted_at?: string
        }
        Update: {
          assignment_id?: string
          file_name?: string
          file_url?: string
          id?: string
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          assignment_number: number
          batch_id: string
          created_at: string
          created_by: string
          deadline: string
          description: string | null
          id: string
          links: string | null
          pdf_url: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          assignment_number?: number
          batch_id: string
          created_at?: string
          created_by: string
          deadline: string
          description?: string | null
          id?: string
          links?: string | null
          pdf_url?: string | null
          start_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignment_number?: number
          batch_id?: string
          created_at?: string
          created_by?: string
          deadline?: string
          description?: string | null
          id?: string
          links?: string | null
          pdf_url?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          assigned_faculty_id: string | null
          batch_strength: number | null
          batch_timings: string | null
          course_code: string
          created_at: string
          description: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          assigned_faculty_id?: string | null
          batch_strength?: number | null
          batch_timings?: string | null
          course_code?: string
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          assigned_faculty_id?: string | null
          batch_strength?: number | null
          batch_timings?: string | null
          course_code?: string
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      internship_diary: {
        Row: {
          created_at: string
          entry_date: string
          hours_worked: number
          id: string
          is_locked: boolean | null
          learning_outcome: string | null
          reference_links: string | null
          skills_gained: string | null
          title: string | null
          updated_at: string
          user_id: string
          week_number: number
          work_description: string
          work_summary: string | null
        }
        Insert: {
          created_at?: string
          entry_date: string
          hours_worked: number
          id?: string
          is_locked?: boolean | null
          learning_outcome?: string | null
          reference_links?: string | null
          skills_gained?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          week_number?: number
          work_description: string
          work_summary?: string | null
        }
        Update: {
          created_at?: string
          entry_date?: string
          hours_worked?: number
          id?: string
          is_locked?: boolean | null
          learning_outcome?: string | null
          reference_links?: string | null
          skills_gained?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          week_number?: number
          work_description?: string
          work_summary?: string | null
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          created_at: string
          id: string
          leave_date: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["leave_status"] | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leave_date: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["leave_status"] | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leave_date?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["leave_status"] | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string
          id: string
          linkedin_url: string | null
          phone: string | null
          resume_url: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name: string
          id: string
          linkedin_url?: string | null
          phone?: string | null
          resume_url?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          resume_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_diary: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          project_id: string
          updated_at: string
          user_id: string
          work_description: string
        }
        Insert: {
          created_at?: string
          entry_date: string
          id?: string
          project_id: string
          updated_at?: string
          user_id: string
          work_description: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string
          work_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_diary_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          joined_at: string
          project_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          project_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          lead_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          lead_id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          batch_id: string
          content_text: string | null
          content_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          module_number: number
          pdf_url: string | null
          resource_type: Database["public"]["Enums"]["resource_type"]
          title: string
          updated_at: string
        }
        Insert: {
          batch_id: string
          content_text?: string | null
          content_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          module_number?: number
          pdf_url?: string | null
          resource_type?: Database["public"]["Enums"]["resource_type"]
          title: string
          updated_at?: string
        }
        Update: {
          batch_id?: string
          content_text?: string | null
          content_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          module_number?: number
          pdf_url?: string | null
          resource_type?: Database["public"]["Enums"]["resource_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          batch_id: string | null
          branch: string | null
          college_name: string | null
          created_at: string
          id: string
          internship_role: Database["public"]["Enums"]["internship_role"] | null
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          status: Database["public"]["Enums"]["student_status"] | null
          student_id: string | null
          updated_at: string
          user_id: string
          usn: string | null
        }
        Insert: {
          batch_id?: string | null
          branch?: string | null
          college_name?: string | null
          created_at?: string
          id?: string
          internship_role?:
            | Database["public"]["Enums"]["internship_role"]
            | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          status?: Database["public"]["Enums"]["student_status"] | null
          student_id?: string | null
          updated_at?: string
          user_id: string
          usn?: string | null
        }
        Update: {
          batch_id?: string | null
          branch?: string | null
          college_name?: string | null
          created_at?: string
          id?: string
          internship_role?:
            | Database["public"]["Enums"]["internship_role"]
            | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          status?: Database["public"]["Enums"]["student_status"] | null
          student_id?: string | null
          updated_at?: string
          user_id?: string
          usn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_student_batch"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      can_access_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      generate_student_id: {
        Args: { batch_year: string; course_code: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_project_lead: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "faculty" | "admin"
      internship_role: "ai-ml" | "java" | "vlsi" | "mern"
      leave_status: "pending" | "approved" | "rejected"
      leave_type: "sick" | "casual"
      query_category: "course" | "faculty" | "schedule" | "work" | "other"
      resource_type: "video" | "text" | "notes"
      skill_level: "beginner" | "intermediate" | "advanced"
      student_status: "pending" | "approved" | "rejected"
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
  public: {
    Enums: {
      app_role: ["student", "faculty", "admin"],
      internship_role: ["ai-ml", "java", "vlsi", "mern"],
      leave_status: ["pending", "approved", "rejected"],
      leave_type: ["sick", "casual"],
      query_category: ["course", "faculty", "schedule", "work", "other"],
      resource_type: ["video", "text", "notes"],
      skill_level: ["beginner", "intermediate", "advanced"],
      student_status: ["pending", "approved", "rejected"],
    },
  },
} as const
