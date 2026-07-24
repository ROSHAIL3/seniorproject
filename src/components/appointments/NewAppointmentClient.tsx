"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Select from "@/components/form/Select";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { BUSINESS_HOURS, getTodayIso } from "@/config/business";
import { CheckCircleIcon, ChevronLeftIcon } from "@/icons";
import { formatBhd } from "@/lib/formatters";
import {
  createAppointment,
  updateAppointmentBooking,
} from "@/services/appointments.service";
import type { Appointment } from "@/types/appointments";
import type { Customer } from "@/types/customers";
import type { Service } from "@/types/services";
import type { ServiceBookingFieldDefinition, ServiceBookingFieldValueMap } from "@/types/services";
import type { StaffMember } from "@/types/staff";
import BookingConflictAlert from "./BookingConflictAlert";
import CustomerSearch from "./CustomerSearch";
import ServiceSelector from "./ServiceSelector";
import StaffSchedule from "./StaffSchedule";
import { addMinutes, validateBooking } from "./validation";
import ServiceBookingFieldsForm from "./ServiceBookingFieldsForm";
import { getBookableServices, getServiceById } from "@/services/services.service";
import { getPackageBookingOfferings, getPackageById, packageToBookingService } from "@/services/packages.service";
import { getStaffMembers } from "@/services/staff.service";
import { getServiceBookingFields } from "@/services/service-booking-fields.service";

type NewAppointmentClientProps = {
  editingAppointment?: Appointment;
  initialAppointmentDate?: string;
  appointments: Appointment[];
  customers: Customer[];
  services: Service[];
  staffMembers: StaffMember[];
  serviceFields: ServiceBookingFieldDefinition[];
  initialServiceFieldValues?: ServiceBookingFieldValueMap;
};

const branchOptions = [
  { value: "branch-manama", label: "Manama branch" },
  { value: "branch-seef", label: "Seef branch" },
];

