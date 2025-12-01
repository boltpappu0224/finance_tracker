export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          phone: string | null
          full_name: string | null
          avatar_url: string | null
          timezone: string
          currency: string
          plan_type: string
          plan_expires_at: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          phone?: string | null
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string
          currency?: string
          plan_type?: string
          plan_expires_at?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          phone?: string | null
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string
          currency?: string
          plan_type?: string
          plan_expires_at?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string | null
          name: string
          type: 'income' | 'expense'
          icon: string
          color: string
          parent_id: string | null
          is_system: boolean
          keywords: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          type: 'income' | 'expense'
          icon?: string
          color?: string
          parent_id?: string | null
          is_system?: boolean
          keywords?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          type?: 'income' | 'expense'
          icon?: string
          color?: string
          parent_id?: string | null
          is_system?: boolean
          keywords?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'cash' | 'bank' | 'credit_card' | 'upi' | 'investment' | 'loan' | 'other'
          provider: string | null
          account_number: string | null
          balance: number
          currency: string
          color: string
          icon: string
          is_active: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'cash' | 'bank' | 'credit_card' | 'upi' | 'investment' | 'loan' | 'other'
          provider?: string | null
          account_number?: string | null
          balance?: number
          currency?: string
          color?: string
          icon?: string
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'cash' | 'bank' | 'credit_card' | 'upi' | 'investment' | 'loan' | 'other'
          provider?: string | null
          account_number?: string | null
          balance?: number
          currency?: string
          color?: string
          icon?: string
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          category_id: string | null
          receipt_id: string | null
          amount: number
          type: 'income' | 'expense' | 'transfer'
          merchant: string | null
          description: string | null
          transaction_date: string
          tags: string[]
          source: 'manual' | 'sms' | 'ocr' | 'import' | 'api'
          raw_data: Json
          is_recurring: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          category_id?: string | null
          receipt_id?: string | null
          amount: number
          type: 'income' | 'expense' | 'transfer'
          merchant?: string | null
          description?: string | null
          transaction_date?: string
          tags?: string[]
          source?: 'manual' | 'sms' | 'ocr' | 'import' | 'api'
          raw_data?: Json
          is_recurring?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          category_id?: string | null
          receipt_id?: string | null
          amount?: number
          type?: 'income' | 'expense' | 'transfer'
          merchant?: string | null
          description?: string | null
          transaction_date?: string
          tags?: string[]
          source?: 'manual' | 'sms' | 'ocr' | 'import' | 'api'
          raw_data?: Json
          is_recurring?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          account_id: string | null
          name: string
          amount: number
          period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
          start_date: string
          end_date: string | null
          alert_at_percentage: number
          auto_adjust: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          account_id?: string | null
          name: string
          amount: number
          period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
          start_date: string
          end_date?: string | null
          alert_at_percentage?: number
          auto_adjust?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          account_id?: string | null
          name?: string
          amount?: number
          period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
          start_date?: string
          end_date?: string | null
          alert_at_percentage?: number
          auto_adjust?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          target_amount: number
          current_amount: number
          target_date: string | null
          icon: string
          color: string
          priority: number
          is_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          target_amount: number
          current_amount?: number
          target_date?: string | null
          icon?: string
          color?: string
          priority?: number
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          target_amount?: number
          current_amount?: number
          target_date?: string | null
          icon?: string
          color?: string
          priority?: number
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      receipts: {
        Row: {
          id: string
          user_id: string
          image_url: string
          ocr_raw: Json
          parsed_amount: number | null
          parsed_merchant: string | null
          parsed_date: string | null
          parsed_items: Json
          processed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_url: string
          ocr_raw?: Json
          parsed_amount?: number | null
          parsed_merchant?: string | null
          parsed_date?: string | null
          parsed_items?: Json
          processed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          image_url?: string
          ocr_raw?: Json
          parsed_amount?: number | null
          parsed_merchant?: string | null
          parsed_date?: string | null
          parsed_items?: Json
          processed?: boolean
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          account_id: string | null
          category_id: string | null
          name: string
          amount: number
          billing_cycle: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          next_billing_date: string
          merchant: string | null
          description: string | null
          is_active: boolean
          remind_days_before: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id?: string | null
          category_id?: string | null
          name: string
          amount: number
          billing_cycle: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          next_billing_date: string
          merchant?: string | null
          description?: string | null
          is_active?: boolean
          remind_days_before?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string | null
          category_id?: string | null
          name?: string
          amount?: number
          billing_cycle?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          next_billing_date?: string
          merchant?: string | null
          description?: string | null
          is_active?: boolean
          remind_days_before?: number
          created_at?: string
          updated_at?: string
        }
      }
      loans: {
        Row: {
          id: string
          user_id: string
          account_id: string | null
          name: string
          principal_amount: number
          remaining_amount: number
          interest_rate: number | null
          emi_amount: number | null
          emi_day: number | null
          start_date: string
          end_date: string | null
          lender: string | null
          loan_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id?: string | null
          name: string
          principal_amount: number
          remaining_amount: number
          interest_rate?: number | null
          emi_amount?: number | null
          emi_day?: number | null
          start_date: string
          end_date?: string | null
          lender?: string | null
          loan_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string | null
          name?: string
          principal_amount?: number
          remaining_amount?: number
          interest_rate?: number | null
          emi_amount?: number | null
          emi_day?: number | null
          start_date?: string
          end_date?: string | null
          lender?: string | null
          loan_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      investments: {
        Row: {
          id: string
          user_id: string
          account_id: string | null
          name: string
          type: 'stocks' | 'mutual_funds' | 'crypto' | 'gold' | 'real_estate' | 'other'
          quantity: number | null
          purchase_price: number | null
          current_price: number | null
          purchase_date: string | null
          symbol: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id?: string | null
          name: string
          type: 'stocks' | 'mutual_funds' | 'crypto' | 'gold' | 'real_estate' | 'other'
          quantity?: number | null
          purchase_price?: number | null
          current_price?: number | null
          purchase_date?: string | null
          symbol?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string | null
          name?: string
          type?: 'stocks' | 'mutual_funds' | 'crypto' | 'gold' | 'real_estate' | 'other'
          quantity?: number | null
          purchase_price?: number | null
          current_price?: number | null
          purchase_date?: string | null
          symbol?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      recurring_rules: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          account_id: string
          merchant: string
          amount: number
          frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
          start_date: string
          end_date: string | null
          next_occurrence: string
          is_active: boolean
          auto_create: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          account_id: string
          merchant: string
          amount: number
          frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
          start_date: string
          end_date?: string | null
          next_occurrence: string
          is_active?: boolean
          auto_create?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          account_id?: string
          merchant?: string
          amount?: number
          frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
          start_date?: string
          end_date?: string | null
          next_occurrence?: string
          is_active?: boolean
          auto_create?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notifications_log: {
        Row: {
          id: string
          user_id: string
          transaction_id: string | null
          subscription_id: string | null
          loan_id: string | null
          type: 'budget_alert' | 'subscription_reminder' | 'emi_reminder' | 'anomaly_alert' | 'salary_alert' | 'goal_milestone' | 'achievement' | 'other'
          title: string
          message: string
          data: Json
          channels: string[]
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transaction_id?: string | null
          subscription_id?: string | null
          loan_id?: string | null
          type: 'budget_alert' | 'subscription_reminder' | 'emi_reminder' | 'anomaly_alert' | 'salary_alert' | 'goal_milestone' | 'achievement' | 'other'
          title: string
          message: string
          data?: Json
          channels?: string[]
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          transaction_id?: string | null
          subscription_id?: string | null
          loan_id?: string | null
          type?: 'budget_alert' | 'subscription_reminder' | 'emi_reminder' | 'anomaly_alert' | 'salary_alert' | 'goal_milestone' | 'achievement' | 'other'
          title?: string
          message?: string
          data?: Json
          channels?: string[]
          is_read?: boolean
          created_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          context: Json
          tokens_used: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          context?: Json
          tokens_used?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'user' | 'assistant'
          content?: string
          context?: Json
          tokens_used?: number | null
          created_at?: string
        }
      }
      family_members: {
        Row: {
          id: string
          family_id: string
          user_id: string
          role: 'admin' | 'member' | 'child' | 'viewer'
          permissions: string[]
          added_by: string | null
          added_at: string
        }
        Insert: {
          id?: string
          family_id?: string
          user_id: string
          role?: 'admin' | 'member' | 'child' | 'viewer'
          permissions?: string[]
          added_by?: string | null
          added_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          user_id?: string
          role?: 'admin' | 'member' | 'child' | 'viewer'
          permissions?: string[]
          added_by?: string | null
          added_at?: string
        }
      }
      user_devices: {
        Row: {
          id: string
          user_id: string
          device_name: string
          device_type: 'web' | 'mobile_ios' | 'mobile_android' | 'tablet'
          user_agent: string | null
          ip_address: string | null
          is_active: boolean
          is_trusted: boolean
          last_seen: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          device_name: string
          device_type: 'web' | 'mobile_ios' | 'mobile_android' | 'tablet'
          user_agent?: string | null
          ip_address?: string | null
          is_active?: boolean
          is_trusted?: boolean
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          device_name?: string
          device_type?: 'web' | 'mobile_ios' | 'mobile_android' | 'tablet'
          user_agent?: string | null
          ip_address?: string | null
          is_active?: boolean
          is_trusted?: boolean
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
      }
      badges: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          category: 'saving' | 'tracking' | 'milestone' | 'consistency' | 'achievement'
          requirement_type: 'transaction_count' | 'days_streak' | 'savings_amount' | 'goal_completed' | 'investment_made'
          requirement_value: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon?: string | null
          category: 'saving' | 'tracking' | 'milestone' | 'consistency' | 'achievement'
          requirement_type: 'transaction_count' | 'days_streak' | 'savings_amount' | 'goal_completed' | 'investment_made'
          requirement_value: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string | null
          category?: 'saving' | 'tracking' | 'milestone' | 'consistency' | 'achievement'
          requirement_type?: 'transaction_count' | 'days_streak' | 'savings_amount' | 'goal_completed' | 'investment_made'
          requirement_value?: number
          created_at?: string
        }
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_id: string
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_id: string
          earned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          badge_id?: string
          earned_at?: string
        }
      }
      export_logs: {
        Row: {
          id: string
          user_id: string
          export_type: 'pdf' | 'excel' | 'csv' | 'email'
          format: string | null
          date_range_start: string | null
          date_range_end: string | null
          file_size_bytes: number | null
          download_url: string | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          export_type: 'pdf' | 'excel' | 'csv' | 'email'
          format?: string | null
          date_range_start?: string | null
          date_range_end?: string | null
          file_size_bytes?: number | null
          download_url?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          export_type?: 'pdf' | 'excel' | 'csv' | 'email'
          format?: string | null
          date_range_start?: string | null
          date_range_end?: string | null
          file_size_bytes?: number | null
          download_url?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
    }
  }
}
