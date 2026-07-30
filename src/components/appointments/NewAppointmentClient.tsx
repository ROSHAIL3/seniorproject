"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import { BUSINESS_HOURS, getTodayIso } from "@/config/business";
import { CheckCircleIcon, ChevronLeftIcon } from "@/icons";
import {
  createAppointment,
  updateAppointmentBooking,
} from "@/services/appointments.service";
import type { Appointment } from "@/types/appointments";
import type { BookingValidationError } from "@/types/appointments";
import type { AppointmentSettings } from "@/types/appointment-settings";
import type { Branch } from "@/types/branches";
import type { Customer } from "@/types/customers";
import type { Service, ServiceCategory } from "@/types/services";
import type { ServiceBookingFieldDefinition, ServiceBookingFieldValueMap } from "@/types/services";
import type { StaffMember } from "@/types/staff";
import BookingToast, {
  type BookingToastMessage,
} from "./BookingToast";
import CustomerSearch from "./CustomerSearch";
import ServiceSelector from "./ServiceSelector";
import StaffSchedule from "./StaffSchedule";
import {
  addMinutes,
  type BookingValidationContext,
  validateBooking,
} from "./validation";
import ServiceBookingFieldsForm from "./ServiceBookingFieldsForm";
import { getBookableServices, getServiceById, getServiceCategories } from "@/services/services.service";
import { getPackageBookingOfferings, getPackageById, packageToBookingService } from "@/services/packages.service";
import { getStaffMembers } from "@/services/staff.service";
import { getServiceBookingFields } from "@/services/service-booking-fields.service";
import { getAppointmentSettings } from "@/services/appointment-settings.service";
import { useReturnNavigation } from "@/hooks/useGoBack";
import { withReturnTo } from "@/lib/navigation";

