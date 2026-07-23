"use client";

import Button from "@/components/ui/button/Button";
import Switch from "@/components/form/switch/Switch";
import {
  AlertIcon,
  ChatIcon,
  ChevronDownIcon,
  InfoIcon,
  MailIcon,
  PlusIcon,
  TrashBinIcon,
} from "@/icons";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type EventId =
  | "appointment-booked"
  | "appointment-confirmed"
  | "appointment-reminder"
  | "appointment-cancelled"
  | "appointment-rescheduled"
  | "appointment-completed"
  | "invoice-created"
  | "payment-received";

type StaffEventId =
  | "staff-appointment-booked"
  | "staff-appointment-reminder"
  | "staff-appointment-cancelled"
  | "staff-appointment-rescheduled"
  | "staff-no-show";

type EditorEventId = EventId | StaffEventId;
type TabId = "customer" | "staff" | "log";

type Template = {
  enabled: boolean;
  subject: string;
  message: string;
};

type EventDefinition = {
  id: EditorEventId;
  title: string;
  trigger: string;
  required: VariableName[];
  template: Template;
};

type VariableName = keyof typeof previewValues;
type ActiveField = "subject" | "message";

const previewValues = {
  customer_name: "Sarah Ahmed",
  customer_phone: "+973 3300 1122",
  customer_email: "sarah@example.com",
  staff_name: "Mohammed Hassan",
  service_name: "Hair & Makeup",
  booking_number: "BK-000042",
  date: "April 9, 2026",
  time: "10:30 AM",
  duration: "60 minutes",
  price: "15.000 BHD",
  org_name: "Glamour Salon",
  org_phone: "+973 1700 2200",
  invoice_number: "INV-000012",
  invoice_total: "15.000 BHD",
} as const;

const variableNames = Object.keys(previewValues) as VariableName[];
const validVariableSet = new Set<string>(variableNames);
const token = (name: VariableName) => `{{${name}}}`;

const customerEvents: EventDefinition[] = [
  {
    id: "appointment-booked",
    title: "Appointment booked",
    trigger: "When a new appointment is created",
    required: ["date", "time"],
    template: {
      enabled: true,
      subject: "Booking confirmation — {{booking_number}}",
      message:
        "Hi {{customer_name}},\n\nYour appointment has been booked!\n\n📅 {{date}} at {{time}}\n💇 {{service_name}} with {{staff_name}}\n💰 {{price}}\n🎟 Booking #{{booking_number}}\n\nThank you for choosing {{org_name}}.",
    },
  },
  {
    id: "appointment-confirmed",
    title: "Appointment confirmed",
    trigger: "When status changes to confirmed",
    required: ["date", "time"],
    template: {
      enabled: true,
      subject: "Appointment confirmed — {{booking_number}}",
      message:
        "Hi {{customer_name}},\n\nYour appointment {{booking_number}} on {{date}} at {{time}} has been confirmed.\n\nSee you soon!\n{{org_name}}",
    },
  },
  {
    id: "appointment-reminder",
    title: "Appointment reminder",
    trigger: "Scheduled before the appointment",
    required: ["date", "time"],
    template: {
      enabled: true,
      subject: "Reminder: Your appointment — {{booking_number}}",
      message:
        "Hi {{customer_name}},\n\nJust a reminder about your upcoming appointment:\n\n📅 {{date}} at {{time}}\n💇 {{service_name}} with {{staff_name}}\n\nSee you soon!\n{{org_name}}",
    },
  },
  {
    id: "appointment-cancelled",
    title: "Appointment cancelled",
    trigger: "When an appointment is cancelled",
    required: ["date"],
    template: {
      enabled: true,
      subject: "Appointment cancelled — {{booking_number}}",
      message:
        "Hi {{customer_name}},\n\nYour appointment {{booking_number}} on {{date}} at {{time}} has been cancelled.\n\nIf this was a mistake, please contact us.\n{{org_name}}",
    },
  },
  {
    id: "appointment-rescheduled",
    title: "Appointment rescheduled",
    trigger: "When date, time, or staff changes",
    required: ["date", "time"],
    template: {
      enabled: true,
      subject: "Appointment rescheduled — {{booking_number}}",
      message:
        "Hi {{customer_name}},\n\nYour appointment {{booking_number}} has been rescheduled:\n\n📅 New: {{date}} at {{time}}\n💇 {{service_name}} with {{staff_name}}\n\n{{org_name}}",
    },
  },
  {
    id: "appointment-completed",
    title: "Appointment completed",
    trigger: "When marked as completed",
    required: ["booking_number"],
    template: {
      enabled: true,
      subject: "Thank you for your visit — {{booking_number}}",
      message:
        "Hi {{customer_name}},\n\nThank you for visiting {{org_name}}!\n\nWe hope you enjoyed your {{service_name}}. We look forward to seeing you again.\n\n{{org_name}}",
    },
  },
  {
    id: "invoice-created",
    title: "Invoice created",
    trigger: "When an invoice is generated",
    required: ["invoice_number"],
    template: {
      enabled: true,
      subject: "Invoice {{invoice_number}} from {{org_name}}",
      message:
        "Hi {{customer_name}},\n\nA new invoice has been generated:\n\nInvoice #: {{invoice_number}}\nTotal: {{invoice_total}}\n\nThank you for your business.\n{{org_name}}",
    },
  },
  {
    id: "payment-received",
    title: "Payment received",
    trigger: "When a payment is recorded",
    required: ["invoice_number"],
    template: {
      enabled: true,
      subject: "Payment received — {{invoice_number}}",
      message:
        "Hi {{customer_name}},\n\nWe have received your payment for invoice {{invoice_number}}.\n\nThank you!\n{{org_name}}",
    },
  },
];

