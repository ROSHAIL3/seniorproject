import type { Appointment } from "./appointments";
import type { CustomerFieldValueMap, CustomerFieldValueRecord } from "./customer-fields";

export type CustomerStatus = "Active" | "Inactive";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  status: CustomerStatus;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerCreateInput = Pick<
  Customer,
  "name" | "phone" | "email" | "notes"
> & { customFieldValues?: CustomerFieldValueMap };

export type CustomerUpdateInput = CustomerCreateInput & {
  status: CustomerStatus;
};

export type CustomerFieldErrors = Partial<
  Record<"name" | "phone" | "email" | `customFields.${string}`, string>
>;

export type CustomerProfile = {
  customer: Customer;
  appointments: Appointment[];
  totalVisits: number;
  noShows: number;
  totalSpentBhd: number;
  lastVisit: string | null;
  customFieldValues: CustomerFieldValueRecord[];
};
