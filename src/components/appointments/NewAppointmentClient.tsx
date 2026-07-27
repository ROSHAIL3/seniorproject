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
import type { BookingValidationError } from "@/types/appointments";
import type { AppointmentSettings } from "@/types/appointment-settings";
import type { Customer } from "@/types/customers";
import type { Service } from "@/types/services";
import type { ServiceBookingFieldDefinition, ServiceBookingFieldValueMap } from "@/types/services";
import type { StaffMember } from "@/types/staff";
import BookingConflictAlert from "./BookingConflictAlert";
import CustomerSearch from "./CustomerSearch";
import ServiceSelector from "./ServiceSelector";
import StaffSchedule from "./StaffSchedule";
import {
  addMinutes,
  type BookingValidationContext,
  validateBooking,
} from "./validation";
import ServiceBookingFieldsForm from "./ServiceBookingFieldsForm";
import { getBookableServices, getServiceById } from "@/services/services.service";
import { getPackageBookingOfferings, getPackageById, packageToBookingService } from "@/services/packages.service";
import { getStaffMembers } from "@/services/staff.service";
import { getServiceBookingFields } from "@/services/service-booking-fields.service";
import { getAppointmentSettings } from "@/services/appointment-settings.service";
import { useReturnNavigation } from "@/hooks/useGoBack";

type NewAppointmentClientProps = {
  editingAppointment?: Appointment;
  initialAppointmentDate?: string;
  appointments: Appointment[];
  customers: Customer[];
  services: Service[];
  staffMembers: StaffMember[];
  serviceFields: ServiceBookingFieldDefinition[];
  initialServiceFieldValues?: ServiceBookingFieldValueMap;
  appointmentSettings: AppointmentSettings;
};

const branchOptions = [
  { value: "branch-manama", label: "Manama branch" },
  { value: "branch-seef", label: "Seef branch" },
];

const getCurrentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
};