const staffEvents: EventDefinition[] = [
  {
    id: "staff-appointment-booked",
    title: "Appointment booked",
    trigger: "When a new appointment is created",
    required: ["customer_name", "date", "time"],
    template: {
      enabled: true,
      subject: "New booking assigned — {{booking_number}}",
      message:
        "Hi {{staff_name}},\n\nA new appointment has been assigned to you:\n\n👤 Customer: {{customer_name}}\n📅 {{date}} at {{time}}\n💇 {{service_name}}\n⏱ {{duration}}\n🎟 Ref: {{booking_number}}\n\n— {{org_name}}",
    },
  },
  {
    id: "staff-appointment-reminder",
    title: "Appointment reminder",
    trigger: "Scheduled before the appointment",
    required: ["customer_name", "date", "time"],
    template: {
      enabled: true,
      subject: "Upcoming appointment — {{booking_number}}",
      message:
        "Hi {{staff_name}},\n\nReminder: you have an upcoming appointment.\n\n👤 Customer: {{customer_name}}\n📅 {{date}} at {{time}}\n💇 {{service_name}}\n\nPlease be ready.\n— {{org_name}}",
    },
  },
  {
    id: "staff-appointment-cancelled",
    title: "Appointment cancelled",
    trigger: "When an appointment is cancelled",
    required: ["customer_name", "date"],
    template: {
      enabled: true,
      subject: "Appointment cancelled — {{booking_number}}",
      message:
        "Hi {{staff_name}},\n\nThe following appointment has been cancelled:\n\n👤 Customer: {{customer_name}}\n📅 {{date}} at {{time}}\n💇 {{service_name}}\n🎟 Ref: {{booking_number}}\n\nYour schedule has been updated.\n— {{org_name}}",
    },
  },
  {
    id: "staff-appointment-rescheduled",
    title: "Appointment rescheduled",
    trigger: "When date, time, or staff changes",
    required: ["customer_name", "date", "time"],
    template: {
      enabled: true,
      subject: "Appointment rescheduled — {{booking_number}}",
      message:
        "Hi {{staff_name}},\n\nAn appointment has been rescheduled:\n\n👤 Customer: {{customer_name}}\n📅 New: {{date}} at {{time}}\n💇 {{service_name}}\n🎟 Ref: {{booking_number}}\n\n— {{org_name}}",
    },
  },
  {
    id: "staff-no-show",
    title: "No-show",
    trigger: "When customer is marked as no-show",
    required: ["customer_name", "date"],
    template: {
      enabled: true,
      subject: "No-show: {{customer_name}} — {{booking_number}}",
      message:
        "Hi {{staff_name}},\n\n{{customer_name}} did not show up for their appointment:\n\n📅 {{date}} at {{time}}\n💇 {{service_name}}\n🎟 Ref: {{booking_number}}\n\n— {{org_name}}",
    },
  },
];

