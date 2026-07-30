import Calendar from "@/components/calendar/Calendar";
import { Metadata } from "next";
import React from "react";
import { getAppointmentsFromDatabase } from "@/server/appointments.repository";
import { getStaffMembersFromDatabase } from "@/server/staff.repository";

export const metadata: Metadata = {
  title: "Appointments Calendar",
  description: "Review appointments by date and staff member",
};
export default async function CalendarPage() {
  const [appointments, staffMembers] = await Promise.all([
    getAppointmentsFromDatabase(),
    getStaffMembersFromDatabase(),
  ]);
  return (
    <div>
      <Calendar
        initialAppointments={appointments}
        staffMembers={staffMembers}
      />
    </div>
  );
}
