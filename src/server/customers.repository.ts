import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";
import type {
  Customer,
  CustomerCreateInput,
  CustomerUpdateInput,
} from "@/types/customers";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

export async function getCustomersFromDatabase(
  client?: SupabaseClient<Database>,
): Promise<Customer[]> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name");
  if (error) throw new Error("Customers could not be loaded.");
  return data.map(toCustomer);
}

export async function getCustomerFromDatabase(
  id: string,
  client?: SupabaseClient<Database>,
) {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("The customer could not be loaded.");
  return data ? toCustomer(data) : null;
}

export async function getCustomerCustomValuesFromDatabase(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("custom_values")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Customer fields could not be loaded.");
  return (data?.custom_values ?? {}) as Record<string, string | boolean>;
}

export async function saveCustomerInDatabase(
  id: string | null,
  input: CustomerCreateInput | CustomerUpdateInput,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_customer", {
    customer_custom_values: (input.customFieldValues ?? {}) as unknown as Json,
    customer_email: input.email,
    customer_name: input.name,
    customer_notes: input.notes,
    customer_phone: input.phone,
    customer_status:
      "status" in input && input.status === "Inactive" ? "inactive" : "active",
    target_customer_id: id,
  });
  if (error || !data) throw new Error(customerError(error?.message));
  return toCustomer(data);
}

export async function removeCustomerFromDatabase(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_customer", {
    target_customer_id: id,
  });
  if (error) throw new Error(customerError(error.message));
  return data as "archived" | "deleted";
}

export function customerError(message = "") {
  if (message.includes("CUSTOMER_DUPLICATE")) {
    return "A customer with this phone number or email already exists.";
  }
  if (message.includes("CUSTOMER_FORBIDDEN")) {
    return "You do not have permission to manage customers.";
  }
  if (message.includes("CUSTOMER_NOT_FOUND")) {
    return "The customer could not be found.";
  }
  if (message.includes("CUSTOMER_INVALID")) {
    return "Customer details are invalid.";
  }
  return "The customer change could not be saved.";
}

function toCustomer(row: CustomerRow): Customer {
  return {
    createdAt: row.created_at,
    email: row.email,
    id: row.id,
    name: row.name,
    notes: row.notes,
    phone: row.phone,
    status: row.status === "active" ? "Active" : "Inactive",
    updatedAt: row.updated_at,
  };
}