const allEvents = [...customerEvents, ...staffEvents];

const initialTemplates = Object.fromEntries(
  allEvents.map((event) => [event.id, event.template]),
) as Record<EditorEventId, Template>;

const scheduleOptions = [
  { id: "day-1", label: "1 day before" },
  { id: "hour-24", label: "24 hours before" },
  { id: "hour-1", label: "1 hour before" },
] as const;

const storageKey = "slotova-notification-settings-v1";

function validTokens(value: string) {
  return [...value.matchAll(/\{\{([a-z_]+)\}\}/g)].map((match) => match[1]);
}

function malformedTokens(value: string) {
  const candidates = value.match(/\{[^{}\n]*\}|\{\{[^{}\n]*\}\}/g) ?? [];
  return candidates.filter((candidate) => {
    const match = candidate.match(/^\{\{([a-z_]+)\}\}$/);
    return !match || !validVariableSet.has(match[1]);
  });
}

function duplicates(value: string) {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const name of validTokens(value)) {
    if (seen.has(name)) repeated.add(name);
    seen.add(name);
  }
  return [...repeated];
}

function interpolate(value: string) {
  return value.replace(
    /\{\{([a-z_]+)\}\}/g,
    (match, name: string, offset: number, source: string) => {
      if (!validVariableSet.has(name)) return match;
      const replacement = previewValues[name as VariableName];
      const before = source[offset - 1] ?? "";
      const after = source[offset + match.length] ?? "";
      const prefix = /[\p{L}\p{N}]/u.test(before) ? " " : "";
      const suffix = /[\p{L}\p{N}]/u.test(after) ? " " : "";
      return `${prefix}${replacement}${suffix}`;
    },
  );
}

function loadStoredSettings() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as {
      templates?: Partial<Record<EditorEventId, Template>>;
      timings?: string[];
      schedules?: Partial<Record<"customer" | "staff", string[]>>;
    } | null;
  } catch {
    return null;
  }
}

