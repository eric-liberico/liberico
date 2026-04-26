export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      textos_biblioteca: {
        Row: {
          id: string;
          titulo: string;
          autor: string;
          epoca: string;
          movimiento: string;
          forma_literaria: string;
          fragmento: string;
          pregunta_orientacion: string;
          marco_analisis: string;
          orden: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          autor: string;
          epoca: string;
          movimiento: string;
          forma_literaria: string;
          fragmento: string;
          pregunta_orientacion: string;
          marco_analisis: string;
          orden?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          autor?: string;
          epoca?: string;
          movimiento?: string;
          forma_literaria?: string;
          fragmento?: string;
          pregunta_orientacion?: string;
          marco_analisis?: string;
          orden?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      textos_vistos: {
        Row: {
          id: string;
          user_id: string;
          texto_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          texto_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          texto_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "textos_vistos_texto_id_fkey";
            columns: ["texto_id"];
            isOneToOne: false;
            referencedRelation: "textos_biblioteca";
            referencedColumns: ["id"];
          },
        ];
      };
      anotaciones_evaluacion: {
        Row: {
          id: string;
          evaluacion_id: string;
          profesor_id: string;
          inicio: number;
          fin: number;
          texto_seleccionado: string;
          tipo: string;
          comentario: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          evaluacion_id: string;
          profesor_id: string;
          inicio: number;
          fin: number;
          texto_seleccionado: string;
          tipo: string;
          comentario?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          evaluacion_id?: string;
          profesor_id?: string;
          inicio?: number;
          fin?: number;
          texto_seleccionado?: string;
          tipo?: string;
          comentario?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "anotaciones_evaluacion_evaluacion_id_fkey";
            columns: ["evaluacion_id"];
            isOneToOne: false;
            referencedRelation: "evaluaciones";
            referencedColumns: ["id"];
          },
        ];
      };
      evaluaciones: {
        Row: {
          analisis_estudiante: string;
          areas_mejora: string | null;
          banda_a: number;
          banda_b: number;
          banda_c: number;
          banda_d: number;
          comentario_global: string | null;
          created_at: string;
          fortalezas: string | null;
          id: string;
          justificacion_a: string | null;
          justificacion_b: string | null;
          justificacion_c: string | null;
          justificacion_d: string | null;
          nota_ib: number | null;
          pregunta_orientacion: string;
          puntuacion_total: number | null;
          texto_literario: string;
          user_id: string;
        };
        Insert: {
          analisis_estudiante: string;
          areas_mejora?: string | null;
          banda_a: number;
          banda_b: number;
          banda_c: number;
          banda_d: number;
          comentario_global?: string | null;
          created_at?: string;
          fortalezas?: string | null;
          id?: string;
          justificacion_a?: string | null;
          justificacion_b?: string | null;
          justificacion_c?: string | null;
          justificacion_d?: string | null;
          nota_ib?: number | null;
          pregunta_orientacion: string;
          puntuacion_total?: number | null;
          texto_literario: string;
          user_id: string;
        };
        Update: {
          analisis_estudiante?: string;
          areas_mejora?: string | null;
          banda_a?: number;
          banda_b?: number;
          banda_c?: number;
          banda_d?: number;
          comentario_global?: string | null;
          created_at?: string;
          fortalezas?: string | null;
          id?: string;
          justificacion_a?: string | null;
          justificacion_b?: string | null;
          justificacion_c?: string | null;
          justificacion_d?: string | null;
          nota_ib?: number | null;
          pregunta_orientacion?: string;
          puntuacion_total?: number | null;
          texto_literario?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      chats_profesor: {
        Row: {
          id: string;
          profesor_id: string;
          titulo: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profesor_id: string;
          titulo: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          profesor_id?: string;
          titulo?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      mensajes_chat_profesor: {
        Row: {
          id: string;
          profesor_id: string;
          chat_id: string | null;
          rol: string;
          contenido: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profesor_id: string;
          chat_id?: string | null;
          rol: string;
          contenido: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          profesor_id?: string;
          chat_id?: string | null;
          rol?: string;
          contenido?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mensajes_chat_profesor_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats_profesor";
            referencedColumns: ["id"];
          },
        ];
      };
      perfiles: {
        Row: {
          banda_inicial_a: number | null;
          banda_inicial_b: number | null;
          banda_inicial_c: number | null;
          banda_inicial_d: number | null;
          codigo_clase: string | null;
          confianza_a: number | null;
          confianza_b: number | null;
          confianza_c: number | null;
          confianza_d: number | null;
          created_at: string;
          diagnostico_completado: boolean | null;
          email: string | null;
          fecha_examen: string | null;
          generos_comodos: string[] | null;
          horas_semanales: number | null;
          movimientos_conocidos: string[] | null;
          nota_objetivo: number | null;
          paso_onboarding: number | null;
          profesor_id: string | null;
          rol: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          banda_inicial_a?: number | null;
          banda_inicial_b?: number | null;
          banda_inicial_c?: number | null;
          banda_inicial_d?: number | null;
          codigo_clase?: string | null;
          confianza_a?: number | null;
          confianza_b?: number | null;
          confianza_c?: number | null;
          confianza_d?: number | null;
          created_at?: string;
          diagnostico_completado?: boolean | null;
          email?: string | null;
          fecha_examen?: string | null;
          generos_comodos?: string[] | null;
          horas_semanales?: number | null;
          movimientos_conocidos?: string[] | null;
          nota_objetivo?: number | null;
          paso_onboarding?: number | null;
          profesor_id?: string | null;
          rol?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          banda_inicial_a?: number | null;
          banda_inicial_b?: number | null;
          banda_inicial_c?: number | null;
          banda_inicial_d?: number | null;
          codigo_clase?: string | null;
          confianza_a?: number | null;
          confianza_b?: number | null;
          confianza_c?: number | null;
          confianza_d?: number | null;
          created_at?: string;
          diagnostico_completado?: boolean | null;
          email?: string | null;
          fecha_examen?: string | null;
          generos_comodos?: string[] | null;
          horas_semanales?: number | null;
          movimientos_conocidos?: string[] | null;
          nota_objetivo?: number | null;
          paso_onboarding?: number | null;
          profesor_id?: string | null;
          rol?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      planes_estudio: {
        Row: {
          activo: boolean | null;
          enfoque_principal: string;
          generado_at: string;
          id: string;
          preliminar: boolean | null;
          resumen_diagnostico: string;
          semanas_totales: number;
          user_id: string;
        };
        Insert: {
          activo?: boolean | null;
          enfoque_principal: string;
          generado_at?: string;
          id?: string;
          preliminar?: boolean | null;
          resumen_diagnostico: string;
          semanas_totales: number;
          user_id: string;
        };
        Update: {
          activo?: boolean | null;
          enfoque_principal?: string;
          generado_at?: string;
          id?: string;
          preliminar?: boolean | null;
          resumen_diagnostico?: string;
          semanas_totales?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tareas_plan: {
        Row: {
          completada: boolean | null;
          completada_at: string | null;
          created_at: string;
          criterio_objetivo: string | null;
          descripcion: string;
          duracion_estimada_min: number;
          id: string;
          plan_id: string;
          semana: number;
          tipo: string;
          titulo: string;
        };
        Insert: {
          completada?: boolean | null;
          completada_at?: string | null;
          created_at?: string;
          criterio_objetivo?: string | null;
          descripcion: string;
          duracion_estimada_min: number;
          id?: string;
          plan_id: string;
          semana: number;
          tipo: string;
          titulo: string;
        };
        Update: {
          completada?: boolean | null;
          completada_at?: string | null;
          created_at?: string;
          criterio_objetivo?: string | null;
          descripcion?: string;
          duracion_estimada_min?: number;
          id?: string;
          plan_id?: string;
          semana?: number;
          tipo?: string;
          titulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tareas_plan_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "planes_estudio";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      unirse_a_clase: {
        Args: { p_codigo: string };
        Returns: string;
      };
      salir_de_clase: {
        Args: Record<never, never>;
        Returns: void;
      };
      get_mis_alumnos: {
        Args: Record<never, never>;
        Returns: {
          user_id: string;
          email: string;
          nota_ib_media: number | null;
          num_evaluaciones: number;
          ultima_evaluacion: string | null;
          banda_a_media: number | null;
          banda_b_media: number | null;
          banda_c_media: number | null;
          banda_d_media: number | null;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
