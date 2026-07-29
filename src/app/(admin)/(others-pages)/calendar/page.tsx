import Calendar from "@/components/calendar/Calendar";
import { Metadata } from "next";
import React from "react";
import { getAppointments } from "@/services/appointments.service";
import { getStaffMembersFromDatabase } from "@/server/staff.repository";

export const metadata: Metadata = {
  title: "Appointments Calendar | Senior Project",
  description: "Review appointments by date and staff member",
};
export default async function CalendarPage() {
  const [appointments, staffMembers] = await Promise.all([
    getAppointments(),
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
