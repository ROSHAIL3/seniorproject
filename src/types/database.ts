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
      catalog_status: "active" | "archived";
      membership_status: "active" | "invited" | "disabled";
      organization_role: "owner" | "admin" | "manager" | "staff" | "accountant";
      organization_status: "active" | "suspended" | "deleted";
      package_type: "combo" | "flexible";
    };
    CompositeTypes: Record<string, never>;
  };
};