export default function NotificationsSettingsClient() {
  const [activeTab, setActiveTab] = useState<TabId>("customer");
  const [selectedId, setSelectedId] =
    useState<EditorEventId>("appointment-booked");
  const [templates, setTemplates] =
    useState<Record<EditorEventId, Template>>(initialTemplates);
  const [savedTemplates, setSavedTemplates] =
    useState<Record<EditorEventId, Template>>(initialTemplates);
  const [schedules, setSchedules] = useState<
    Record<"customer" | "staff", string[]>
  >({ customer: ["day-1"], staff: ["day-1"] });
  const [savedSchedules, setSavedSchedules] = useState<
    Record<"customer" | "staff", string[]>
  >({ customer: ["day-1"], staff: ["day-1"] });
  const [timingToAdd, setTimingToAdd] = useState("");
  const [activeField, setActiveField] = useState<ActiveField>("message");
  const [notice, setNotice] = useState("");
  const [attemptedSave, setAttemptedSave] = useState(false);
  const subjectRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = loadStoredSettings();
    if (!stored) return;
    const nextTemplates = { ...initialTemplates, ...stored.templates };
    const nextSchedules = {
      customer:
        stored.schedules?.customer ??
        (stored.timings?.length ? stored.timings : ["day-1"]),
      staff: stored.schedules?.staff ?? ["day-1"],
    };
    const frame = window.requestAnimationFrame(() => {
      setTemplates(nextTemplates);
      setSavedTemplates(nextTemplates);
      setSchedules(nextSchedules);
      setSavedSchedules(nextSchedules);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const activeEvents = activeTab === "staff" ? staffEvents : customerEvents;
  const scheduleAudience = selectedId.startsWith("staff-")
    ? "staff"
    : "customer";
  const timings = schedules[scheduleAudience];
  const event =
    allEvents.find((item) => item.id === selectedId) ?? customerEvents[0];
  const template = templates[selectedId];
  const combined = `${template.subject}\n${template.message}`;
  const missing = event.required.filter(
    (name) => !validTokens(combined).includes(name),
  );
  const malformed = [
    ...new Set([
      ...malformedTokens(template.subject),
      ...malformedTokens(template.message),
    ]),
  ];
  const duplicateNames = [
    ...new Set([
      ...duplicates(template.subject),
      ...duplicates(template.message),
    ]),
  ];
  const hasBlockingErrors = missing.length > 0 || malformed.length > 0;
  const isDirty =
    JSON.stringify(template) !== JSON.stringify(savedTemplates[selectedId]);
  const scheduleDirty =
    JSON.stringify(timings) !==
    JSON.stringify(savedSchedules[scheduleAudience]);

  const selectEvent = (id: EditorEventId) => {
    setSelectedId(id);
    setAttemptedSave(false);
    setNotice("");
  };

  const updateTemplate = (changes: Partial<Template>) => {
    setTemplates((current) => ({
      ...current,
      [selectedId]: { ...current[selectedId], ...changes },
    }));
    setNotice("");
  };

  const persist = (
    nextTemplates: Record<EditorEventId, Template>,
    nextSchedules: Record<"customer" | "staff", string[]>,
  ) => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ templates: nextTemplates, schedules: nextSchedules }),
    );
  };

  const saveTemplate = () => {
    setAttemptedSave(true);
    if (hasBlockingErrors) {
      setNotice("Fix the highlighted template issues before saving.");
      return;
    }
    setSavedTemplates((current) => ({ ...current, [selectedId]: template }));
    persist(templates, schedules);
    setNotice("Email template saved.");
    setAttemptedSave(false);
  };

  const saveSchedule = () => {
    if (!timings.length) {
      setNotice("Add at least one reminder timing before saving.");
      return;
    }
    setSavedSchedules((current) => ({
      ...current,
      [scheduleAudience]: timings,
    }));
    persist(templates, schedules);
    setNotice("Reminder schedule saved.");
  };

  const insertToken = (name: VariableName) => {
    const field = activeField;
    const element = field === "subject" ? subjectRef.current : messageRef.current;
    const currentValue =
      field === "subject" ? template.subject : template.message;
    const start = element?.selectionStart ?? currentValue.length;
    const end = element?.selectionEnd ?? start;
    const valueToInsert = token(name);

    if (
      currentValue.slice(Math.max(0, start - valueToInsert.length), start) ===
        valueToInsert ||
      currentValue.slice(end, end + valueToInsert.length) === valueToInsert
    ) {
      setNotice(`${valueToInsert} is already at the cursor.`);
      return;
    }

    const nextValue =
      currentValue.slice(0, start) + valueToInsert + currentValue.slice(end);
    updateTemplate(
      field === "subject"
        ? { subject: nextValue }
        : { message: nextValue },
    );
    const caret = start + valueToInsert.length;
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(caret, caret);
    });
  };

  const addTiming = () => {
    if (!timingToAdd || timings.includes(timingToAdd)) return;
    setSchedules((current) => ({
      ...current,
      [scheduleAudience]: [...current[scheduleAudience], timingToAdd],
    }));
    setTimingToAdd("");
    setNotice("");
  };

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl">
          Notification Settings
        </h1>
        <nav
          className="mt-4 flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800"
          aria-label="Notification settings sections"
        >
          {(
            [
              ["customer", "Customer Notifications"],
              ["staff", "Staff Notifications"],
              ["log", "Notification Log"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id);
                if (id === "customer") selectEvent("appointment-booked");
                if (id === "staff") selectEvent("staff-appointment-booked");
              }}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition ${
                activeTab === id
                  ? "border-brand-600 text-brand-800 dark:border-brand-400 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "log" ? (
        <NotificationLog />
      ) : (
        <>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            Notifications sent to {activeTab === "staff" ? "staff" : "customers"} when these events occur.
          </p>
          <ChannelOverview />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <EventMenu
          events={activeEvents}
          selectedId={selectedId}
          onSelect={selectEvent}
        />

        <main className="min-w-0">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {event.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {event.trigger}
            </p>
          </div>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2.5 text-base font-medium text-gray-900 dark:text-white">
                <span className="inline-flex size-6 shrink-0 items-center justify-center overflow-visible [&>svg]:size-5 [&>svg]:shrink-0">
                  <MailIcon />
                </span>
                Email
              </div>
              <Switch
                label=""
                checked={template.enabled}
                onChange={(enabled) => updateTemplate({ enabled })}
              />
            </div>

            {(selectedId === "appointment-reminder" ||
              selectedId === "staff-appointment-reminder") && (
              <ReminderSchedule
                timings={timings}
                timingToAdd={timingToAdd}
                dirty={scheduleDirty}
                onTimingChange={setTimingToAdd}
                onAdd={addTiming}
                onRemove={(id) =>
                  setSchedules((current) => ({
                    ...current,
                    [scheduleAudience]: current[scheduleAudience].filter(
                      (item) => item !== id,
                    ),
                  }))
                }
                onSave={saveSchedule}
              />
            )}

            <div className="mt-6">
              <label
                htmlFor="notification-subject"
                className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400"
              >
                Subject
              </label>
              <input
                ref={subjectRef}
                id="notification-subject"
                value={template.subject}
                onFocus={() => setActiveField("subject")}
                onSelect={() => setActiveField("subject")}
                onChange={(event) => updateTemplate({ subject: event.target.value })}
                className={`h-11 w-full rounded-lg border bg-transparent px-3.5 text-sm text-gray-900 shadow-theme-xs outline-hidden transition focus:ring-3 dark:bg-gray-900 dark:text-white ${
                  attemptedSave && malformedTokens(template.subject).length
                    ? "border-error-500 focus:border-error-400 focus:ring-error-500/10"
                    : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-700"
                }`}
              />
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="notification-message"
                  className="text-xs font-medium text-gray-600 dark:text-gray-400"
                >
                  Message body
                </label>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <InfoIcon className="size-4 shrink-0" />
                  <span>Required:</span>
                  {event.required.map((name) => (
                    <code
                      key={name}
                      className={
                        missing.includes(name)
                          ? "font-semibold text-error-500"
                          : "font-semibold text-success-600 dark:text-success-400"
                      }
                    >
                      {token(name)}
                    </code>
                  ))}
                </div>
              </div>
              <textarea
                ref={messageRef}
                id="notification-message"
                rows={10}
                value={template.message}
                onFocus={() => setActiveField("message")}
                onSelect={() => setActiveField("message")}
                onChange={(event) => updateTemplate({ message: event.target.value })}
                className={`w-full resize-y rounded-lg border bg-transparent px-3.5 py-3 text-sm leading-6 text-gray-900 shadow-theme-xs outline-hidden transition focus:ring-3 dark:bg-gray-900 dark:text-white ${
                  attemptedSave &&
                  (malformedTokens(template.message).length || missing.length)
                    ? "border-error-500 focus:border-error-400 focus:ring-error-500/10"
                    : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-700"
                }`}
              />
            </div>

            <VariableTokens
              duplicateNames={duplicateNames}
              malformed={malformed}
              onInsert={insertToken}
            />

            {(missing.length > 0 ||
              malformed.length > 0 ||
              duplicateNames.length > 0) && (
              <ValidationSummary
                missing={missing}
                malformed={malformed}
                duplicates={duplicateNames}
                showErrors={attemptedSave}
              />
            )}

            <LivePreview template={template} />

            <div className="mt-4 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
              <p
                aria-live="polite"
                className={`min-h-5 text-sm ${
                  notice.includes("saved")
                    ? "text-success-600 dark:text-success-400"
                    : "text-error-500"
                }`}
              >
                {notice}
              </p>
              <Button
                size="sm"
                onClick={saveTemplate}
                disabled={!isDirty && !hasBlockingErrors}
                className="w-full sm:w-auto"
              >
                Save Template
              </Button>
            </div>
          </section>

          <div className="mt-4 space-y-4">
            <ChannelCard
              icon={<ChatIcon />}
              name="WhatsApp"
              approved
            />
            <ChannelCard icon={<ChatIcon />} name="SMS" />
          </div>
        </main>
      </div>
        </>
      )}
    </div>
  );
}

