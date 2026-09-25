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
      badges: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          tier: string
        }
        Insert: {
          created_at?: string
          description: string
          icon?: string
          id: string
          name: string
          tier?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          tier?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      blueprint_phases: {
        Row: {
          created_at: string
          focus: string[]
          is_active: boolean
          key: string
          name: string
          required_level: number
          required_xp: number
          sort_order: number
          tagline: string
          tier: string
        }
        Insert: {
          created_at?: string
          focus?: string[]
          is_active?: boolean
          key: string
          name: string
          required_level?: number
          required_xp?: number
          sort_order?: number
          tagline: string
          tier: string
        }
        Update: {
          created_at?: string
          focus?: string[]
          is_active?: boolean
          key?: string
          name?: string
          required_level?: number
          required_xp?: number
          sort_order?: number
          tagline?: string
          tier?: string
        }
        Relationships: []
      }
      blueprint_sessions: {
        Row: {
          completed_at: string
          created_at: string
          duration_min: number | null
          exercise_logs: Json
          id: string
          phase_key: string
          total_volume: number
          user_id: string
          workout_id: string | null
          workout_key: string
          workout_name: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          duration_min?: number | null
          exercise_logs?: Json
          id?: string
          phase_key: string
          total_volume?: number
          user_id: string
          workout_id?: string | null
          workout_key: string
          workout_name: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          duration_min?: number | null
          exercise_logs?: Json
          id?: string
          phase_key?: string
          total_volume?: number
          user_id?: string
          workout_id?: string | null
          workout_key?: string
          workout_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          completed: boolean
          completed_at: string | null
          id: string
          joined_at: string
          progress: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          joined_at?: string
          progress?: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          joined_at?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          badge_id: string | null
          cadence: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          metric: string
          target_value: number
          title: string
          xp_reward: number
        }
        Insert: {
          badge_id?: string | null
          cadence: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          is_active?: boolean
          metric: string
          target_value: number
          title: string
          xp_reward?: number
        }
        Update: {
          badge_id?: string | null
          cadence?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          metric?: string
          target_value?: number
          title?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          milestone_label: string | null
          photo_url: string | null
          post_type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          milestone_label?: string | null
          photo_url?: string | null
          post_type?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          milestone_label?: string | null
          photo_url?: string | null
          post_type?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_message_id: string | null
          muted: boolean
          unread_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_message_id?: string | null
          muted?: boolean
          unread_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_message_id?: string | null
          muted?: boolean
          unread_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          archived_by_1: boolean
          archived_by_2: boolean
          blocked_by_1: boolean
          blocked_by_2: boolean
          created_at: string
          id: string
          last_message_at: string | null
          updated_at: string
          user_id_1: string
          user_id_2: string
        }
        Insert: {
          archived_by_1?: boolean
          archived_by_2?: boolean
          blocked_by_1?: boolean
          blocked_by_2?: boolean
          created_at?: string
          id?: string
          last_message_at?: string | null
          updated_at?: string
          user_id_1: string
          user_id_2: string
        }
        Update: {
          archived_by_1?: boolean
          archived_by_2?: boolean
          blocked_by_1?: boolean
          blocked_by_2?: boolean
          created_at?: string
          id?: string
          last_message_at?: string | null
          updated_at?: string
          user_id_1?: string
          user_id_2?: string
        }
        Relationships: []
      }
      discipline_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          id: string
          items: Json
          updated_at: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          checkin_date?: string
          created_at?: string
          id?: string
          items?: Json
          updated_at?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          checkin_date?: string
          created_at?: string
          id?: string
          items?: Json
          updated_at?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      ethan_memories: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          importance: number
          last_referenced_at: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          importance?: number
          last_referenced_at?: string | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          importance?: number
          last_referenced_at?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ethan_memory_summaries: {
        Row: {
          covered_through: string | null
          key_facts: Json
          message_count: number
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          covered_through?: string | null
          key_facts?: Json
          message_count?: number
          summary?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          covered_through?: string | null
          key_facts?: Json
          message_count?: number
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ethan_messages: {
        Row: {
          archived: boolean
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          archived?: boolean
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          fat_g: number
          food_name: string
          id: string
          log_date: string
          meal_type: string
          protein_g: number
          serving_size: string | null
          user_id: string
        }
        Insert: {
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          food_name: string
          id?: string
          log_date?: string
          meal_type: string
          protein_g?: number
          serving_size?: string | null
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          food_name?: string
          id?: string
          log_date?: string
          meal_type?: string
          protein_g?: number
          serving_size?: string | null
          user_id?: string
        }
        Relationships: []
      }
      foods: {
        Row: {
          brand: string | null
          calories: number
          carbs_g: number
          country: string | null
          created_at: string
          created_by: string | null
          cuisine: string
          fat_g: number
          id: string
          is_public: boolean
          name: string
          protein_g: number
          serving_size: string
        }
        Insert: {
          brand?: string | null
          calories?: number
          carbs_g?: number
          country?: string | null
          created_at?: string
          created_by?: string | null
          cuisine?: string
          fat_g?: number
          id?: string
          is_public?: boolean
          name: string
          protein_g?: number
          serving_size?: string
        }
        Update: {
          brand?: string | null
          calories?: number
          carbs_g?: number
          country?: string | null
          created_at?: string
          created_by?: string | null
          cuisine?: string
          fat_g?: number
          id?: string
          is_public?: boolean
          name?: string
          protein_g?: number
          serving_size?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          discipline_score: number | null
          energy_level: number | null
          id: string
          mood: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          discipline_score?: number | null
          energy_level?: number | null
          id?: string
          mood?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          discipline_score?: number | null
          energy_level?: number | null
          id?: string
          mood?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      measurements: {
        Row: {
          arms_cm: number | null
          body_fat: number | null
          chest_cm: number | null
          created_at: string
          id: string
          recorded_at: string
          thighs_cm: number | null
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          arms_cm?: number | null
          body_fat?: number | null
          chest_cm?: number | null
          created_at?: string
          id?: string
          recorded_at?: string
          thighs_cm?: number | null
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          arms_cm?: number | null
          body_fat?: number | null
          chest_cm?: number | null
          created_at?: string
          id?: string
          recorded_at?: string
          thighs_cm?: number | null
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_data: Json | null
          attachment_type: string | null
          content: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          edited_at: string | null
          id: string
          image_height: number | null
          image_size_bytes: number | null
          image_storage_path: string | null
          image_url: string | null
          image_width: number | null
          message_type: string
          metadata: Json
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachment_data?: Json | null
          attachment_type?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          edited_at?: string | null
          id?: string
          image_height?: number | null
          image_size_bytes?: number | null
          image_storage_path?: string | null
          image_url?: string | null
          image_width?: number | null
          message_type?: string
          metadata?: Json
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachment_data?: Json | null
          attachment_type?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          edited_at?: string | null
          id?: string
          image_height?: number | null
          image_size_bytes?: number | null
          image_storage_path?: string | null
          image_url?: string | null
          image_width?: number | null
          message_type?: string
          metadata?: Json
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_blueprint_plans: {
        Row: {
          coaching: Json
          created_at: string
          generated_at: string
          grocery_list: Json
          id: string
          is_active: boolean
          meal_prep: Json
          meals: Json
          profile_snapshot: Json
          targets: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          coaching?: Json
          created_at?: string
          generated_at?: string
          grocery_list?: Json
          id?: string
          is_active?: boolean
          meal_prep?: Json
          meals?: Json
          profile_snapshot?: Json
          targets?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          coaching?: Json
          created_at?: string
          generated_at?: string
          grocery_list?: Json
          id?: string
          is_active?: boolean
          meal_prep?: Json
          meals?: Json
          profile_snapshot?: Json
          targets?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_blueprint_profiles: {
        Row: {
          age: number
          allergies: string[]
          budget: string
          calorie_target: number | null
          carbs_g: number | null
          cardio_frequency: string
          country: string
          created_at: string
          diet_preference: string
          fat_g: number | null
          fibre_g: number | null
          goal_type: string
          goal_weight_kg: number | null
          height_cm: number
          id: string
          intensity: string
          lifestyle: string
          meals_per_day: number
          protein_g: number | null
          sex: string
          training_days: number
          updated_at: string
          user_id: string
          water_ml: number | null
          weekly_change_kg: number | null
          weight_kg: number
        }
        Insert: {
          age: number
          allergies?: string[]
          budget?: string
          calorie_target?: number | null
          carbs_g?: number | null
          cardio_frequency?: string
          country?: string
          created_at?: string
          diet_preference?: string
          fat_g?: number | null
          fibre_g?: number | null
          goal_type: string
          goal_weight_kg?: number | null
          height_cm: number
          id?: string
          intensity?: string
          lifestyle?: string
          meals_per_day?: number
          protein_g?: number | null
          sex: string
          training_days?: number
          updated_at?: string
          user_id: string
          water_ml?: number | null
          weekly_change_kg?: number | null
          weight_kg: number
        }
        Update: {
          age?: number
          allergies?: string[]
          budget?: string
          calorie_target?: number | null
          carbs_g?: number | null
          cardio_frequency?: string
          country?: string
          created_at?: string
          diet_preference?: string
          fat_g?: number | null
          fibre_g?: number | null
          goal_type?: string
          goal_weight_kg?: number | null
          height_cm?: number
          id?: string
          intensity?: string
          lifestyle?: string
          meals_per_day?: number
          protein_g?: number | null
          sex?: string
          training_days?: number
          updated_at?: string
          user_id?: string
          water_ml?: number | null
          weekly_change_kg?: number | null
          weight_kg?: number
        }
        Relationships: []
      }
      nutrition_meal_completions: {
        Row: {
          created_at: string
          id: string
          log_date: string
          meal_index: number
          meal_name: string
          plan_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          meal_index: number
          meal_name: string
          plan_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          meal_index?: number
          meal_name?: string
          plan_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_meal_completions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_blueprint_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_profiles: {
        Row: {
          activity_level: string
          age: number
          bmr: number | null
          calorie_target: number | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          gender: string
          goal_pace: string
          goal_type: string
          goal_weight_kg: number | null
          height_cm: number
          id: string
          protein_g: number | null
          tdee: number | null
          training_days: number
          updated_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          activity_level: string
          age: number
          bmr?: number | null
          calorie_target?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          gender: string
          goal_pace?: string
          goal_type: string
          goal_weight_kg?: number | null
          height_cm: number
          id?: string
          protein_g?: number | null
          tdee?: number | null
          training_days?: number
          updated_at?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          activity_level?: string
          age?: number
          bmr?: number | null
          calorie_target?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          gender?: string
          goal_pace?: string
          goal_type?: string
          goal_weight_kg?: number | null
          height_cm?: number
          id?: string
          protein_g?: number | null
          tdee?: number | null
          training_days?: number
          updated_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      nutrition_reviews: {
        Row: {
          calorie_delta: number
          created_at: string
          id: string
          message: string
          reviewed_at: string
          user_id: string
          verdict: string
          weight_change_kg: number | null
        }
        Insert: {
          calorie_delta?: number
          created_at?: string
          id?: string
          message: string
          reviewed_at?: string
          user_id: string
          verdict: string
          weight_change_kg?: number | null
        }
        Update: {
          calorie_delta?: number
          created_at?: string
          id?: string
          message?: string
          reviewed_at?: string
          user_id?: string
          verdict?: string
          weight_change_kg?: number | null
        }
        Relationships: []
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          current_streak: number
          display_name: string | null
          experience_level: string | null
          fitness_goals: string[] | null
          id: string
          last_checkin_date: string | null
          level: number
          location_visibility: string
          longest_streak: number
          province: string | null
          rank: string
          updated_at: string
          username: string | null
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_streak?: number
          display_name?: string | null
          experience_level?: string | null
          fitness_goals?: string[] | null
          id: string
          last_checkin_date?: string | null
          level?: number
          location_visibility?: string
          longest_streak?: number
          province?: string | null
          rank?: string
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_streak?: number
          display_name?: string | null
          experience_level?: string | null
          fitness_goals?: string[] | null
          id?: string
          last_checkin_date?: string | null
          level?: number
          location_visibility?: string
          longest_streak?: number
          province?: string | null
          rank?: string
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          created_at: string
          id: string
          label: string | null
          notes: string | null
          photo_path: string
          taken_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          notes?: string | null
          photo_path: string
          taken_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          notes?: string | null
          photo_path?: string
          taken_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reported_messages: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reason: string
          reported_by: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reason: string
          reported_by: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reason?: string
          reported_by?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reported_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_meals: {
        Row: {
          claimed_at: string | null
          description: string | null
          id: string
          milestone: string
          photo_url: string | null
          title: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          description?: string | null
          id?: string
          milestone: string
          photo_url?: string | null
          title: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          description?: string | null
          id?: string
          milestone?: string
          photo_url?: string | null
          title?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      squad_join_codes: {
        Row: {
          code: string
          created_at: string
          squad_id: string
        }
        Insert: {
          code: string
          created_at?: string
          squad_id: string
        }
        Update: {
          code?: string
          created_at?: string
          squad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_join_codes_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: true
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          squad_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          squad_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          squad_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          squad_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          squad_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          squad_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_posts_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      typing_status: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_status_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          id: string
          last_seen_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_seen_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_seen_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string
          duration_min: number | null
          exercises: Json
          id: string
          name: string
          notes: string | null
          performed_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_min?: number | null
          exercises?: Json
          id?: string
          name: string
          notes?: string | null
          performed_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_min?: number | null
          exercises?: Json
          id?: string
          name?: string
          notes?: string | null
          performed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      xp_logs: {
        Row: {
          amount: number
          created_at: string
          id: string
          ref_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          ref_id?: string | null
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          ref_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_xp: {
        Args: {
          _amount: number
          _ref_id?: string
          _source: string
          _user_id: string
        }
        Returns: undefined
      }
      claim_challenge_xp: {
        Args: { _challenge_id: string }
        Returns: undefined
      }
      claim_reward_meal: { Args: { _reward_id: string }; Returns: undefined }
      create_squad: {
        Args: { _description: string; _name: string }
        Returns: {
          description: string
          id: string
          join_code: string
          name: string
        }[]
      }
      get_gymbros: {
        Args: never
        Returns: {
          avatar_url: string
          current_streak: number
          direction: string
          display_name: string
          friend_id: string
          friendship_id: string
          level: number
          longest_streak: number
          rank: string
          status: string
          username: string
          xp: number
        }[]
      }
      get_or_create_gymbro_conversation: {
        Args: { _friend_id: string }
        Returns: {
          archived_by_1: boolean
          archived_by_2: boolean
          blocked_by_1: boolean
          blocked_by_2: boolean
          created_at: string
          id: string
          last_message_at: string | null
          updated_at: string
          user_id_1: string
          user_id_2: string
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_squad_join_code: { Args: { _squad_id: string }; Returns: string }
      is_squad_member: {
        Args: { _squad_id: string; _user_id: string }
        Returns: boolean
      }
      join_squad_by_code: {
        Args: { _code: string }
        Returns: {
          name: string
          squad_id: string
        }[]
      }
      journal_stats: { Args: { _user_id: string }; Returns: Json }
      rank_for_level: { Args: { _level: number }; Returns: string }
      reconcile_xp: { Args: { _user_id?: string }; Returns: number }
      search_profiles: {
        Args: { q: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          level: number
          rank: string
          username: string
        }[]
      }
      send_nudge: {
        Args: { _friend_id: string; _message: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      toggle_discipline_habit: {
        Args: { _habit_id: string }
        Returns: undefined
      }
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
    Enums: {},
  },
} as const
