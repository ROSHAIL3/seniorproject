import { mockAppointmentActivity, mockAppointments } from "@/data/mock/appointments";
import { getCustomerById } from "./customers.service";
import { getServiceById } from "./services.service";
import { getPackageById, packageToBookingService, recordPackageUsage } from "./packages.service";
import { getStaffMemberById } from "./staff.service";
import type {
  ActivityItem,
  Appointment,
  AppointmentCreateInput,
  AppointmentStatus,
} from "@/types/appointments";
import type { Customer } from "@/types/customers";
import { DEFAULT_ACTIVITY_ACTOR, logActivity } from "./activity-log.service";
import { saveAppointmentServiceFieldValues, validateAppointmentServiceFieldValues } from "./service-booking-fields.service";

let appointmentStore = mockAppointments.map((appointment) => ({ ...appointment }));
let activityStore = mockAppointmentActivity.map((activity) => ({ ...activity }));
const appointmentListeners = new Set<() => void>();

export function subscribeToAppointments(listener: () => void) {
  appointmentListeners.add(listener);
  return () => appointmentListeners.delete(listener);
}

const notifyAppointmentListeners = () => {
  appointmentListeners.forEach((listener) => listener());
};

export async function getAppointments(): Promise<Appointment[]> {
  return appointmentStore.map((appointment) => ({ ...appointment }));
}

export async function getAppointmentByBookingNumber(
  bookingNumber: string,
): Promise<Appointment | null> {
  const appointment = appointmentStore.find(
    (item) => item.bookingNumber === bookingNumber,
  );
  return appointment ? { ...appointment } : null;
}

export async function getAppointmentActivity(
  appointmentId: string,
): Promise<ActivityItem[]> {
  return activityStore
    .filter((activity) => activity.appointmentId === appointmentId)
    .map((activity) => ({ ...activity }));
}

