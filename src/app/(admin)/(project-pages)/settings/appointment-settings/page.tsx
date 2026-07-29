import type { Metadata } from "next";
import AppointmentSettingsClient from "@/components/settings/appointment-settings/AppointmentSettingsClient";
import { getAppointmentSettingsFromDatabase } from "@/server/appointment-settings.repository";
import { getStaffMembersFromDatabase } from "@/server/staff.repository";

export const metadata: Metadata = {
  title: "Appointment settings | Senior Project",
};

export default async function Page() {
  const [settings, staffMembers] = await Promise.all([getAppointmentSettingsFromDatabase(), getStaffMembersFromDatabase()]);
  return <AppointmentSettingsClient initialSettings={settings} staffMembers={staffMembers} />;
}