export default function NewAppointmentClient({
  editingAppointment,
  initialAppointmentDate,
  appointments,
  customers,
  services,
  staffMembers,
  serviceFields,
  initialServiceFieldValues = {},
  appointmentSettings,
}: NewAppointmentClientProps) {
  const back = useReturnNavigation(
    editingAppointment
      ? `/appointments/${editingAppointment.bookingNumber}`
      : "/appointments",
    editingAppointment ? "Appointment" : "Appointments",
  );
  const [todayDate, setTodayDate] = useState(() => getTodayIso());
  const [currentTime, setCurrentTime] = useState(() => getCurrentTime());
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
  const [selectionErrors, setSelectionErrors] = useState<
    BookingValidationError[]
  >([]);
  const [serviceFieldValues, setServiceFieldValues] = useState<ServiceBookingFieldValueMap>(initialServiceFieldValues);
  const [currentServices, setCurrentServices] = useState(services); const [currentStaffMembers, setCurrentStaffMembers] = useState(staffMembers); const [currentServiceFields, setCurrentServiceFields] = useState(serviceFields);
  const [currentAppointmentSettings, setCurrentAppointmentSettings] =
    useState(appointmentSettings);
  useEffect(() => {
    const refreshClock = () => {
      setTodayDate(getTodayIso());
      setCurrentTime(getCurrentTime());
    };
    const intervalId = window.setInterval(refreshClock, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);
  useEffect(() => { queueMicrotask(() => { Promise.all([getBookableServices(), getPackageBookingOfferings(), getStaffMembers(), getAppointmentSettings()]).then(async ([catalogServices, packageOfferings, nextStaff, nextAppointmentSettings]) => { const nextServices = [...catalogServices, ...packageOfferings]; if (editingAppointment && !nextServices.some((item) => item.id === editingAppointment.serviceId)) { const historical = await getServiceById(editingAppointment.serviceId); const historicalPackage = historical ? null : await getPackageById(editingAppointment.serviceId); if (historical) nextServices.push(historical); else if (historicalPackage) nextServices.push(await packageToBookingService(historicalPackage)); } setCurrentServices(nextServices); setCurrentStaffMembers(nextStaff); setCurrentAppointmentSettings(nextAppointmentSettings); setCurrentServiceFields((await Promise.all(nextServices.map((item) => getServiceBookingFields(item.id)))).flat()); }); }); }, [editingAppointment]);
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
  const validationContext = useMemo<BookingValidationContext>(
    () => ({
      appointments,
      services: currentServices,
      staffMembers: currentStaffMembers,
      businessHours: BUSINESS_HOURS,
      appointmentSettings: currentAppointmentSettings,
      today: todayDate,
      currentTime,
    }),
    [
      appointments,
      currentAppointmentSettings,
      currentServices,
      currentStaffMembers,
      currentTime,
      todayDate,
    ],
  );

  const validationErrors = useMemo(
    () =>
      validateBooking(
        formData,
        validationContext,
        { ignoreAppointmentId: editingAppointment?.id },
      ),
    [editingAppointment?.id, formData, validationContext],
  );

  const selectedStaff = currentStaffMembers.find((staff) => staff.id === staffId);
  const scheduleStaffMembers = service
    ? currentStaffMembers.filter(
        (staff) =>
          service.staffIds.includes(staff.id) || staff.id === staffId,
      )
    : currentStaffMembers;
  const isValid =
    validationErrors.length === 0 &&
    selectionErrors.length === 0 &&
    Object.keys(serviceFieldErrors).length === 0;
  const resetSaveState = () => {
    setSaveState("idle");
    setSelectionErrors([]);
  };
  const dayOfWeek = new Date(`${appointmentDate}T00:00:00Z`).getUTCDay();
  const selectedBusinessDay = currentAppointmentSettings.businessHours.find(
    (day) => day.dayOfWeek === dayOfWeek,
  );
  const scheduleBusinessHours =
    selectedBusinessDay?.isOpen
      ? {
          startTime: selectedBusinessDay.startTime,
          endTime: selectedBusinessDay.endTime,
        }
      : BUSINESS_HOURS;
  const displayedValidationErrors =
    selectionErrors.length > 0
      ? selectionErrors
      : startTime
        ? validationErrors
        : validationErrors.slice(0, 1);

  const saveAppointment = async () => {
    const latestValidationErrors = validateBooking(
      formData,
      validationContext,
      { ignoreAppointmentId: editingAppointment?.id },
    );
    if (
      latestValidationErrors.length > 0 ||
      Object.keys(serviceFieldErrors).length > 0 ||
      !service
    ) {
      setSelectionErrors(latestValidationErrors);
      setSaveState("idle");
      return;
    }
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
    <div className="space-y-4 xl:flex xl:h-[calc(100dvh-9.25rem)] xl:min-h-0 xl:flex-col xl:space-y-0 xl:overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:mb-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            {editingAppointment ? "Edit Appointment" : "Book Appointment"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose a customer and service, then select an available staff time.
          </p>
        </div>
        <Link
          href={back.destination}
          aria-label={`Back to ${back.label}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-500 dark:text-gray-400"
        >
          <ChevronLeftIcon className="size-4" />
          Back to {back.label}
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

      <div className="grid grid-cols-12 gap-6 xl:min-h-0 xl:flex-1 xl:grid-cols-[340px_minmax(0,1fr)] xl:gap-0 xl:overflow-hidden xl:rounded-2xl xl:border xl:border-gray-200 xl:bg-white dark:xl:border-gray-800 dark:xl:bg-white/[0.03]">
        <aside className="col-span-12 space-y-4 xl:col-auto xl:grid xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)_auto] xl:gap-3 xl:space-y-0 xl:overflow-hidden xl:border-r xl:border-gray-200 xl:p-3 dark:xl:border-gray-800">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] xl:rounded-xl xl:border-0 xl:bg-transparent xl:p-0 dark:xl:bg-transparent">
            <CustomerSearch
              selectedCustomer={customer}
              initialCustomers={customers}
              onSelect={(selectedCustomer) => {
                setCustomer(selectedCustomer);
                resetSaveState();
              }}
            />
            <div className="mt-3">
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

          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] xl:flex xl:min-h-0 xl:flex-col xl:overflow-hidden xl:rounded-none xl:border-x-0 xl:border-b-0 xl:border-t xl:bg-transparent xl:px-0 xl:pb-0 xl:pt-3 dark:xl:bg-transparent">
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

          <div className="space-y-2 xl:z-40 xl:min-w-0 xl:border-t xl:border-gray-200 xl:bg-white xl:pt-3 dark:xl:border-gray-800 dark:xl:bg-gray-900">
            {startTime && (
              <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 dark:border-brand-500/30 dark:bg-brand-500/10">
                <p className="truncate text-xs font-semibold text-gray-800 dark:text-white/90">
                  <span className="uppercase tracking-wide text-brand-700 dark:text-brand-400">
                    Selected
                  </span>
                  {" · "}
                  {selectedStaff?.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-300">
                  {appointmentDate} · {startTime}
                  {service
                    ? `–${addMinutes(startTime, service.durationMinutes)} · ${service.name} · ${formatBhd(service.priceBhd)}`
                    : ""}
                </p>
              </div>
            )}
            {displayedValidationErrors.length > 0 && (
              <BookingConflictAlert errors={displayedValidationErrors} />
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
          </div>
        </aside>

        <main className="col-span-12 min-w-0 xl:col-auto xl:min-h-0">
          {service && scheduleStaffMembers.length === 0 ? <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/[0.02]">No active team members are assigned to {service.name}. Assign staff from the service details page before booking.</div> : <StaffSchedule
            date={appointmentDate}
            service={service}
            selectedStaffId={staffId}
            selectedTime={startTime}
            selectedCustomerId={customer?.id ?? ""}
            selectedCustomerName={customer?.name ?? ""}
            branchId={branchId}
            appointments={appointments}
            staffMembers={scheduleStaffMembers}
            businessHours={scheduleBusinessHours}
            validationContext={validationContext}
            minDate={editingAppointment ? undefined : todayDate}
            ignoreAppointmentId={editingAppointment?.id}
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
            onValidationErrors={setSelectionErrors}
          />}
        </main>
      </div>
    </div>
  );
}
