"use client";

import { useEffect, useState } from "react";
import { getCustomerFieldDefinitions, subscribeToCustomerFields } from "@/services/customer-fields.service";
import type { CustomerFieldDefinition } from "@/types/customer-fields";

export function useCustomerFields(initialFields: CustomerFieldDefinition[] = []) {
  const [fields, setFields] = useState(initialFields);
  useEffect(() => { let active = true; const refresh = () => void getCustomerFieldDefinitions().then((next) => { if (active) setFields(next); }); refresh(); const unsubscribe = subscribeToCustomerFields(refresh); return () => { active = false; unsubscribe(); }; }, []);
  return fields;
}