function ChannelOverview() {
  const channels = [
    {
      name: "Email",
      detail: "Enabled",
      icon: <MailIcon />,
      active: true,
    },
    {
      name: "WhatsApp",
      detail: "Not activated — Channels & Add-ons",
      icon: <ChatIcon />,
      active: false,
    },
    {
      name: "SMS",
      detail: "Not activated — Channels & Add-ons",
      icon: <ChatIcon />,
      active: false,
    },
  ];
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      {channels.map((channel) => (
        <div
          key={channel.name}
          className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex size-5 shrink-0 items-center justify-center overflow-visible text-gray-700 dark:text-gray-300 [&>svg]:size-4 [&>svg]:shrink-0">
              {channel.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                {channel.name}
              </span>
              <span className="block truncate text-[11px] text-gray-400">
                {channel.detail}
              </span>
            </span>
          </div>
          <span
            className={`size-2.5 shrink-0 rounded-full ring-4 ${
              channel.active
                ? "bg-success-500 ring-success-50 dark:ring-success-500/15"
                : "bg-gray-300 ring-gray-50 dark:bg-gray-600 dark:ring-gray-800"
            }`}
          />
        </div>
      ))}
    </div>
  );
}

const notificationLogRows = [
  ["Jul 16, 10:55 PM", "Appointment booked", "sms", "Customer", "78945612", "skipped"],
  ["Jul 16, 10:55 PM", "Appointment booked", "whatsapp", "Customer", "78945612", "skipped"],
  ["Jul 16, 10:55 PM", "Appointment booked", "email", "Staff", "staff@slotova.com", "sent"],
  ["Jul 16, 09:05 PM", "Invoice created", "sms", "Customer", "+973 3876 4976", "skipped"],
  ["Jul 16, 09:05 PM", "Invoice created", "whatsapp", "Customer", "+973 3876 4976", "skipped"],
  ["Jul 16, 09:05 PM", "Invoice created", "email", "Customer", "sarah@example.com", "sent"],
  ["Jul 16, 09:04 PM", "Appointment confirmed", "sms", "Customer", "+973 3876 4976", "skipped"],
  ["Jul 16, 09:04 PM", "Appointment confirmed", "whatsapp", "Customer", "+973 3876 4976", "skipped"],
  ["Jul 16, 09:04 PM", "Appointment confirmed", "email", "Customer", "sarah@example.com", "sent"],
  ["Jul 16, 08:41 PM", "Appointment reminder", "email", "Staff", "staff@slotova.com", "sent"],
  ["Jul 16, 08:41 PM", "Appointment reminder", "email", "Customer", "sarah@example.com", "sent"],
  ["Jul 16, 08:40 PM", "Payment received", "sms", "Customer", "+973 3876 4976", "skipped"],
  ["Jul 16, 08:40 PM", "Payment received", "whatsapp", "Customer", "+973 3876 4976", "skipped"],
  ["Jul 16, 08:40 PM", "Payment received", "email", "Customer", "sarah@example.com", "sent"],
] as const;

