import type {
  Customer,
  CustomerCreateInput,
  CustomerFieldErrors,
  CustomerUpdateInput,
} from "@/types/customers";
import { validateCustomerFieldValues } from "./customer-fields.service";

export class CustomerValidationError extends Error {
  constructor(public fieldErrors: CustomerFieldErrors) {
    super("Customer details are invalid.");
    this.name = "CustomerValidationError";
  }
}

export function subscribeToCustomers(_listener?: () => void) {
  void _listener;
  return () => undefined;
}

export async function getCustomers(): Promise<Customer[]> {
  return (await customerRequest("/api/customers")).customers;
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const response = await fetch(`/api/customers/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (response.status === 404) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "The customer could not be loaded.");
  return body.customer as Customer;
}

export async function createCustomer(input: CustomerCreateInput) {
  validateCustomer(input);
  return (
    await customerRequest("/api/customers", {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    })
  ).customer as Customer;
}

export async function updateCustomer(customerId: string, input: CustomerUpdateInput) {
  validateCustomer(input);
  return (
    await customerRequest(`/api/customers/${encodeURIComponent(customerId)}`, {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    })
  ).customer as Customer;
}

export async function updateCustomerPhoto(
  _customerId: string,
  _photoUrl: string,
): Promise<Customer> {
  void _customerId;
  void _photoUrl;
  throw new Error(
    "Customer photo uploads are disabled in Phase 5 to conserve the Supabase Free storage quota.",
  );
}

export async function archiveCustomer(customerId: string) {
  const customer = await getCustomerById(customerId);
  if (!customer) throw new Error("Customer record was not found.");
  return updateCustomer(customerId, {
    email: customer.email,
    name: customer.name,
    notes: customer.notes,
    phone: customer.phone,
    status: "Inactive",
  });
}

export async function permanentlyDeleteCustomer(customerId: string) {
  await customerRequest(`/api/customers/${encodeURIComponent(customerId)}`, {
    method: "DELETE",
  });
}

function validateCustomer(input: CustomerCreateInput) {
  const errors: CustomerFieldErrors = {};
  if (!input.name?.trim()) errors.name = "Customer name is required.";
  if (input.phone.replace(/[^\d+]/g, "").length < 3) {
    errors.phone = "Enter a valid phone number.";
  }
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = "Enter a valid email address.";
  }
  Object.assign(errors, validateCustomerFieldValues(input.customFieldValues ?? {}));
  if (Object.keys(errors).length) throw new CustomerValidationError(errors);
}

async function customerRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, { cache: "no-store", ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Customer request failed.");
  return body;
}
