import type { Metadata } from "next";
import AppointmentSettingsClient from "@/components/settings/appointment-settings/AppointmentSettingsClient";
import { getAppointmentSettings } from "@/services/appointment-settings.service";
import { getStaffMembersFromDatabase } from "@/server/staff.repository";

export const metadata: Metadata = {
  title: "Appointment settings | Senior Project",
};

export default async function Page() {
  const [settings, staffMembers] = await Promise.all([getAppointmentSettings(), getStaffMembersFromDatabase()]);
  return <AppointmentSettingsClient initialSettings={settings} staffMembers={staffMembers} />;
}
