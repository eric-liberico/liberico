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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          accion: string
          admin_id: string
          created_at: string
          detalles: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          accion: string
          admin_id: string
          created_at?: string
          detalles?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          accion?: string
          admin_id?: string
          created_at?: string
          detalles?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      anotaciones_evaluacion: {
        Row: {
          comentario: string
          created_at: string
          evaluacion_id: string
          fin: number
          id: string
          inicio: number
          profesor_id: string
          texto_seleccionado: string
          tipo: string
        }
        Insert: {
          comentario?: string
          created_at?: string
          evaluacion_id: string
          fin: number
          id?: string
          inicio: number
          profesor_id: string
          texto_seleccionado: string
          tipo: string
        }
        Update: {
          comentario?: string
          created_at?: string
          evaluacion_id?: string
          fin?: number
          id?: string
          inicio?: number
          profesor_id?: string
          texto_seleccionado?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "anotaciones_evaluacion_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_notes: {
        Row: {
          booking_id: string
          created_at: string | null
          id: string
          next_steps: string | null
          summary: string | null
          teacher_id: string
          visible_to_student: boolean | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          id?: string
          next_steps?: string | null
          summary?: string | null
          teacher_id: string
          visible_to_student?: boolean | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          id?: string
          next_steps?: string | null
          summary?: string | null
          teacher_id?: string
          visible_to_student?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_slots: {
        Row: {
          created_at: string | null
          currency: string
          ends_at: string
          id: string
          price_sek: number
          starts_at: string
          status: string
          teacher_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string
          ends_at: string
          id?: string
          price_sek?: number
          starts_at: string
          status?: string
          teacher_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string
          ends_at?: string
          id?: string
          price_sek?: number
          starts_at?: string
          status?: string
          teacher_id?: string
        }
        Relationships: []
      }
      booking_teacher_access: {
        Row: {
          access_ends_at: string | null
          access_starts_at: string
          booking_id: string
          created_at: string | null
          id: string
          revoked_at: string | null
          student_id: string
          teacher_id: string
        }
        Insert: {
          access_ends_at?: string | null
          access_starts_at?: string
          booking_id: string
          created_at?: string | null
          id?: string
          revoked_at?: string | null
          student_id: string
          teacher_id: string
        }
        Update: {
          access_ends_at?: string | null
          access_starts_at?: string
          booking_id?: string
          created_at?: string | null
          id?: string
          revoked_at?: string | null
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_teacher_access_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          calendar_event_id: string | null
          calendar_id: string | null
          calendar_sync_error: string | null
          calendar_sync_status: string
          calendar_synced_at: string | null
          confirmed_at: string | null
          consent_history: boolean | null
          consent_payment: boolean | null
          created_at: string | null
          id: string
          meet_link: string | null
          price_sek: number | null
          slot_id: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          student_goal: string | null
          student_id: string
          student_timezone: string | null
          teacher_id: string
          total_sek: number | null
          vat_sek: number | null
        }
        Insert: {
          calendar_event_id?: string | null
          calendar_id?: string | null
          calendar_sync_error?: string | null
          calendar_sync_status?: string
          calendar_synced_at?: string | null
          confirmed_at?: string | null
          consent_history?: boolean | null
          consent_payment?: boolean | null
          created_at?: string | null
          id?: string
          meet_link?: string | null
          price_sek?: number | null
          slot_id: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          student_goal?: string | null
          student_id: string
          student_timezone?: string | null
          teacher_id: string
          total_sek?: number | null
          vat_sek?: number | null
        }
        Update: {
          calendar_event_id?: string | null
          calendar_id?: string | null
          calendar_sync_error?: string | null
          calendar_sync_status?: string
          calendar_synced_at?: string | null
          confirmed_at?: string | null
          consent_history?: boolean | null
          consent_payment?: boolean | null
          created_at?: string | null
          id?: string
          meet_link?: string | null
          price_sek?: number | null
          slot_id?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          student_goal?: string | null
          student_id?: string
          student_timezone?: string | null
          teacher_id?: string
          total_sek?: number | null
          vat_sek?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "booking_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      chats_profesor: {
        Row: {
          created_at: string
          id: string
          profesor_id: string
          titulo: string
        }
        Insert: {
          created_at?: string
          id?: string
          profesor_id: string
          titulo: string
        }
        Update: {
          created_at?: string
          id?: string
          profesor_id?: string
          titulo?: string
        }
        Relationships: []
      }
      comentarios_profesor: {
        Row: {
          contenido: string
          created_at: string
          evaluacion_id: string
          id: string
          profesor_id: string
          updated_at: string
        }
        Insert: {
          contenido: string
          created_at?: string
          evaluacion_id: string
          id?: string
          profesor_id: string
          updated_at?: string
        }
        Update: {
          contenido?: string
          created_at?: string
          evaluacion_id?: string
          id?: string
          profesor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_profesor_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluaciones: {
        Row: {
          analisis_estudiante: string
          areas_mejora: string | null
          banda_a: number
          banda_b: number
          banda_c: number
          banda_d: number
          comentario_global: string | null
          conclusion: Json | null
          created_at: string
          ensayo_banda_5: Json | null
          fortalezas: string | null
          id: string
          introduccion: Json | null
          justificacion_a: string | null
          justificacion_b: string | null
          justificacion_c: string | null
          justificacion_d: string | null
          lenguaje_analitico: Json | null
          nota_ib: number | null
          parrafos: Json | null
          pregunta_orientacion: string
          puntuacion_total: number | null
          sugerencias_reescritura: Json | null
          texto_literario: string
          user_id: string
        }
        Insert: {
          analisis_estudiante: string
          areas_mejora?: string | null
          banda_a: number
          banda_b: number
          banda_c: number
          banda_d: number
          comentario_global?: string | null
          conclusion?: Json | null
          created_at?: string
          ensayo_banda_5?: Json | null
          fortalezas?: string | null
          id?: string
          introduccion?: Json | null
          justificacion_a?: string | null
          justificacion_b?: string | null
          justificacion_c?: string | null
          justificacion_d?: string | null
          lenguaje_analitico?: Json | null
          nota_ib?: number | null
          parrafos?: Json | null
          pregunta_orientacion: string
          puntuacion_total?: number | null
          sugerencias_reescritura?: Json | null
          texto_literario: string
          user_id: string
        }
        Update: {
          analisis_estudiante?: string
          areas_mejora?: string | null
          banda_a?: number
          banda_b?: number
          banda_c?: number
          banda_d?: number
          comentario_global?: string | null
          conclusion?: Json | null
          created_at?: string
          ensayo_banda_5?: Json | null
          fortalezas?: string | null
          id?: string
          introduccion?: Json | null
          justificacion_a?: string | null
          justificacion_b?: string | null
          justificacion_c?: string | null
          justificacion_d?: string | null
          lenguaje_analitico?: Json | null
          nota_ib?: number | null
          parrafos?: Json | null
          pregunta_orientacion?: string
          puntuacion_total?: number | null
          sugerencias_reescritura?: Json | null
          texto_literario?: string
          user_id?: string
        }
        Relationships: []
      }
      evaluaciones_oral: {
        Row: {
          areas_mejora: string | null
          asunto_global: string
          comentario_global: string | null
          created_at: string
          criterio_a: number
          criterio_b: number
          criterio_c: number
          criterio_d: number
          diagnostico_asunto_global: Json | null
          diagnostico_equilibrio: Json | null
          diagnostico_estructura: Json | null
          duracion_estimada_minutos: number | null
          es_simulacion: boolean
          extracto_1: string | null
          extracto_2: string | null
          fortalezas: string | null
          guion_oral: string
          id: string
          justificacion_a: string | null
          justificacion_b: string | null
          justificacion_c: string | null
          justificacion_d: string | null
          notas_obra_1: string | null
          notas_obra_2: string | null
          obra_1_autor: string | null
          obra_1_tipo: string
          obra_1_titulo: string
          obra_2_autor: string | null
          obra_2_tipo: string
          obra_2_titulo: string
          preguntas_profesor: Json | null
          puntuacion_total: number | null
          tipo_oral: string
          user_id: string
          zonas_desarrollo_self_taught: Json | null
        }
        Insert: {
          areas_mejora?: string | null
          asunto_global: string
          comentario_global?: string | null
          created_at?: string
          criterio_a: number
          criterio_b: number
          criterio_c: number
          criterio_d: number
          diagnostico_asunto_global?: Json | null
          diagnostico_equilibrio?: Json | null
          diagnostico_estructura?: Json | null
          duracion_estimada_minutos?: number | null
          es_simulacion?: boolean
          extracto_1?: string | null
          extracto_2?: string | null
          fortalezas?: string | null
          guion_oral: string
          id?: string
          justificacion_a?: string | null
          justificacion_b?: string | null
          justificacion_c?: string | null
          justificacion_d?: string | null
          notas_obra_1?: string | null
          notas_obra_2?: string | null
          obra_1_autor?: string | null
          obra_1_tipo: string
          obra_1_titulo: string
          obra_2_autor?: string | null
          obra_2_tipo: string
          obra_2_titulo: string
          preguntas_profesor?: Json | null
          puntuacion_total?: number | null
          tipo_oral: string
          user_id: string
          zonas_desarrollo_self_taught?: Json | null
        }
        Update: {
          areas_mejora?: string | null
          asunto_global?: string
          comentario_global?: string | null
          created_at?: string
          criterio_a?: number
          criterio_b?: number
          criterio_c?: number
          criterio_d?: number
          diagnostico_asunto_global?: Json | null
          diagnostico_equilibrio?: Json | null
          diagnostico_estructura?: Json | null
          duracion_estimada_minutos?: number | null
          es_simulacion?: boolean
          extracto_1?: string | null
          extracto_2?: string | null
          fortalezas?: string | null
          guion_oral?: string
          id?: string
          justificacion_a?: string | null
          justificacion_b?: string | null
          justificacion_c?: string | null
          justificacion_d?: string | null
          notas_obra_1?: string | null
          notas_obra_2?: string | null
          obra_1_autor?: string | null
          obra_1_tipo?: string
          obra_1_titulo?: string
          obra_2_autor?: string | null
          obra_2_tipo?: string
          obra_2_titulo?: string
          preguntas_profesor?: Json | null
          puntuacion_total?: number | null
          tipo_oral?: string
          user_id?: string
          zonas_desarrollo_self_taught?: Json | null
        }
        Relationships: []
      }
      evaluaciones_prueba2: {
        Row: {
          anotaciones: Json | null
          areas_mejora: string | null
          comentario_global: string | null
          created_at: string
          criterio_a: number
          criterio_b1: number
          criterio_b2: number
          criterio_c: number
          criterio_d: number
          diagnostico_comparativo: Json | null
          ensayo_banda_5: Json | null
          ensayo_estudiante: string
          fortalezas: string | null
          id: string
          justificacion_a: string | null
          justificacion_b1: string | null
          justificacion_b2: string | null
          justificacion_c: string | null
          justificacion_d: string | null
          notas_obra_1: string | null
          notas_obra_2: string | null
          obra_1: string
          obra_2: string
          pregunta: string
          puntuacion_total: number | null
          sugerencias_reescritura: Json | null
          user_id: string
        }
        Insert: {
          anotaciones?: Json | null
          areas_mejora?: string | null
          comentario_global?: string | null
          created_at?: string
          criterio_a: number
          criterio_b1: number
          criterio_b2: number
          criterio_c: number
          criterio_d: number
          diagnostico_comparativo?: Json | null
          ensayo_banda_5?: Json | null
          ensayo_estudiante: string
          fortalezas?: string | null
          id?: string
          justificacion_a?: string | null
          justificacion_b1?: string | null
          justificacion_b2?: string | null
          justificacion_c?: string | null
          justificacion_d?: string | null
          notas_obra_1?: string | null
          notas_obra_2?: string | null
          obra_1: string
          obra_2: string
          pregunta: string
          puntuacion_total?: number | null
          sugerencias_reescritura?: Json | null
          user_id: string
        }
        Update: {
          anotaciones?: Json | null
          areas_mejora?: string | null
          comentario_global?: string | null
          created_at?: string
          criterio_a?: number
          criterio_b1?: number
          criterio_b2?: number
          criterio_c?: number
          criterio_d?: number
          diagnostico_comparativo?: Json | null
          ensayo_banda_5?: Json | null
          ensayo_estudiante?: string
          fortalezas?: string | null
          id?: string
          justificacion_a?: string | null
          justificacion_b1?: string | null
          justificacion_b2?: string | null
          justificacion_c?: string | null
          justificacion_d?: string | null
          notas_obra_1?: string | null
          notas_obra_2?: string | null
          obra_1?: string
          obra_2?: string
          pregunta?: string
          puntuacion_total?: number | null
          sugerencias_reescritura?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      llm_precios: {
        Row: {
          modelo: string
          precio_entrada_por_millon: number
          precio_salida_por_millon: number
          updated_at: string
        }
        Insert: {
          modelo: string
          precio_entrada_por_millon: number
          precio_salida_por_millon: number
          updated_at?: string
        }
        Update: {
          modelo?: string
          precio_entrada_por_millon?: number
          precio_salida_por_millon?: number
          updated_at?: string
        }
        Relationships: []
      }
      llm_uso: {
        Row: {
          cache_creation_tokens: number
          cache_read_tokens: number
          created_at: string
          edge_function: string
          id: string
          modelo: string
          tokens_entrada: number
          tokens_salida: number
          user_id: string | null
        }
        Insert: {
          cache_creation_tokens?: number
          cache_read_tokens?: number
          created_at?: string
          edge_function: string
          id?: string
          modelo: string
          tokens_entrada: number
          tokens_salida: number
          user_id?: string | null
        }
        Update: {
          cache_creation_tokens?: number
          cache_read_tokens?: number
          created_at?: string
          edge_function?: string
          id?: string
          modelo?: string
          tokens_entrada?: number
          tokens_salida?: number
          user_id?: string | null
        }
        Relationships: []
      }
      mensajes_chat_profesor: {
        Row: {
          chat_id: string | null
          contenido: string
          created_at: string
          id: string
          profesor_id: string
          rol: string
        }
        Insert: {
          chat_id?: string | null
          contenido: string
          created_at?: string
          id?: string
          profesor_id: string
          rol: string
        }
        Update: {
          chat_id?: string | null
          contenido?: string
          created_at?: string
          id?: string
          profesor_id?: string
          rol?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_chat_profesor_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats_profesor"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean
          banda_inicial_a: number | null
          banda_inicial_b: number | null
          banda_inicial_c: number | null
          banda_inicial_d: number | null
          codigo_clase: string | null
          confianza_a: number | null
          confianza_b: number | null
          confianza_c: number | null
          confianza_d: number | null
          created_at: string
          diagnostico_completado: boolean | null
          email: string | null
          fecha_examen: string | null
          generos_comodos: string[] | null
          horas_semanales: number | null
          movimientos_conocidos: string[] | null
          nota_objetivo: number | null
          paso_onboarding: number | null
          profesor_id: string | null
          rol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activo?: boolean
          banda_inicial_a?: number | null
          banda_inicial_b?: number | null
          banda_inicial_c?: number | null
          banda_inicial_d?: number | null
          codigo_clase?: string | null
          confianza_a?: number | null
          confianza_b?: number | null
          confianza_c?: number | null
          confianza_d?: number | null
          created_at?: string
          diagnostico_completado?: boolean | null
          email?: string | null
          fecha_examen?: string | null
          generos_comodos?: string[] | null
          horas_semanales?: number | null
          movimientos_conocidos?: string[] | null
          nota_objetivo?: number | null
          paso_onboarding?: number | null
          profesor_id?: string | null
          rol?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activo?: boolean
          banda_inicial_a?: number | null
          banda_inicial_b?: number | null
          banda_inicial_c?: number | null
          banda_inicial_d?: number | null
          codigo_clase?: string | null
          confianza_a?: number | null
          confianza_b?: number | null
          confianza_c?: number | null
          confianza_d?: number | null
          created_at?: string
          diagnostico_completado?: boolean | null
          email?: string | null
          fecha_examen?: string | null
          generos_comodos?: string[] | null
          horas_semanales?: number | null
          movimientos_conocidos?: string[] | null
          nota_objetivo?: number | null
          paso_onboarding?: number | null
          profesor_id?: string | null
          rol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planes_estudio: {
        Row: {
          activo: boolean | null
          enfoque_principal: string
          generado_at: string
          id: string
          preliminar: boolean | null
          resumen_diagnostico: string
          semanas_totales: number
          user_id: string
        }
        Insert: {
          activo?: boolean | null
          enfoque_principal: string
          generado_at?: string
          id?: string
          preliminar?: boolean | null
          resumen_diagnostico: string
          semanas_totales: number
          user_id: string
        }
        Update: {
          activo?: boolean | null
          enfoque_principal?: string
          generado_at?: string
          id?: string
          preliminar?: boolean | null
          resumen_diagnostico?: string
          semanas_totales?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tareas_plan: {
        Row: {
          completada: boolean | null
          completada_at: string | null
          created_at: string
          criterio_objetivo: string | null
          descripcion: string
          duracion_estimada_min: number
          id: string
          plan_id: string
          semana: number
          tipo: string
          titulo: string
        }
        Insert: {
          completada?: boolean | null
          completada_at?: string | null
          created_at?: string
          criterio_objetivo?: string | null
          descripcion: string
          duracion_estimada_min: number
          id?: string
          plan_id: string
          semana: number
          tipo: string
          titulo: string
        }
        Update: {
          completada?: boolean | null
          completada_at?: string | null
          created_at?: string
          criterio_objetivo?: string | null
          descripcion?: string
          duracion_estimada_min?: number
          id?: string
          plan_id?: string
          semana?: number
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_plan_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "planes_estudio"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_profiles: {
        Row: {
          activo: boolean | null
          bio: string | null
          calendar_email: string | null
          created_at: string | null
          credenciales: string | null
          es_estandarizador_ib: boolean | null
          id: string
          idiomas: string[] | null
          nombre: string
          timezone: string | null
          user_id: string
        }
        Insert: {
          activo?: boolean | null
          bio?: string | null
          calendar_email?: string | null
          created_at?: string | null
          credenciales?: string | null
          es_estandarizador_ib?: boolean | null
          id?: string
          idiomas?: string[] | null
          nombre?: string
          timezone?: string | null
          user_id: string
        }
        Update: {
          activo?: boolean | null
          bio?: string | null
          calendar_email?: string | null
          created_at?: string | null
          credenciales?: string | null
          es_estandarizador_ib?: boolean | null
          id?: string
          idiomas?: string[] | null
          nombre?: string
          timezone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      textos_biblioteca: {
        Row: {
          autor: string
          created_at: string
          epoca: string
          forma_literaria: string
          fragmento: string
          id: string
          marco_analisis: string
          movimiento: string
          orden: number
          pregunta_orientacion: string
          titulo: string
        }
        Insert: {
          autor: string
          created_at?: string
          epoca: string
          forma_literaria: string
          fragmento: string
          id?: string
          marco_analisis: string
          movimiento: string
          orden?: number
          pregunta_orientacion: string
          titulo: string
        }
        Update: {
          autor?: string
          created_at?: string
          epoca?: string
          forma_literaria?: string
          fragmento?: string
          id?: string
          marco_analisis?: string
          movimiento?: string
          orden?: number
          pregunta_orientacion?: string
          titulo?: string
        }
        Relationships: []
      }
      textos_vistos: {
        Row: {
          created_at: string
          id: string
          texto_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          texto_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          texto_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "textos_vistos_texto_id_fkey"
            columns: ["texto_id"]
            isOneToOne: false
            referencedRelation: "textos_biblioteca"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_mis_alumnos: {
        Args: never
        Returns: {
          banda_a_media: number
          banda_b_media: number
          banda_c_media: number
          banda_d_media: number
          email: string
          nota_ib_media: number
          num_evaluaciones: number
          ultima_evaluacion: string
          user_id: string
        }[]
      }
      has_active_role: {
        Args: { p_rol?: string; p_user_id: string }
        Returns: boolean
      }
      replace_study_plan: {
        Args: {
          p_enfoque_principal: string
          p_preliminar: boolean
          p_resumen_diagnostico: string
          p_semanas_totales: number
          p_tareas: Json
        }
        Returns: string
      }
      reservar_cuota_evaluacion: {
        Args: { p_limite: number; p_user_id: string }
        Returns: string
      }
      reservar_cuota_oral: {
        Args: { p_limite: number; p_user_id: string }
        Returns: string
      }
      reservar_cuota_prueba2: {
        Args: { p_limite: number; p_user_id: string }
        Returns: string
      }
      salir_de_clase: { Args: never; Returns: undefined }
      teacher_has_active_access: {
        Args: { p_student_id: string; p_teacher_id: string }
        Returns: boolean
      }
      unirse_a_clase: { Args: { p_codigo: string }; Returns: string }
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
  public: {
    Enums: {},
  },
} as const