type NewAppointmentClientProps = {
  editingAppointment?: Appointment;
  initialAppointmentDate?: string;
  appointments: Appointment[];
  customers: Customer[];
  services: Service[];
  serviceCategories: ServiceCategory[];
  staffMembers: StaffMember[];
  serviceFields: ServiceBookingFieldDefinition[];
  initialServiceFieldValues?: ServiceBookingFieldValueMap;
  appointmentSettings: AppointmentSettings;
  branches: Branch[];
};

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
  serviceCategories,
  staffMembers,
  serviceFields,
  initialServiceFieldValues = {},
  appointmentSettings,
  branches,
}: NewAppointmentClientProps) {
  const router = useRouter();
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
  const activeBranches = branches.filter((branch) => branch.status === "Active");
  const defaultBranch =
    activeBranches.find((branch) => branch.isMain) ?? activeBranches[0];
  const currentHistoricalBranch = editingAppointment
    ? branches.find(
        (branch) =>
          branch.id === editingAppointment.branchId &&
          branch.status !== "Active",
      )
    : undefined;
  const selectableBranches = currentHistoricalBranch
    ? [...activeBranches, currentHistoricalBranch]
    : activeBranches;
  const branchOptions = selectableBranches.map((branch) => ({
    value: branch.id,
    label:
      branch.status === "Active"
        ? branch.name
        : `${branch.name} (${branch.status.toLowerCase()})`,
  }));
  const branchNames = Object.fromEntries(
    branches.map((branch) => [branch.id, branch.name]),
  );
  const [branchId, setBranchId] = useState(
    editingAppointment?.branchId ?? defaultBranch?.id ?? "",
  );
  const [appointmentDate, setAppointmentDate] = useState(
    editingAppointment?.appointmentDate ??
      initialAppointmentDate ??
      getTodayIso(),
  );
  const [staffId, setStaffId] = useState(editingAppointment?.staffId ?? "");
  const [startTime, setStartTime] = useState(editingAppointment?.startTime ?? "");
  const [notes, setNotes] = useState(editingAppointment?.notes ?? "");
  const [saveState, setSaveState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [selectionErrors, setSelectionErrors] = useState<
    BookingValidationError[]
  >([]);
  const [toast, setToast] = useState<BookingToastMessage | null>(null);
  const [serviceFieldValues, setServiceFieldValues] = useState<ServiceBookingFieldValueMap>(initialServiceFieldValues);
  const [currentServices, setCurrentServices] = useState(services); const [currentServiceCategories, setCurrentServiceCategories] = useState(serviceCategories); const [currentStaffMembers, setCurrentStaffMembers] = useState(staffMembers); const [currentServiceFields, setCurrentServiceFields] = useState(serviceFields);
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
  useEffect(() => { queueMicrotask(() => { Promise.all([getBookableServices(), getPackageBookingOfferings(), getServiceCategories(), getStaffMembers(), getAppointmentSettings()]).then(async ([catalogServices, packageOfferings, nextCategories, nextStaff, nextAppointmentSettings]) => { const nextServices = [...catalogServices, ...packageOfferings]; if (editingAppointment && !nextServices.some((item) => item.id === editingAppointment.serviceId)) { const historical = await getServiceById(editingAppointment.serviceId); const historicalPackage = historical ? null : await getPackageById(editingAppointment.serviceId); if (historical) nextServices.push(historical); else if (historicalPackage) nextServices.push(await packageToBookingService(historicalPackage)); } setCurrentServices(nextServices); setCurrentServiceCategories(nextCategories); setCurrentStaffMembers(nextStaff); setCurrentAppointmentSettings(nextAppointmentSettings); setCurrentServiceFields((await Promise.all(nextServices.map((item) => getServiceBookingFields(item.id)))).flat()); }); }); }, [editingAppointment]);
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
  const closeToast = useCallback(() => setToast(null), []);
  const showToast = useCallback(
    (
      type: BookingToastMessage["type"],
      title: string,
      message: string,
    ) => {
      setToast({ id: Date.now(), type, title, message });
    },
    [],
  );
  const showValidationToast = useCallback(
    (errors: BookingValidationError[]) => {
      const nextToast = getValidationToast(
        errors,
        service,
        serviceFieldErrors,
      );
      showToast("error", nextToast.title, nextToast.message);
    },
    [service, serviceFieldErrors, showToast],
  );
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
      showValidationToast(latestValidationErrors);
      return;
    }
    setSaveState("loading");
    const input = {
      ...formData,
      endTime: addMinutes(startTime, service.durationMinutes),
      status: editingAppointment?.status ?? ("Booked" as const),
      createdBy: editingAppointment?.createdBy ?? "Dashboard user",
      notes: notes.trim() || undefined,
      serviceFieldValues,
    };
    try {
      const savedAppointment = editingAppointment
        ? await updateAppointmentBooking(editingAppointment.id, input)
        : await createAppointment(input);
      setSaveState("success");
      showToast(
        "success",
        editingAppointment ? "Appointment Updated" : "Appointment Created",
        editingAppointment
          ? "The appointment changes were saved successfully."
          : "The appointment has been booked successfully.",
      );
      const destination = editingAppointment
        ? back.destination
        : withReturnTo(
            `/appointments/${savedAppointment.bookingNumber}`,
            back.destination,
          );
      router.replace(destination);
    } catch (caught) {
      setSaveState("error");
      showToast(
        "error",
        "Booking Failed",
        caught instanceof Error
          ? caught.message
          : "The appointment could not be saved. Please try again.",
      );
    }
  };

  return (
    <div className="space-y-3 xl:flex xl:h-[calc(100dvh-9.25rem)] xl:min-h-0 xl:flex-col xl:space-y-0 xl:overflow-hidden">
      {toast && (
        <BookingToast key={toast.id} toast={toast} onClose={closeToast} />
      )}
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between xl:mb-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            {editingAppointment ? "Edit Appointment" : "Book Appointment"}
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Choose a customer and service, then select an available staff time.
          </p>
        </div>
        <Link
          href={back.destination}
          aria-label={`Back to ${back.label}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-500 dark:text-gray-400"
        >
          <ChevronLeftIcon className="size-4" />
          Back to {back.label}
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-6 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(320px,30%)_minmax(0,70%)] xl:gap-0 xl:overflow-hidden xl:rounded-2xl xl:border xl:border-gray-200 xl:bg-white dark:xl:border-gray-800 dark:xl:bg-white/[0.03]">
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
                  if (
                    service &&
                    !service.staffIds.some((assignedStaffId) =>
                      currentStaffMembers.some(
                        (staff) =>
                          staff.id === assignedStaffId &&
                          staff.isActive &&
                          staff.branchId === value,
                      ),
                    )
                  ) {
                    setService(null);
                    setServiceFieldValues({});
                  }
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
              categories={currentServiceCategories}
              staffMembers={currentStaffMembers}
              branchId={branchId}
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
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Notes
              </span>
              <TextArea
                value={notes}
                onChange={(value) => {
                  setNotes(value);
                  resetSaveState();
                }}
                rows={2}
                placeholder="Add appointment notes"
                className="min-h-[58px] max-h-24 resize-y !bg-transparent !text-gray-800 placeholder:!text-gray-400 dark:!text-white/90"
              />
            </label>
            <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
              <Button
                href={back.destination}
                size="sm"
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
              <div className="relative">
                <Button
                  onClick={saveAppointment}
                  disabled={!isValid || saveState === "loading"}
                  size="sm"
                  className="w-full"
                  startIcon={<CheckCircleIcon className="size-5" />}
                >
                  {saveState === "loading"
                    ? "Saving..."
                    : editingAppointment
                      ? "Save Changes"
                      : "Save Appointment"}
                </Button>
                {!isValid && saveState !== "loading" && (
                  <button
                    type="button"
                    onClick={() =>
                      showValidationToast(
                        selectionErrors.length > 0
                          ? selectionErrors
                          : validationErrors,
                      )
                    }
                    aria-label="Show why the appointment cannot be saved"
                    className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  />
                )}
              </div>
            </div>
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
            branchNames={branchNames}
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
            onValidationErrors={(errors) => {
              setSelectionErrors(errors);
              if (errors.length > 0) showValidationToast(errors);
            }}
          />}
        </main>
      </div>
    </div>
  );
}

function getValidationToast(
  errors: BookingValidationError[],
  service: Service | null,
  serviceFieldErrors: Record<string, string>,
) {
  const findError = (...codes: BookingValidationError["code"][]) =>
    errors.find((error) => codes.includes(error.code));
  const customerError = findError("missing-customer");
  if (customerError) {
    return {
      title: "Customer Required",
      message: "Please select a customer before booking.",
    };
  }

  const breakError = findError("business-break", "staff-break");
  if (breakError) {
    return {
      title: "Time Unavailable",
      message: breakError.message,
    };
  }

  const conflictError = findError(
    "staff-conflict",
    "customer-conflict",
    "overlap",
  );
  if (conflictError) {
    return {
      title: "Booking Conflict",
      message: conflictError.message,
    };
  }

  const fitError = findError(
    "service-duration",
    "business-hours",
    "staff-hours",
  );
  if (fitError) {
    return {
      title: "Service Doesn't Fit",
      message:
        fitError.message ||
        `The selected service requires ${service?.durationMinutes ?? 0} minutes and does not fit in the available time.`,
    };
  }

  const availabilityError = findError(
    "staff-day-off",
    "branch-conflict",
    "staff-service",
    "past",
  );
  if (availabilityError) {
    return {
      title: "Time Unavailable",
      message: availabilityError.message,
    };
  }

  const firstFieldError = Object.values(serviceFieldErrors)[0];
  const firstError = errors[0];
  return {
    title: "Missing Information",
    message:
      firstFieldError ||
      firstError?.message ||
      "Please complete all required fields.",
  };
}