function NotificationLog() {
  const [channel, setChannel] = useState("all");
  const [recipient, setRecipient] = useState("all");
  const [refreshedAt, setRefreshedAt] = useState("");
  const rows = notificationLogRows.filter(
    (row) =>
      (channel === "all" || row[2] === channel) &&
      (recipient === "all" || row[3].toLowerCase() === recipient),
  );

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Recent notifications sent by the system.
          </p>
          {refreshedAt && (
            <p className="mt-1 text-xs text-success-600 dark:text-success-400">
              Refreshed {refreshedAt}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <LogFilter
            label="Channel"
            value={channel}
            onChange={setChannel}
            options={[
              ["all", "All channels"],
              ["email", "Email"],
              ["whatsapp", "WhatsApp"],
              ["sms", "SMS"],
            ]}
          />
          <LogFilter
            label="Recipient"
            value={recipient}
            onChange={setRecipient}
            options={[
              ["all", "All recipients"],
              ["customer", "Customer"],
              ["staff", "Staff"],
            ]}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setRefreshedAt(
                new Intl.DateTimeFormat(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                }).format(new Date()),
              )
            }
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-400">
              <tr>
                {["Time", "Event", "Channel", "To", "Contact", "Status"].map(
                  (heading) => (
                    <th key={heading} className="px-5 py-3.5">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((row, index) => (
                <tr
                  key={`${row.join("-")}-${index}`}
                  className="text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.02]"
                >
                  <td className="whitespace-nowrap px-5 py-3.5 text-xs">{row[0]}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium">{row[1]}</td>
                  <td className="px-5 py-3.5">
                    <ChannelBadge channel={row[2]} />
                  </td>
                  <td className="px-5 py-3.5">{row[3]}</td>
                  <td className="px-5 py-3.5">{row[4]}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-medium ${
                        row[5] === "sent"
                          ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                          : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"
                      }`}
                    >
                      {row[5]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="px-5 py-12 text-center text-sm text-gray-500">
            No notifications match these filters.
          </p>
        )}
      </div>
    </section>
  );
}

function LogFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <div>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs text-gray-700 outline-hidden focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
      >
        {options.map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const classes =
    channel === "email"
      ? "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/15 dark:text-blue-light-400"
      : channel === "whatsapp"
        ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
        : "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400";
  return (
    <span className={`rounded-md px-2 py-1 text-xs font-medium ${classes}`}>
      {channel}
    </span>
  );
}

function EventMenu({
  events,
  selectedId,
  onSelect,
}: {
  events: EventDefinition[];
  selectedId: EditorEventId;
  onSelect: (id: EditorEventId) => void;
}) {
  return (
    <aside className="min-w-0 border-gray-200 dark:border-gray-800 lg:border-r lg:pr-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 lg:hidden">
        Notification event
      </p>
      <div
        className="flex snap-x gap-2 overflow-x-auto pb-2 lg:sticky lg:top-24 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0"
        aria-label="Notification events"
      >
        {events.map((event) => {
          const active = selectedId === event.id;
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelect(event.id)}
              className={`min-w-[210px] snap-start rounded-xl px-3.5 py-3 text-left transition lg:block lg:w-full lg:min-w-0 ${
                active
                  ? "bg-brand-50 text-brand-900 dark:bg-brand-500/15 dark:text-brand-300"
                  : "text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/[0.04]"
              }`}
            >
              <span className="block text-sm font-medium">{event.title}</span>
              <span
                className={`mt-1 block text-xs leading-4 ${
                  active
                    ? "text-brand-700 dark:text-brand-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {event.trigger}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function ReminderSchedule({
  timings,
  timingToAdd,
  dirty,
  onTimingChange,
  onAdd,
  onRemove,
  onSave,
}: {
  timings: string[];
  timingToAdd: string;
  dirty: boolean;
  onTimingChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onSave: () => void;
}) {
  const available = scheduleOptions.filter(
    (option) => !timings.includes(option.id),
  );
  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/60 sm:p-4">
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
        Send reminders
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {timings.map((id) => {
          const option = scheduleOptions.find((item) => item.id === id);
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-medium text-brand-800 dark:bg-brand-500/20 dark:text-brand-300"
            >
              {option?.label ?? id}
              <button
                type="button"
                onClick={() => onRemove(id)}
                aria-label={`Remove ${option?.label ?? id}`}
                className="inline-flex size-4 items-center justify-center rounded-full hover:bg-brand-200 dark:hover:bg-brand-500/30 [&>svg]:size-3"
              >
                <TrashBinIcon />
              </button>
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <select
            value={timingToAdd}
            onChange={(event) => onTimingChange(event.target.value)}
            className="h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3.5 pr-10 text-sm text-gray-800 outline-hidden focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="">Add timing</option>
            {available.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        </div>
        <Button
          size="sm"
          variant="outline"
          startIcon={<PlusIcon />}
          onClick={onAdd}
          disabled={!timingToAdd}
        >
          Add
        </Button>
        <Button size="sm" onClick={onSave} disabled={!dirty || !timings.length}>
          Save Schedule
        </Button>
      </div>
    </div>
  );
}

function VariableTokens({
  duplicateNames,
  malformed,
  onInsert,
}: {
  duplicateNames: string[];
  malformed: string[];
  onInsert: (name: VariableName) => void;
}) {
  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        Dynamic variables — click to insert at the cursor
      </p>
      <div className="flex flex-wrap gap-2">
        {variableNames.map((name) => {
          const duplicate = duplicateNames.includes(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => onInsert(name)}
              title={`Insert ${token(name)}`}
              className={`rounded-md border px-2 py-1 font-mono text-[11px] font-medium transition sm:text-xs ${
                duplicate
                  ? "border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-400"
                  : "border-gray-200 bg-gray-50 text-brand-700 hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-800 dark:text-brand-400 dark:hover:border-brand-500/50"
              }`}
            >
              {token(name)}
            </button>
          );
        })}
        {malformed.map((value) => (
          <span
            key={value}
            className="rounded-md border border-error-300 bg-error-50 px-2 py-1 font-mono text-[11px] font-medium text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-400 sm:text-xs"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function ValidationSummary({
  missing,
  malformed,
  duplicates,
  showErrors,
}: {
  missing: VariableName[];
  malformed: string[];
  duplicates: string[];
  showErrors: boolean;
}) {
  return (
    <div
      className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-xs leading-5 ${
        showErrors && (missing.length || malformed.length)
          ? "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
          : "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400"
      }`}
    >
      <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center overflow-visible [&>svg]:size-4">
        <AlertIcon />
      </span>
      <div>
        {missing.length > 0 && (
          <p>
            Missing required: {missing.map((name) => token(name)).join(", ")}
          </p>
        )}
        {malformed.length > 0 && (
          <p>Malformed or unknown: {malformed.join(", ")}</p>
        )}
        {duplicates.length > 0 && (
          <p>
            Repeated variables:{" "}
            {duplicates.map((name) => `{{${name}}}`).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

function LivePreview({ template }: { template: Template }) {
  const subject = useMemo(
    () => interpolate(template.subject),
    [template.subject],
  );
  const message = useMemo(
    () => interpolate(template.message),
    [template.message],
  );
  return (
    <div className="mt-4 min-h-40 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/60">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Live preview
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-gray-900 dark:text-white">
        {subject || "Your email subject will appear here"}
      </p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700 dark:text-gray-300">
        {message || "Your message will appear here"}
      </p>
    </div>
  );
}

function ChannelCard({
  icon,
  name,
  approved = false,
}: {
  icon: React.ReactNode;
  name: string;
  approved?: boolean;
}) {
  return (
    <section
      aria-label={`${name} notifications, not activated`}
      className="flex min-h-24 items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <span className="inline-flex size-6 shrink-0 items-center justify-center overflow-visible text-gray-800 dark:text-gray-200 [&>svg]:size-5 [&>svg]:shrink-0">
          {icon}
        </span>
        <span className="font-medium text-gray-900 dark:text-white">{name}</span>
        {approved && (
          <span className="rounded-md bg-success-50 px-2 py-1 text-xs font-medium text-success-700 dark:bg-success-500/15 dark:text-success-400">
            Approved
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-md bg-warning-50 px-2 py-1 text-xs font-medium text-warning-700 dark:bg-warning-500/15 dark:text-warning-400">
          Not Activated
        </span>
        <ChevronDownIcon className="size-4 text-gray-400" />
      </div>
    </section>
  );
}
