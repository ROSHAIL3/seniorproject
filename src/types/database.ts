export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      branches: {
        Row: {
          address: string | null;
          code: string;
          created_at: string;
          email: string | null;
          google_maps_url: string | null;
          id: string;
          is_main: boolean;
          name: string;
          organization_id: string;
          phone: string | null;
          status: Database["public"]["Enums"]["branch_status"];
          time_zone: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          code: string;
          created_at?: string;
          email?: string | null;
          google_maps_url?: string | null;
          id?: string;
          is_main?: boolean;
          name: string;
          organization_id: string;
          phone?: string | null;
          status?: Database["public"]["Enums"]["branch_status"];
          time_zone?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          code?: string;
          email?: string | null;
          google_maps_url?: string | null;
          is_main?: boolean;
          name?: string;
          organization_id?: string;
          phone?: string | null;
          status?: Database["public"]["Enums"]["branch_status"];
          time_zone?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          created_by: string;
          id: string;
          invited_at: string | null;
          last_active_at: string | null;
          organization_id: string;
          permissions: Json;
          primary_branch_id: string | null;
          role: Database["public"]["Enums"]["organization_role"];
          service_ids: string[];
          staff_key: string;
          status: Database["public"]["Enums"]["membership_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          invited_at?: string | null;
          last_active_at?: string | null;
          organization_id: string;
          permissions?: Json;
          primary_branch_id?: string | null;
          role: Database["public"]["Enums"]["organization_role"];
          service_ids?: string[];
          staff_key?: string;
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accepted_at?: string | null;
          invited_at?: string | null;
          last_active_at?: string | null;
          permissions?: Json;
          primary_branch_id?: string | null;
          role?: Database["public"]["Enums"]["organization_role"];
          service_ids?: string[];
          staff_key?: string;
          status?: Database["public"]["Enums"]["membership_status"];
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          address: string | null;
          business_email: string | null;
          business_phone: string | null;
          country_code: string;
          created_at: string;
          created_by: string;
          currency_code: string;
          id: string;
          logo_file_name: string | null;
          logo_mime_type: string | null;
          logo_object_path: string | null;
          logo_size_bytes: number | null;
          name: string;
          public_booking_enabled: boolean;
          slug: string;
          status: Database["public"]["Enums"]["organization_status"];
          time_zone: string;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          address?: string | null;
          business_email?: string | null;
          business_phone?: string | null;
          country_code?: string;
          created_at?: string;
          created_by: string;
          currency_code?: string;
          id?: string;
          logo_file_name?: string | null;
          logo_mime_type?: string | null;
          logo_object_path?: string | null;
          logo_size_bytes?: number | null;
          name: string;
          public_booking_enabled?: boolean;
          slug: string;
          status?: Database["public"]["Enums"]["organization_status"];
          time_zone?: string;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          address?: string | null;
          business_email?: string | null;
          business_phone?: string | null;
          country_code?: string;
          currency_code?: string;
          logo_file_name?: string | null;
          logo_mime_type?: string | null;
          logo_object_path?: string | null;
          logo_size_bytes?: number | null;
          name?: string;
          public_booking_enabled?: boolean;
          slug?: string;
          status?: Database["public"]["Enums"]["organization_status"];
          time_zone?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string;
          phone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string;
          phone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          full_name?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_name: string;
          actor_user_id: string | null;
          category: string;
          description: string | null;
          id: string;
          metadata: Json;
          new_values: Json | null;
          occurred_at: string;
          old_values: Json | null;
          organization_id: string;
          source: string | null;
          target_id: string | null;
          target_type: string | null;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_name?: string;
          actor_user_id?: string | null;
          category: string;
          description?: string | null;
          id?: string;
          metadata?: Json;
          new_values?: Json | null;
          occurred_at?: string;
          old_values?: Json | null;
          organization_id: string;
          source?: string | null;
          target_id?: string | null;
          target_type?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      staff_schedules: {
        Row: {
          created_at: string;
          days: Json;
          id: string;
          membership_id: string;
          organization_id: string;
          updated_at: string;
          use_custom_hours: boolean;
        };
        Insert: {
          created_at?: string;
          days?: Json;
          id?: string;
          membership_id: string;
          organization_id: string;
          updated_at?: string;
          use_custom_hours?: boolean;
        };
        Update: {
          days?: Json;
          use_custom_hours?: boolean;
        };
        Relationships: [];
      };
      staff_time_off: {
        Row: {
          created_at: string;
          created_by: string;
          end_date: string;
          id: string;
          membership_id: string;
          organization_id: string;
          reason: string | null;
          start_date: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          end_date: string;
          id?: string;
          membership_id: string;
          organization_id: string;
          reason?: string | null;
          start_date: string;
          updated_at?: string;
        };
        Update: {
          end_date?: string;
          reason?: string | null;
          start_date?: string;
        };
        Relationships: [];
      };
      service_categories: {
        Row: { id: string; organization_id: string; name: string; status: Database["public"]["Enums"]["catalog_status"]; created_at: string; updated_at: string };
        Insert: { id?: string; organization_id: string; name: string; status?: Database["public"]["Enums"]["catalog_status"]; created_at?: string; updated_at?: string };
        Update: { name?: string; status?: Database["public"]["Enums"]["catalog_status"] };
        Relationships: [];
      };
      services: {
        Row: { id: string; organization_id: string; category_id: string; name: string; description: string; duration_minutes: number; price_bhd: number; image_object_path: string | null; is_active: boolean; vat_applicable: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; organization_id: string; category_id: string; name: string; description?: string; duration_minutes: number; price_bhd: number; image_object_path?: string | null; is_active?: boolean; vat_applicable?: boolean; created_at?: string; updated_at?: string };
        Update: { category_id?: string; name?: string; description?: string; duration_minutes?: number; price_bhd?: number; image_object_path?: string | null; is_active?: boolean; vat_applicable?: boolean };
        Relationships: [];
      };
      service_branches: {
        Row: { organization_id: string; service_id: string; branch_id: string; created_at: string };
        Insert: { organization_id: string; service_id: string; branch_id: string; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      service_staff: {
        Row: { organization_id: string; service_id: string; membership_id: string; created_at: string };
        Insert: { organization_id: string; service_id: string; membership_id: string; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      service_packages: {
        Row: { id: string; organization_id: string; name: string; description: string; type: Database["public"]["Enums"]["package_type"]; selling_price_bhd: number; image_object_path: string | null; is_active: boolean; allow_price_above_original: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; organization_id: string; name: string; description?: string; type: Database["public"]["Enums"]["package_type"]; selling_price_bhd: number; image_object_path?: string | null; is_active?: boolean; allow_price_above_original?: boolean; created_at?: string; updated_at?: string };
        Update: { name?: string; description?: string; type?: Database["public"]["Enums"]["package_type"]; selling_price_bhd?: number; image_object_path?: string | null; is_active?: boolean; allow_price_above_original?: boolean };
        Relationships: [];
      };
      package_items: {
        Row: { id: string; organization_id: string; package_id: string; service_id: string; quantity: number; sort_order: number; created_at: string };
        Insert: { id?: string; organization_id: string; package_id: string; service_id: string; quantity: number; sort_order: number; created_at?: string };
        Update: { quantity?: number; sort_order?: number };
        Relationships: [];
      };
      organization_business_hours: {
        Row: { organization_id: string; day_of_week: number; is_open: boolean; start_time: string; end_time: string; break_start_time: string | null; break_end_time: string | null; created_at: string; updated_at: string };
        Insert: { organization_id: string; day_of_week: number; is_open?: boolean; start_time?: string; end_time?: string; break_start_time?: string | null; break_end_time?: string | null; created_at?: string; updated_at?: string };
        Update: { is_open?: boolean; start_time?: string; end_time?: string; break_start_time?: string | null; break_end_time?: string | null };
        Relationships: [];
      };
      customers: {
        Row: { id: string; organization_id: string; name: string; phone: string; normalized_phone: string; email: string; notes: string; status: Database["public"]["Enums"]["customer_status"]; custom_values: Json; created_by: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; organization_id: string; name: string; phone: string; normalized_phone: string; email?: string; notes?: string; status?: Database["public"]["Enums"]["customer_status"]; custom_values?: Json; created_by?: string | null; created_at?: string; updated_at?: string };
        Update: { name?: string; phone?: string; normalized_phone?: string; email?: string; notes?: string; status?: Database["public"]["Enums"]["customer_status"]; custom_values?: Json };
        Relationships: [];
      };
      organization_booking_counters: {
        Row: { organization_id: string; next_number: number };
        Insert: { organization_id: string; next_number?: number };
        Update: { next_number?: number };
        Relationships: [];
      };
      appointments: {
        Row: { id: string; organization_id: string; booking_number: string; customer_id: string; membership_id: string; branch_id: string; offering_type: Database["public"]["Enums"]["appointment_offering_type"]; service_id: string | null; package_id: string | null; starts_at: string; ends_at: string; customer_name: string; customer_phone: string; customer_email: string; staff_name: string; offering_name: string; package_type: Database["public"]["Enums"]["package_type"] | null; price_bhd: number; status: Database["public"]["Enums"]["appointment_status"]; notes: string; service_field_values: Json; advance_paid_bhd: number; created_by: string | null; created_by_name: string; created_at: string; updated_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      appointment_notes: {
        Row: { id: string; organization_id: string; appointment_id: string; note: string; created_by: string | null; created_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      appointment_status_history: {
        Row: { id: string; organization_id: string; appointment_id: string; old_status: Database["public"]["Enums"]["appointment_status"] | null; new_status: Database["public"]["Enums"]["appointment_status"]; changed_by: string | null; changed_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      organization_finance_settings: {
        Row: { organization_id: string; vat_enabled: boolean; vat_type: Database["public"]["Enums"]["finance_vat_type"]; vat_rate_percent: number; vat_registration_number: string; created_at: string; updated_at: string };
        Insert: { organization_id: string; vat_enabled?: boolean; vat_type?: Database["public"]["Enums"]["finance_vat_type"]; vat_rate_percent?: number; vat_registration_number?: string; created_at?: string; updated_at?: string };
        Update: { vat_enabled?: boolean; vat_type?: Database["public"]["Enums"]["finance_vat_type"]; vat_rate_percent?: number; vat_registration_number?: string };
        Relationships: [];
      };
      customer_field_definitions: {
        Row: { id: string; organization_id: string; label: string; type: Database["public"]["Enums"]["customer_field_type"]; required: boolean; is_active: boolean; sort_order: number; created_at: string; updated_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      customer_field_options: {
        Row: { id: string; organization_id: string; field_id: string; label: string; sort_order: number; created_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      service_booking_field_definitions: {
        Row: { id: string; organization_id: string; service_id: string; label: string; type: Database["public"]["Enums"]["service_booking_field_type"]; required: boolean; is_active: boolean; sort_order: number; created_at: string; updated_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      service_booking_field_options: {
        Row: { id: string; organization_id: string; field_id: string; label: string; sort_order: number; created_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      organization_finance_counters: {
        Row: { organization_id: string; next_invoice_number: number };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      invoices: {
        Row: { id: string; organization_id: string; invoice_number: string; customer_id: string; customer_name: string; customer_phone: string; customer_email: string; issued_on: string; currency_code: string; vat_enabled: boolean; vat_type: Database["public"]["Enums"]["finance_vat_type"]; vat_rate_percent: number; vat_registration_number: string; subtotal_bhd: number; vat_bhd: number; total_bhd: number; created_by: string | null; created_by_name: string; created_at: string; updated_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      invoice_items: {
        Row: { id: string; organization_id: string; invoice_id: string; appointment_id: string; service_id: string | null; description: string; quantity: number; unit_price_bhd: number; vat_applicable: boolean; line_subtotal_bhd: number; line_vat_bhd: number; line_total_bhd: number; created_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      payment_transactions: {
        Row: { id: string; organization_id: string; invoice_id: string | null; appointment_id: string | null; kind: Database["public"]["Enums"]["payment_kind"]; method: Database["public"]["Enums"]["payment_method"]; amount_bhd: number; note: string; idempotency_key: string; recorded_by: string | null; recorded_by_name: string; recorded_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      payment_allocations: {
        Row: { id: string; organization_id: string; transaction_id: string; invoice_item_id: string; kind: Database["public"]["Enums"]["payment_kind"]; amount_bhd: number; created_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      expense_categories: {
        Row: { id: string; organization_id: string; name: string; color_hex: string; status: Database["public"]["Enums"]["expense_category_status"]; created_by: string | null; created_at: string; updated_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      expenses: {
        Row: { id: string; organization_id: string; category_id: string; branch_id: string; description: string; amount_bhd: number; input_vat_bhd: number; vat_treatment: Database["public"]["Enums"]["expense_vat_treatment"]; incurred_on: string; payment_method: Database["public"]["Enums"]["payment_method"]; reference_number: string; notes: string; submission_id: string; created_by: string | null; deleted_by: string | null; deleted_at: string | null; created_at: string; updated_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      ensure_owner_onboarding: {
        Args: {
          branch_name?: string | null;
          organization_name?: string | null;
          owner_full_name?: string | null;
        };
        Returns: string;
      };
      is_organization_business_email_verified: {
        Args: {
          target_organization_id: string;
        };
        Returns: boolean;
      };
      can_access_application: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      complete_account_onboarding: {
        Args: {
          account_full_name?: string | null;
        };
        Returns: string;
      };
      create_team_membership: {
        Args: {
          invited_user_id: string;
          member_branch_id: string;
          member_email: string;
          member_full_name: string;
          member_permissions: Json;
          member_phone: string;
          member_role: Database["public"]["Enums"]["organization_role"];
          member_service_ids: string[];
        };
        Returns: Database["public"]["Tables"]["organization_members"]["Row"];
      };
      disable_team_membership: {
        Args: { target_staff_key: string };
        Returns: undefined;
      };
      has_module_permission: {
        Args: { action_name: string; module_name: string };
        Returns: boolean;
      };
      record_client_activity: {
        Args: {
          activity_action: string;
          activity_category: string;
          activity_description: string;
          activity_metadata: Json;
          activity_new_values: Json | null;
          activity_old_values: Json | null;
          activity_source: string;
          activity_target_id: string;
          activity_target_type: string;
        };
        Returns: string;
      };
      update_team_membership: {
        Args: {
          member_branch_id: string;
          member_full_name: string;
          member_permissions: Json;
          member_phone: string;
          member_role: Database["public"]["Enums"]["organization_role"];
          member_service_ids: string[];
          member_status: Database["public"]["Enums"]["membership_status"];
          target_staff_key: string;
        };
        Returns: Database["public"]["Tables"]["organization_members"]["Row"];
      };
      upsert_service_category: {
        Args: { target_category_id: string | null; category_name: string; category_status: Database["public"]["Enums"]["catalog_status"] };
        Returns: Database["public"]["Tables"]["service_categories"]["Row"];
      };
      archive_or_delete_service_category: {
        Args: { target_category_id: string };
        Returns: string;
      };
      upsert_catalog_service: {
        Args: { target_service_id: string | null; service_name: string; service_category_id: string; service_description: string; service_duration_minutes: number; service_price_bhd: number; service_is_active: boolean; service_vat_applicable: boolean; service_staff_keys: string[]; service_branch_ids: string[] };
        Returns: Database["public"]["Tables"]["services"]["Row"];
      };
      upsert_service_package: {
        Args: { target_package_id: string | null; package_name: string; package_description: string; package_kind: Database["public"]["Enums"]["package_type"]; package_selling_price_bhd: number; package_is_active: boolean; package_allow_price_above_original: boolean; package_items: Json };
        Returns: Database["public"]["Tables"]["service_packages"]["Row"];
      };
      upsert_customer: {
        Args: { target_customer_id: string | null; customer_name: string; customer_phone: string; customer_email: string; customer_notes: string; customer_status: Database["public"]["Enums"]["customer_status"]; customer_custom_values: Json };
        Returns: Database["public"]["Tables"]["customers"]["Row"];
      };
      update_business_hours: {
        Args: { schedule_days: Json };
        Returns: Database["public"]["Tables"]["organization_business_hours"]["Row"][];
      };
      update_finance_settings: {
        Args: { target_vat_enabled: boolean; target_vat_type: Database["public"]["Enums"]["finance_vat_type"]; target_vat_rate_percent: number; target_vat_registration_number: string };
        Returns: Database["public"]["Tables"]["organization_finance_settings"]["Row"];
      };
      replace_customer_field_definitions: {
        Args: { target_fields: Json };
        Returns: Database["public"]["Tables"]["customer_field_definitions"]["Row"][];
      };
      replace_service_booking_fields: {
        Args: { target_service_id: string; target_fields: Json };
        Returns: Database["public"]["Tables"]["service_booking_field_definitions"]["Row"][];
      };
      create_invoice_from_appointments: {
        Args: { target_appointment_ids: string[]; target_issued_on: string; target_created_by_name: string };
        Returns: Database["public"]["Tables"]["invoices"]["Row"];
      };
      record_invoice_payment: {
        Args: { target_invoice_id: string; target_kind: Database["public"]["Enums"]["payment_kind"]; target_method: Database["public"]["Enums"]["payment_method"]; target_amount_bhd: number; target_note: string; target_idempotency_key: string; target_recorded_by_name: string };
        Returns: Database["public"]["Tables"]["payment_transactions"]["Row"];
      };
      upsert_expense_category: {
        Args: { target_category_id: string | null; category_name: string; category_color_hex: string };
        Returns: Database["public"]["Tables"]["expense_categories"]["Row"];
      };
      remove_expense_category: {
        Args: { target_category_id: string };
        Returns: string;
      };
      upsert_expense: {
        Args: { target_expense_id: string | null; target_category_id: string; target_branch_id: string; target_description: string; target_amount_bhd: number; target_input_vat_bhd: number; target_vat_treatment: Database["public"]["Enums"]["expense_vat_treatment"]; target_incurred_on: string; target_payment_method: Database["public"]["Enums"]["payment_method"]; target_reference_number: string; target_notes: string; target_submission_id: string | null };
        Returns: Database["public"]["Tables"]["expenses"]["Row"];
      };
      delete_expense: {
        Args: { target_expense_id: string };
        Returns: undefined;
      };
      delete_customer: {
        Args: { target_customer_id: string };
        Returns: string;
      };
      upsert_appointment: {
        Args: { target_appointment_id: string | null; target_customer_id: string; target_staff_key: string; target_branch_id: string; target_offering_id: string; target_starts_at: string; target_ends_at: string; target_status: Database["public"]["Enums"]["appointment_status"]; target_notes: string; target_service_field_values: Json; target_created_by_name: string };
        Returns: Database["public"]["Tables"]["appointments"]["Row"];
      };
      update_appointment_status: {
        Args: { target_appointment_id: string; target_status: Database["public"]["Enums"]["appointment_status"] };
        Returns: Database["public"]["Tables"]["appointments"]["Row"];
      };
      update_appointment_payment: {
        Args: { target_appointment_id: string; target_amount_bhd: number };
        Returns: Database["public"]["Tables"]["appointments"]["Row"];
      };
      add_appointment_note: {
        Args: { target_appointment_id: string; target_note: string };
        Returns: Database["public"]["Tables"]["appointment_notes"]["Row"];
      };
      delete_appointment: {
        Args: { target_appointment_id: string };
        Returns: undefined;
      };
      delete_branch: {
        Args: {
          target_branch_id: string;
        };
        Returns: undefined;
      };
      soft_delete_organization: {
        Args: {
          confirmation_name: string;
        };
        Returns: string;
      };
      upsert_branch: {
        Args: {
          branch_address: string;
          branch_email: string;
          branch_google_maps_url: string;
          branch_name: string;
          branch_phone: string;
          branch_status: Database["public"]["Enums"]["branch_status"];
          branch_time_zone: string;
          make_main: boolean;
          target_branch_id: string | null;
        };
        Returns: Database["public"]["Tables"]["branches"]["Row"];
      };
    };
    Enums: {
      branch_status: "active" | "inactive" | "archived";
      customer_status: "active" | "inactive";
      appointment_status: "booked" | "confirmed" | "completed" | "cancelled" | "no_show";
      appointment_offering_type: "service" | "package";
      customer_field_type: "text" | "number" | "email" | "phone" | "date" | "dropdown" | "checkbox" | "textarea";
      service_booking_field_type: "text" | "number" | "date" | "dropdown" | "checkbox" | "textarea";
      finance_vat_type: "exclusive" | "inclusive";
      payment_kind: "payment" | "refund";
      payment_method: "cash" | "card" | "bank_transfer" | "other";
      expense_category_status: "active" | "archived";
      expense_vat_treatment: "vat_included" | "vat_added_separately" | "no_vat";
      catalog_status: "active" | "archived";
      membership_status: "active" | "invited" | "disabled";
      organization_role: "owner" | "admin" | "manager" | "staff" | "accountant";
      organization_status: "active" | "suspended" | "deleted";
      package_type: "combo" | "flexible";
    };
    CompositeTypes: Record<string, never>;
  };
};
