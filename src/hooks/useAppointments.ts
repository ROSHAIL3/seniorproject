"use client";

import { useEffect, useState } from "react";
import {
  getAppointments,
  subscribeToAppointments,
} from "@/services/appointments.service";
import type { Appointment } from "@/types/appointments";

export function useAppointments(initialAppointments: Appointment[]) {
  const [appointments, setAppointments] = useState(initialAppointments);

  useEffect(() => {
    let isActive = true;

    const refresh = async () => {
      const records = await getAppointments();
      if (isActive) setAppointments(records);
    };

    void refresh();
    const unsubscribe = subscribeToAppointments(() => void refresh());

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return appointments;
}
