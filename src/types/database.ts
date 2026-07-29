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
          created_at: string;
          created_by: string;
          id: string;
          organization_id: string;
          role: Database["public"]["Enums"]["organization_role"];
          status: Database["public"]["Enums"]["membership_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          organization_id: string;
          role: Database["public"]["Enums"]["organization_role"];
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          role?: Database["public"]["Enums"]["organization_role"];
          status?: Database["public"]["Enums"]["membership_status"];
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          country_code: string;
          created_at: string;
          created_by: string;
          currency_code: string;
          id: string;
          name: string;
          slug: string;
          status: Database["public"]["Enums"]["organization_status"];
          time_zone: string;
          updated_at: string;
        };
        Insert: {
          country_code?: string;
          created_at?: string;
          created_by: string;
          currency_code?: string;
          id?: string;
          name: string;
          slug: string;
          status?: Database["public"]["Enums"]["organization_status"];
          time_zone?: string;
          updated_at?: string;
        };
        Update: {
          country_code?: string;
          currency_code?: string;
          name?: string;
          status?: Database["public"]["Enums"]["organization_status"];
          time_zone?: string;
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
    };
    Enums: {
      branch_status: "active" | "inactive" | "archived";
      membership_status: "active" | "invited" | "disabled";
      organization_role: "owner" | "admin" | "manager" | "staff" | "accountant";
      organization_status: "active" | "suspended" | "deleted";
    };
    CompositeTypes: Record<string, never>;
  };
};