export async function createAppointment(
  input: AppointmentCreateInput,
): Promise<Appointment> {
  const [customer, catalogService, packageRecord, staff] = await Promise.all([
    getCustomerById(input.customerId),
    getServiceById(input.serviceId),
    getPackageById(input.serviceId),
    getStaffMemberById(input.staffId),
  ]);
  const service = catalogService ?? (packageRecord ? await packageToBookingService(packageRecord) : null);
  if (!customer || !service || !staff) {
    throw new Error("Customer, service, or staff record was not found.");
  }
  if (!staff.isActive) {
    throw new Error("Inactive team members cannot receive new appointments.");
  }
  const serviceFieldErrors = await validateAppointmentServiceFieldValues(input.serviceId, input.serviceFieldValues ?? {});
  if (Object.keys(serviceFieldErrors).length) throw new Error(Object.values(serviceFieldErrors)[0]);

  const sequence = appointmentStore.length + 4;
  const timestamp = new Date().toISOString();
  const appointment: Appointment = {
    id: `appointment-${appointmentStore.length + 1}`,
    bookingNumber: `BK-${String(sequence).padStart(6, "0")}`,
    appointmentDate: input.appointmentDate,
    startTime: input.startTime,
    endTime: input.endTime,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    staffId: staff.id,
    staffName: staff.name,
    serviceId: service.id,
    serviceName: service.name,
    packageId: packageRecord?.id,
    packageType: packageRecord?.type,
    priceBhd: service.priceBhd,
    status: input.status,
    createdBy: input.createdBy,
    branchId: input.branchId,
    notes: input.notes,
    advancePaidBhd: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  appointmentStore = [...appointmentStore, appointment];
  await saveAppointmentServiceFieldValues(appointment.id, appointment.serviceId, input.serviceFieldValues ?? {});
  if (packageRecord) await recordPackageUsage(packageRecord.id, customer.id, appointment.id);
  notifyAppointmentListeners();
  await logActivity({ actorId: null, actorName: input.createdBy || "System", action: "Appointment created", category: "Customers & Appointments", targetType: "appointment", targetId: appointment.id, description: `Created appointment ${appointment.bookingNumber}.`, metadata: { customer: appointment.customerName, service: appointment.serviceName, staff: appointment.staffName, branch: appointment.branchId, date: appointment.appointmentDate, time: appointment.startTime }, newValues: { status: appointment.status }, source: "appointments" });
  return { ...appointment };
}

export async function updateAppointmentBooking(
  appointmentId: string,
  input: AppointmentCreateInput,
): Promise<Appointment> {
  const current = appointmentStore.find((item) => item.id === appointmentId);
  if (!current) throw new Error("Appointment record was not found.");
  const [customer, catalogService, packageRecord, staff] = await Promise.all([
    getCustomerById(input.customerId),
    getServiceById(input.serviceId),
    getPackageById(input.serviceId),
    getStaffMemberById(input.staffId),
  ]);
  const service = catalogService ?? (packageRecord ? await packageToBookingService(packageRecord) : null);
  if (!customer || !service || !staff) {
    throw new Error("Customer, service, or staff record was not found.");
  }
  if (!staff.isActive) {
    throw new Error("Inactive team members cannot receive new appointments.");
  }
  const serviceFieldErrors = await validateAppointmentServiceFieldValues(input.serviceId, input.serviceFieldValues ?? {});
  if (Object.keys(serviceFieldErrors).length) throw new Error(Object.values(serviceFieldErrors)[0]);
  const updated = await updateAppointment(appointmentId, {
    appointmentDate: input.appointmentDate,
    startTime: input.startTime,
    endTime: input.endTime,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    serviceId: service.id,
    serviceName: service.name,
    packageId: packageRecord?.id,
    packageType: packageRecord?.type,
    priceBhd: service.priceBhd,
    staffId: staff.id,
    staffName: staff.name,
    branchId: input.branchId,
    status: input.status,
    createdBy: input.createdBy,
    notes: input.notes,
  });
  await saveAppointmentServiceFieldValues(appointmentId, updated.serviceId, input.serviceFieldValues ?? {});
  if (packageRecord && current.packageId !== packageRecord.id) {
    await recordPackageUsage(packageRecord.id, customer.id, appointmentId);
  }
  const reassigned = current.staffId !== updated.staffId;
  const rescheduled = current.appointmentDate !== updated.appointmentDate || current.startTime !== updated.startTime;
  const action = reassigned ? "Appointment reassigned" : rescheduled ? "Appointment rescheduled" : "Appointment updated";
  await logActivity({ actorId: null, actorName: input.createdBy || "System", action, category: "Customers & Appointments", targetType: "appointment", targetId: appointmentId, description: `${action} for ${updated.bookingNumber}.`, metadata: { customer: updated.customerName, service: updated.serviceName, staff: updated.staffName, branch: updated.branchId }, oldValues: { date: current.appointmentDate, time: current.startTime, staff: current.staffName, service: current.serviceName }, newValues: { date: updated.appointmentDate, time: updated.startTime, staff: updated.staffName, service: updated.serviceName }, source: "appointments" });
  return updated;
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
): Promise<Appointment> {
  const current = appointmentStore.find((item) => item.id === appointmentId);
  if (!current) throw new Error("Appointment record was not found.");
  const updated = await updateAppointment(appointmentId, { status });
  const action = `Appointment ${status.toLowerCase()}`;
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action, category: "Customers & Appointments", targetType: "appointment", targetId: appointmentId, description: `${action} for ${updated.bookingNumber}.`, metadata: { customer: updated.customerName, service: updated.serviceName, staff: updated.staffName, branch: updated.branchId }, oldValues: { status: current.status }, newValues: { status: updated.status }, source: "appointments" });
  return updated;
}