export default function NewAppointmentClient({
  editingAppointment,
  initialAppointmentDate,
  appointments,
  customers,
  services,
  staffMembers,
  serviceFields,
  initialServiceFieldValues = {},
}: NewAppointmentClientProps) {
  const [todayDate, setTodayDate] = useState(() => getTodayIso());
  const [customer, setCustomer] = useState<Customer | null>(
    editingAppointment
      ? customers.find((item) => item.id === editingAppointment.customerId) ?? null
      : null,
  );
  const [service, setService] = useState<Service | null>(
    editingAppointment
      ? services.find((item) => item.id === editingAppointment.serviceId) ?? null
      : null,
  );
  const [branchId, setBranchId] = useState(
    editingAppointment?.branchId ?? "branch-manama",
  );
  const [appointmentDate, setAppointmentDate] = useState(
    editingAppointment?.appointmentDate ??
      initialAppointmentDate ??
      getTodayIso(),
  );
  const [staffId, setStaffId] = useState(editingAppointment?.staffId ?? "");
  const [startTime, setStartTime] = useState(editingAppointment?.startTime ?? "");
  const [saveState, setSaveState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [serviceFieldValues, setServiceFieldValues] = useState<ServiceBookingFieldValueMap>(initialServiceFieldValues);
  const [currentServices, setCurrentServices] = useState(services); const [currentStaffMembers, setCurrentStaffMembers] = useState(staffMembers); const [currentServiceFields, setCurrentServiceFields] = useState(serviceFields);
  useEffect(() => {
    const refreshToday = () => setTodayDate(getTodayIso());
    const intervalId = window.setInterval(refreshToday, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);
  useEffect(() => { queueMicrotask(() => { Promise.all([getBookableServices(), getPackageBookingOfferings(), getStaffMembers()]).then(async ([catalogServices, packageOfferings, nextStaff]) => { const nextServices = [...catalogServices, ...packageOfferings]; if (editingAppointment && !nextServices.some((item) => item.id === editingAppointment.serviceId)) { const historical = await getServiceById(editingAppointment.serviceId); const historicalPackage = historical ? null : await getPackageById(editingAppointment.serviceId); if (historical) nextServices.push(historical); else if (historicalPackage) nextServices.push(await packageToBookingService(historicalPackage)); } setCurrentServices(nextServices); setCurrentStaffMembers(nextStaff); setCurrentServiceFields((await Promise.all(nextServices.map((item) => getServiceBookingFields(item.id)))).flat()); }); }); }, [editingAppointment]);
  const selectedServiceFields = currentServiceFields.filter((field) => field.serviceId === service?.id);
  const serviceFieldErrors = Object.fromEntries(selectedServiceFields.flatMap((field) => { const value = serviceFieldValues[field.id]; const empty = value === undefined || value === "" || value === false; return field.required && empty ? [[`serviceFields.${field.id}`, `${field.label} is required.`]] : []; }));

  const formData = useMemo(
    () => ({
      customerId: customer?.id ?? "",
      serviceId: service?.id ?? "",
      staffId,
      branchId,
      appointmentDate,
      startTime,
    }),
    [appointmentDate, branchId, customer?.id, service?.id, staffId, startTime],
  );

  const validationErrors = useMemo(
    () =>
      validateBooking(
        formData,
        {
          appointments,
          services: currentServices,
          staffMembers: currentStaffMembers,
          businessHours: BUSINESS_HOURS,
          today: todayDate,
        },
        { ignoreAppointmentId: editingAppointment?.id },
      ),
    [appointments, editingAppointment?.id, formData, currentServices, currentStaffMembers, todayDate],
  );

  const selectedStaff = currentStaffMembers.find((staff) => staff.id === staffId);
  const scheduleStaffMembers = service ? currentStaffMembers.filter((staff) => service.staffIds.includes(staff.id)) : currentStaffMembers;
  const isValid = validationErrors.length === 0 && Object.keys(serviceFieldErrors).length === 0;
  const resetSaveState = () => setSaveState("idle");

  const saveAppointment = async () => {
    if (!isValid || !service) return;
    setSaveState("loading");
    const input = {
      ...formData,
      endTime: addMinutes(startTime, service.durationMinutes),
      status: editingAppointment?.status ?? ("Booked" as const),
      createdBy: editingAppointment?.createdBy ?? "Dashboard user",
      serviceFieldValues,
    };
    try {
      if (editingAppointment) {
        await updateAppointmentBooking(editingAppointment.id, input);
      } else {
        await createAppointment(input);
      }
      setSaveState("success");
    } catch {
      setSaveState("error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            {editingAppointment ? "Edit Appointment" : "Book Appointment"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose a customer and service, then select an available staff time.
          </p>
        </div>
        <Link
          href="/appointments"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-500 dark:text-gray-400"
        >
          <ChevronLeftIcon className="size-4" />
          Back to Appointments
        </Link>
      </div>

      {saveState === "success" && (
        <Alert
          variant="success"
          title="Appointment saved"
          message="The appointment was saved successfully in the current mock data service."
        />
      )}
      {saveState === "error" && (
        <Alert
          variant="error"
          title="Could not save"
          message="The appointment could not be saved. Please try again."
        />
      )}

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 space-y-6 xl:col-span-4 2xl:col-span-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <CustomerSearch
              selectedCustomer={customer}
              initialCustomers={customers}
              onSelect={(selectedCustomer) => {
                setCustomer(selectedCustomer);
                resetSaveState();
              }}
            />
            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Branch
              </label>
              <Select
                key={branchId}
                options={branchOptions}
                defaultValue={branchId}
                onChange={(value) => {
                  setBranchId(value);
                  setStaffId("");
                  setStartTime("");
                  resetSaveState();
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <ServiceSelector
              selectedService={service}
              services={currentServices}
              onSelect={(selectedService) => {
                setService(selectedService);
                if (selectedService.id !== service?.id) setServiceFieldValues({});
                setStaffId("");
                setStartTime("");
                resetSaveState();
              }}
            />
            <ServiceBookingFieldsForm fields={selectedServiceFields} values={serviceFieldValues} onChange={(values) => { setServiceFieldValues(values); resetSaveState(); }} errors={serviceFieldErrors} />
          </div>

          {startTime && (
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/30 dark:bg-brand-500/10">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-500">
                Selected booking
              </p>
              <p className="mt-2 font-semibold text-gray-800 dark:text-white/90">
                {selectedStaff?.name}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {appointmentDate} · {startTime}
                {service
                  ? `–${addMinutes(startTime, service.durationMinutes)}`
                  : ""}
              </p>
              {service && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {service.name} · {formatBhd(service.priceBhd)}
                </p>
              )}
            </div>
          )}

          {startTime && validationErrors.length > 0 && (
            <BookingConflictAlert errors={validationErrors} />
          )}

          <Button
            onClick={saveAppointment}
            disabled={!isValid || saveState === "loading"}
            className="w-full"
            startIcon={<CheckCircleIcon className="size-5" />}
          >
            {saveState === "loading"
              ? "Saving..."
              : editingAppointment
                ? "Save Changes"
                : "Save Appointment"}
          </Button>
          {!isValid && (
            <p className="text-center text-xs text-gray-400">
              Complete the booking and resolve every conflict to enable saving.
            </p>
          )}
        </aside>

        <main className="col-span-12 min-w-0 xl:col-span-8 2xl:col-span-9">
          {service && scheduleStaffMembers.length === 0 ? <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/[0.02]">No active team members are assigned to {service.name}. Assign staff from the service details page before booking.</div> : <StaffSchedule
            date={appointmentDate}
            service={service}
            selectedStaffId={staffId}
            selectedTime={startTime}
            branchId={branchId}
            appointments={appointments}
            staffMembers={scheduleStaffMembers}
            businessHours={BUSINESS_HOURS}
            onDateChange={(selectedDate) => {
              setAppointmentDate(selectedDate);
              setStartTime("");
              resetSaveState();
            }}
            onSelectSlot={(selectedStaffId, selectedTime) => {
              setStaffId(selectedStaffId);
              setStartTime(selectedTime);
              resetSaveState();
            }}
          />}
        </main>
      </div>
    </div>
  );
}
