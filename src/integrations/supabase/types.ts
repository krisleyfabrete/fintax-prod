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
      accounts: {
        Row: {
          balance: number | null
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_archived: boolean | null
          is_shared_with_family: boolean | null
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          balance?: number | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          is_shared_with_family?: boolean | null
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          balance?: number | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          is_shared_with_family?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_name: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_name: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_name?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      brokers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          id: string
          is_shared_with_family: boolean | null
          month: number
          updated_at: string | null
          user_id: string | null
          year: number
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_shared_with_family?: boolean | null
          month: number
          updated_at?: string | null
          user_id?: string | null
          year: number
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_shared_with_family?: boolean | null
          month?: number
          updated_at?: string | null
          user_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string | null
        }
        Relationships: []
      }
      debts: {
        Row: {
          allows_early_payment: boolean | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          creditor: string
          description: string | null
          due_date: string | null
          has_interest: boolean | null
          has_penalty: boolean | null
          household_id: string | null
          id: string
          installment_amount: number | null
          installment_count: number | null
          installment_enabled: boolean | null
          interest_rate: number | null
          interest_type: Database["public"]["Enums"]["debt_interest_type"] | null
          lump_sum_settlement_amount: number | null
          name: string
          notes: string | null
          original_amount: number
          owner_id: string | null
          paid_amount: number | null
          paid_percentage: number | null
          penalty_rate: number | null
          priority: Database["public"]["Enums"]["debt_priority"] | null
          remaining_amount: number | null
          responsible_user_id: string | null
          settled_at: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["debt_status"] | null
          updated_at: string | null
          user_id: string
          visibility: Database["public"]["Enums"]["debt_visibility"] | null
        }
        Insert: {
          allows_early_payment?: boolean | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          creditor: string
          description?: string | null
          due_date?: string | null
          has_interest?: boolean | null
          has_penalty?: boolean | null
          household_id?: string | null
          id?: string
          installment_amount?: number | null
          installment_count?: number | null
          installment_enabled?: boolean | null
          interest_rate?: number | null
          interest_type?: Database["public"]["Enums"]["debt_interest_type"] | null
          lump_sum_settlement_amount?: number | null
          name: string
          notes?: string | null
          original_amount: number
          owner_id?: string | null
          paid_amount?: number | null
          paid_percentage?: number | null
          penalty_rate?: number | null
          priority?: Database["public"]["Enums"]["debt_priority"] | null
          remaining_amount?: number | null
          responsible_user_id?: string | null
          settled_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["debt_status"] | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: Database["public"]["Enums"]["debt_visibility"] | null
        }
        Update: {
          allows_early_payment?: boolean | null
          category_id?: string | null
          creditor?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          has_interest?: boolean | null
          has_penalty?: boolean | null
          household_id?: string | null
          id?: string
          installment_amount?: number | null
          installment_count?: number | null
          installment_enabled?: boolean | null
          interest_rate?: number | null
          interest_type?: Database["public"]["Enums"]["debt_interest_type"] | null
          lump_sum_settlement_amount?: number | null
          name?: string
          notes?: string | null
          original_amount?: number
          owner_id?: string | null
          paid_amount?: number | null
          paid_percentage?: number | null
          penalty_rate?: number | null
          priority?: Database["public"]["Enums"]["debt_priority"] | null
          remaining_amount?: number | null
          responsible_user_id?: string | null
          settled_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["debt_status"] | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: Database["public"]["Enums"]["debt_visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "debts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debts_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      downgrade_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          current_plan: Database["public"]["Enums"]["subscription_plan"] | null
          from_plan: Database["public"]["Enums"]["subscription_plan"] | null
          id: string
          processed_at: string | null
          reason: string | null
          requested_at: string | null
          requested_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          status: string | null
          to_plan: Database["public"]["Enums"]["subscription_plan"] | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          current_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          from_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          id?: string
          processed_at?: string | null
          reason?: string | null
          requested_at?: string | null
          requested_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          status?: string | null
          to_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          current_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          from_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          id?: string
          processed_at?: string | null
          reason?: string | null
          requested_at?: string | null
          requested_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          status?: string | null
          to_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      family_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          invite_code: string | null
          name: string
          owner_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          invite_code?: string | null
          name: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          invite_code?: string | null
          name?: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      family_members: {
        Row: {
          created_at: string | null
          group_id: string | null
          id: string
          joined_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      family_pending_invites: {
        Row: {
          created_at: string | null
          email: string
          group_id: string | null
          id: string
          invited_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          group_id?: string | null
          id?: string
          invited_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          group_id?: string | null
          id?: string
          invited_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_pending_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_auto_deposits: {
        Row: {
          account_id: string | null
          active: boolean | null
          amount: number
          created_at: string | null
          day_of_month: number | null
          frequency: string
          goal_id: string | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          last_run_at: string | null
          next_execution_at: string | null
          next_run_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          active?: boolean | null
          amount: number
          created_at?: string | null
          day_of_month?: number | null
          frequency: string
          goal_id?: string | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          last_run_at?: string | null
          next_execution_at?: string | null
          next_run_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          active?: boolean | null
          amount?: number
          created_at?: string | null
          day_of_month?: number | null
          frequency?: string
          goal_id?: string | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          last_run_at?: string | null
          next_execution_at?: string | null
          next_run_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_auto_deposits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_auto_deposits_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_reminders: {
        Row: {
          active: boolean | null
          created_at: string | null
          day_of_month: number | null
          day_of_week: number | null
          frequency: string
          goal_id: string | null
          id: string
          is_active: boolean | null
          next_reminder_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          frequency: string
          goal_id?: string | null
          id?: string
          is_active?: boolean | null
          next_reminder_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          goal_id?: string | null
          id?: string
          is_active?: boolean | null
          next_reminder_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_reminders_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category_id: string | null
          created_at: string | null
          current_amount: number | null
          description: string | null
          end_date: string | null
          goal_type: string | null
          id: string
          is_active: boolean | null
          name: string
          period_type: string | null
          start_date: string | null
          status: string | null
          target_amount: number
          target_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          current_amount?: number | null
          description?: string | null
          end_date?: string | null
          goal_type?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          period_type?: string | null
          start_date?: string | null
          status?: string | null
          target_amount: number
          target_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          current_amount?: number | null
          description?: string | null
          end_date?: string | null
          goal_type?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          period_type?: string | null
          start_date?: string | null
          status?: string | null
          target_amount?: number
          target_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_portfolios: {
        Row: {
          broker_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          shared_with_family: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          broker_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          shared_with_family?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          broker_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          shared_with_family?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investment_portfolios_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_price_history: {
        Row: {
          created_at: string | null
          date: string
          id: string
          price: number
          ticker: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          price: number
          ticker: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          price?: number
          ticker?: string
        }
        Relationships: []
      }
      investment_snapshots: {
        Row: {
          created_at: string | null
          id: string
          portfolio_id: string | null
          snapshot_date: string
          total_value: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          portfolio_id?: string | null
          snapshot_date: string
          total_value?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          portfolio_id?: string | null
          snapshot_date?: string
          total_value?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investment_snapshots_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "investment_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          created_at: string | null
          current_price: number | null
          id: string
          name: string | null
          notes: string | null
          portfolio_id: string | null
          purchase_date: string | null
          purchase_price: number | null
          quantity: number
          ticker: string
          type: Database["public"]["Enums"]["investment_type"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_price?: number | null
          id?: string
          name?: string | null
          notes?: string | null
          portfolio_id?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity: number
          ticker: string
          type: Database["public"]["Enums"]["investment_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_price?: number | null
          id?: string
          name?: string | null
          notes?: string | null
          portfolio_id?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number
          ticker?: string
          type?: Database["public"]["Enums"]["investment_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investments_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "investment_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pix_payments: {
        Row: {
          amount: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          expiration_date: string | null
          id: string
          interval: string | null
          notes: string | null
          pix_code: string | null
          pix_qr_code: string | null
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          status: Database["public"]["Enums"]["pix_payment_status"] | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          interval?: string | null
          notes?: string | null
          pix_code?: string | null
          pix_qr_code?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          status?: Database["public"]["Enums"]["pix_payment_status"] | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          interval?: string | null
          notes?: string | null
          pix_code?: string | null
          pix_qr_code?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          status?: Database["public"]["Enums"]["pix_payment_status"] | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          brapi_api_key: string | null
          cpf: string | null
          created_at: string | null
          currency: string | null
          date_format: string | null
          full_name: string | null
          id: string
          phone: string | null
          rg: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          brapi_api_key?: string | null
          cpf?: string | null
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          rg?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          brapi_api_key?: string | null
          cpf?: string | null
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          rg?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string | null
        }
        Relationships: []
      }
      quote_cache: {
        Row: {
          data: Json | null
          id: string
          price: number | null
          ticker: string
          updated_at: string | null
        }
        Insert: {
          data?: Json | null
          id?: string
          price?: number | null
          ticker: string
          updated_at?: string | null
        }
        Update: {
          data?: Json | null
          id?: string
          price?: number | null
          ticker?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_grace_license: boolean | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_grace_license?: boolean | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_grace_license?: boolean | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_seen_at: string | null
          created_at: string | null
          description: string | null
          id: string
          priority: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_seen_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_seen_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          is_admin: boolean | null
          message: string
          sender_id: string | null
          ticket_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message: string
          sender_id?: string | null
          ticket_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message?: string
          sender_id?: string | null
          ticket_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string | null
          date: string
          debt_id: string | null
          description: string
          id: string
          is_paid: boolean | null
          is_shared_with_family: boolean | null
          notes: string | null
          receipt_url: string | null
          recurrence: Database["public"]["Enums"]["recurrence_type"] | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          subcategory_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string | null
          date?: string
          debt_id?: string | null
          description: string
          id?: string
          is_paid?: boolean | null
          is_shared_with_family?: boolean | null
          notes?: string | null
          receipt_url?: string | null
          recurrence?: Database["public"]["Enums"]["recurrence_type"] | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          subcategory_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string | null
          date?: string
          debt_id?: string | null
          description?: string
          id?: string
          is_paid?: boolean | null
          is_shared_with_family?: boolean | null
          notes?: string | null
          receipt_url?: string | null
          recurrence?: Database["public"]["Enums"]["recurrence_type"] | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          subcategory_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          is_super_admin: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_super_admin?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_super_admin?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_cpf_exists: {
        Args: { p_cpf: string; p_user_id: string }
        Returns: boolean
      }
      get_group_by_invite_code: {
        Args: { code: string }
        Returns: {
          created_at: string | null
          description: string | null
          id: string
          invite_code: string | null
          name: string
          owner_id: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "family_groups"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_group_owner_by_code: {
        Args: { code: string }
        Returns: {
          group_id: string
          owner_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_details: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      account_type:
        | "checking"
        | "savings"
        | "credit_card"
        | "cash"
        | "investment"
        | "other"
      app_role: "user" | "premium" | "admin"
      investment_type:
        | "stock"
        | "fii"
        | "crypto"
        | "fixed_income"
        | "treasury"
        | "etf"
        | "bdr"
        | "other"
      pix_payment_status: "pending" | "confirmed" | "rejected"
      recurrence_type: "none" | "daily" | "weekly" | "monthly" | "yearly"
      subscription_plan: "free" | "pro" | "family"
      subscription_status: "active" | "overdue" | "canceled" | "expired"
      transaction_status: "pending" | "confirmed"
      transaction_type: "income" | "expense"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type: [
        "checking",
        "savings",
        "credit_card",
        "cash",
        "investment",
        "other",
      ],
      app_role: ["user", "premium", "admin"],
      investment_type: [
        "stock",
        "fii",
        "crypto",
        "fixed_income",
        "treasury",
        "etf",
        "bdr",
        "other",
      ],
      pix_payment_status: ["pending", "confirmed", "rejected"],
      recurrence_type: ["none", "daily", "weekly", "monthly", "yearly"],
      subscription_plan: ["free", "pro", "family"],
      subscription_status: ["active", "overdue", "canceled", "expired"],
      transaction_status: ["pending", "confirmed"],
      transaction_type: ["income", "expense"],
      debt_visibility: ["private", "shared", "household"],
      debt_interest_type: ["monthly", "annual", "fixed", "unknown"],
      debt_priority: ["low", "medium", "high", "critical"],
      debt_status: ["open", "negotiating", "installment", "overdue", "paid", "canceled"],
    },
  },
} as const
