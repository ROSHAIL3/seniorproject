import type { Metadata } from "next";
import AppointmentSettingsClient from "@/components/settings/appointment-settings/AppointmentSettingsClient";
import { getAppointmentSettings } from "@/services/appointment-settings.service";
import { getStaffMembers } from "@/services/staff.service";

export const metadata: Metadata = {
  title: "Appointment settings | Senior Project",
};

export default async function Page() {
  const [settings, staffMembers] = await Promise.all([getAppointmentSettings(), getStaffMembers()]);
  return <AppointmentSettingsClient initialSettings={settings} staffMembers={staffMembers} />;
}
