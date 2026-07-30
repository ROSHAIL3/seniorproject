export type NotificationCategory = "booking" | "payment" | "staff" | "system";
export type NotificationSeverity = "info" | "success" | "warning" | "error";

export type InAppNotification = {
  id: string;
  eventKey: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  detail: string;
  href: string | null;
  targetType: string | null;
  targetId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPage = {
  items: InAppNotification[];
  unreadCount: number;
  nextCursor: { createdAt: string; id: string } | null;
};

export type NotificationPreferences = {
  bookingEnabled: boolean;
  paymentEnabled: boolean;
  staffEnabled: boolean;
  systemEnabled: boolean;
  retentionDays: number;
};
