import { mockCustomers } from "@/data/mock/customers";
import type {
  Customer,
  CustomerCreateInput,
  CustomerFieldErrors,
  CustomerUpdateInput,
} from "@/types/customers";
import { saveCustomerFieldValues, validateCustomerFieldValues } from "./customer-fields.service";
import { DEFAULT_ACTIVITY_ACTOR, logActivity } from "./activity-log.service";

let customerStore = mockCustomers.map((customer) => ({ ...customer }));
const customerListeners = new Set<() => void>();

export class CustomerValidationError extends Error {
  constructor(public fieldErrors: CustomerFieldErrors) {
    super("Customer details are invalid.");
    this.name = "CustomerValidationError";
  }
}

export function subscribeToCustomers(listener: () => void) {
  customerListeners.add(listener);
  return () => customerListeners.delete(listener);
}

const notifyCustomerListeners = () => {
  customerListeners.forEach((listener) => listener());
};

export async function getCustomers(): Promise<Customer[]> {
  return customerStore.map((customer) => ({ ...customer }));
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const customer = customerStore.find((item) => item.id === id);
  return customer ? { ...customer } : null;
}

export async function createCustomer(
  input: CustomerCreateInput,
): Promise<Customer> {
  validateCustomer(input);
  validateCustomFields(input.customFieldValues ?? {});
  const timestamp = new Date().toISOString();
  const sequence =
    Math.max(
      0,
      ...customerStore.map((customer) =>
        Number(customer.id.replace("customer-", "")) || 0,
      ),
    ) + 1;
  const customer: Customer = {
    id: `customer-${sequence}`,
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim().toLowerCase(),
    notes: input.notes.trim(),
    status: "Active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  customerStore = [...customerStore, customer];
  await saveCustomerFieldValues(customer.id, input.customFieldValues ?? {});
  notifyCustomerListeners();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Customer created", category: "Customers & Appointments", targetType: "customer", targetId: customer.id, description: `Created customer ${customer.name}.`, metadata: { customer: customer.name, email: customer.email, phone: customer.phone }, newValues: { name: customer.name, email: customer.email, phone: customer.phone, status: customer.status }, source: "customers" });
  return { ...customer };
}

export async function updateCustomer(
  customerId: string,
  input: CustomerUpdateInput,
): Promise<Customer> {
  validateCustomer(input, customerId);
  validateCustomFields(input.customFieldValues ?? {});
  const current = customerStore.find((customer) => customer.id === customerId);
  if (!current) throw new Error("Customer record was not found.");
  const updated: Customer = {
    ...current,
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim().toLowerCase(),
    notes: input.notes.trim(),
    status: input.status,
    updatedAt: new Date().toISOString(),
  };
  customerStore = customerStore.map((customer) =>
    customer.id === customerId ? updated : customer,
  );
  await saveCustomerFieldValues(customerId, input.customFieldValues ?? {});
  notifyCustomerListeners();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Customer updated", category: "Customers & Appointments", targetType: "customer", targetId: customerId, description: `Updated customer ${updated.name}.`, metadata: { customer: updated.name }, oldValues: { name: current.name, email: current.email, phone: current.phone, status: current.status }, newValues: { name: updated.name, email: updated.email, phone: updated.phone, status: updated.status }, source: "customers" });
  return { ...updated };
}

export async function updateCustomerPhoto(
  customerId: string,
  photoUrl: string,
): Promise<Customer> {
  const current = customerStore.find((customer) => customer.id === customerId);
  if (!current) throw new Error("Customer record was not found.");
  const updated = {
    ...current,
    photoUrl,
    updatedAt: new Date().toISOString(),
  };
  customerStore = customerStore.map((customer) =>
    customer.id === customerId ? updated : customer,
  );
  notifyCustomerListeners();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Customer profile photo updated", category: "Customers & Appointments", targetType: "customer", targetId: customerId, description: `Updated the profile photo for ${updated.name}.`, metadata: { customer: updated.name }, source: "customers" });
  return { ...updated };
}

export async function archiveCustomer(customerId: string): Promise<Customer> {
  const current = customerStore.find((customer) => customer.id === customerId);
  if (!current) throw new Error("Customer record was not found.");
  const updated = { ...current, status: "Inactive" as const, updatedAt: new Date().toISOString() };
  customerStore = customerStore.map((customer) => customer.id === customerId ? updated : customer);
  notifyCustomerListeners();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Customer archived", category: "Customers & Appointments", targetType: "customer", targetId: customerId, description: `Archived customer ${updated.name}.`, metadata: { customer: updated.name }, oldValues: { status: current.status }, newValues: { status: updated.status }, source: "customers" });
  return { ...updated };
}

export async function permanentlyDeleteCustomer(customerId: string) {
  const current = customerStore.find((customer) => customer.id === customerId);
  if (!current) throw new Error("Customer record was not found.");
  customerStore = customerStore.filter((customer) => customer.id !== customerId);
  notifyCustomerListeners();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Customer deleted", category: "Customers & Appointments", targetType: "customer", targetId: customerId, description: `Permanently deleted customer ${current.name}.`, metadata: { customer: current.name, email: current.email }, oldValues: { status: current.status }, source: "customers" });
}

function validateCustomer(
  input: CustomerCreateInput,
  ignoreCustomerId?: string,
) {
  const errors: CustomerFieldErrors = {};
  const normalizedPhone = normalizePhone(input.phone);
  const normalizedEmail = input.email.trim().toLowerCase();

  if (!input.name.trim()) errors.name = "Full name is required.";
  if (!input.phone.trim()) {
    errors.phone = "Phone is required.";
  } else if (normalizedPhone.length < 8 || normalizedPhone.length > 15) {
    errors.phone = "Enter a valid phone number with 8 to 15 digits.";
  }
  if (
    normalizedEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    errors.email = "Enter a valid email address.";
  }

  const duplicatePhone = customerStore.find(
    (customer) =>
      customer.id !== ignoreCustomerId &&
      normalizePhone(customer.phone) === normalizedPhone,
  );
  if (normalizedPhone && duplicatePhone) {
    errors.phone = "A customer with this phone number already exists.";
  }
  const duplicateEmail = customerStore.find(
    (customer) =>
      customer.id !== ignoreCustomerId &&
      normalizedEmail &&
      customer.email.trim().toLowerCase() === normalizedEmail,
  );
  if (duplicateEmail) {
    errors.email = "A customer with this email address already exists.";
  }

  if (Object.keys(errors).length > 0) throw new CustomerValidationError(errors);
}

const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

function validateCustomFields(values: NonNullable<CustomerCreateInput["customFieldValues"]>) {
  const errors = validateCustomerFieldValues(values);
  if (Object.keys(errors).length) throw new CustomerValidationError(errors as CustomerFieldErrors);
}