export async function reassignAppointmentStaff(
  appointmentId: string,
  staffId: string,
): Promise<Appointment> {
  const staff = await getStaffMemberById(staffId);
  if (!staff) throw new Error("Staff record was not found.");
  if (!staff.isActive) throw new Error("Inactive team members cannot receive new appointments.");
  const current = appointmentStore.find((item) => item.id === appointmentId);
  if (!current) throw new Error("Appointment record was not found.");
  const updated = await updateAppointment(appointmentId, { staffId, staffName: staff.name });
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Appointment reassigned", category: "Customers & Appointments", targetType: "appointment", targetId: appointmentId, description: `Reassigned ${updated.bookingNumber} to ${staff.name}.`, metadata: { customer: updated.customerName, service: updated.serviceName, staff: staff.name, branch: updated.branchId }, oldValues: { staff: current.staffName }, newValues: { staff: updated.staffName }, source: "appointments" });
  return updated;
}

export async function recordAdvancePayment(
  appointmentId: string,
  amountBhd: number,
): Promise<Appointment> {
  const current = appointmentStore.find((item) => item.id === appointmentId);
  if (!current) throw new Error("Appointment record was not found.");
  const updated = await updateAppointment(appointmentId, { advancePaidBhd: amountBhd });
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Appointment advance payment recorded", category: "Finance", targetType: "appointment", targetId: appointmentId, description: `Recorded an advance payment for ${updated.bookingNumber}.`, metadata: { customer: updated.customerName, amountBhd }, oldValues: { advancePaidBhd: current.advancePaidBhd }, newValues: { advancePaidBhd: updated.advancePaidBhd }, source: "appointments" });
  return updated;
}

export async function synchronizeAppointmentCustomer(
  customer: Customer,
): Promise<void> {
  let changed = false;
  appointmentStore = appointmentStore.map((appointment) => {
    if (appointment.customerId !== customer.id) return appointment;
    changed = true;
    return {
      ...appointment,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      updatedAt: new Date().toISOString(),
    };
  });
  if (changed) notifyAppointmentListeners();
}

export async function deleteAppointment(appointmentId: string): Promise<void> {
  const current = appointmentStore.find((item) => item.id === appointmentId);
  if (!current) throw new Error("Appointment record was not found.");
  appointmentStore = appointmentStore.filter((item) => item.id !== appointmentId);
  activityStore = activityStore.filter(
    (activity) => activity.appointmentId !== appointmentId,
  );
  notifyAppointmentListeners();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Appointment deleted", category: "Customers & Appointments", targetType: "appointment", targetId: appointmentId, description: `Deleted appointment ${current.bookingNumber}.`, metadata: { customer: current.customerName, service: current.serviceName, staff: current.staffName, branch: current.branchId }, oldValues: { status: current.status, date: current.appointmentDate, time: current.startTime }, source: "appointments" });
}

export async function addAppointmentNote(
  appointmentId: string,
  note: string,
): Promise<ActivityItem> {
  const activity: ActivityItem = {
    id: `activity-${activityStore.length + 1}`,
    appointmentId,
    title: "Note added",
    detail: note,
    occurredAt: new Date().toISOString(),
  };
  activityStore = [activity, ...activityStore];
  const appointment = appointmentStore.find((item) => item.id === appointmentId);
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Appointment note added", category: "Customers & Appointments", targetType: "appointment", targetId: appointmentId, description: appointment ? `Added a note to ${appointment.bookingNumber}.` : "Added an appointment note.", metadata: appointment ? { customer: appointment.customerName, service: appointment.serviceName, staff: appointment.staffName } : {}, source: "appointments" });
  return { ...activity };
}

async function updateAppointment(
  appointmentId: string,
  changes: Partial<Appointment>,
): Promise<Appointment> {
  const current = appointmentStore.find((item) => item.id === appointmentId);
  if (!current) throw new Error("Appointment record was not found.");
  const updated = { ...current, ...changes, updatedAt: new Date().toISOString() };
  appointmentStore = appointmentStore.map((item) =>
    item.id === appointmentId ? updated : item,
  );
  notifyAppointmentListeners();
  return { ...updated };
}
