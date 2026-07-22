"use client";

import { useEffect, useState } from "react";
import { subscribeToAppointments } from "@/services/appointments.service";
import { getCustomerProfiles } from "@/services/customer-profiles.service";
import { subscribeToCustomers } from "@/services/customers.service";
import type { CustomerProfile } from "@/types/customers";

export function useCustomerProfiles(initialProfiles: CustomerProfile[]) {
  const [profiles, setProfiles] = useState(initialProfiles);

  useEffect(() => {
    let isActive = true;
    const refresh = async () => {
      const records = await getCustomerProfiles();
      if (isActive) setProfiles(records);
    };
    void refresh();
    const unsubscribeCustomers = subscribeToCustomers(() => void refresh());
    const unsubscribeAppointments = subscribeToAppointments(() => void refresh());
    return () => {
      isActive = false;
      unsubscribeCustomers();
      unsubscribeAppointments();
    };
  }, []);

  return profiles;
}
