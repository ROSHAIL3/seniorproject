"use client";

import { useEffect, useState } from "react";
import Input from "@/components/form/input/InputField";
import EmailInput from "@/components/form/input/EmailInput";
import PhoneInput from "@/components/form/group-input/PhoneInput";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import CustomerCustomFieldsForm from "./CustomerCustomFieldsForm";
import { getCustomerFieldValues } from "@/services/customer-fields.service";
import type { CustomerFieldValueMap } from "@/types/customer-fields";
import {
  createCustomer,
  CustomerValidationError,
  updateCustomer,
} from "@/services/customers.service";
import type {
  Customer,
  CustomerFieldErrors,
  CustomerStatus,
} from "@/types/customers";

type CustomerFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer;
  onSaved: (customer: Customer) => void | Promise<void>;
};

const statusOptions = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

export default function CustomerFormModal({
  isOpen,
  onClose,
  customer,
  onSaved,
}: CustomerFormModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<CustomerStatus>("Active");
  const [customFieldValues, setCustomFieldValues] = useState<CustomerFieldValueMap>({});
  const [fieldErrors, setFieldErrors] = useState<CustomerFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(customer?.name ?? "");
    setEmail(customer?.email ?? "");
    setPhone(customer?.phone ?? "");
    setNotes(customer?.notes ?? "");
    setStatus(customer?.status ?? "Active");
    setCustomFieldValues({});
    if (customer) void getCustomerFieldValues(customer.id).then(setCustomFieldValues);
    setFieldErrors({});
    setFormError("");
  }, [customer, isOpen]);

  const save = async () => {
    const clientErrors: CustomerFieldErrors = {};
    if (!name.trim()) clientErrors.name = "Full name is required.";
    if (!phone.trim()) clientErrors.phone = "Phone is required.";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      clientErrors.email = "Enter a valid email address.";
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phone.trim() && (phoneDigits.length < 8 || phoneDigits.length > 15)) {
      clientErrors.phone = "Enter a valid phone number with 8 to 15 digits.";
    }
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setIsSaving(true);
    setFieldErrors({});
    setFormError("");
    try {
      const input = { name, email, phone, notes, customFieldValues };
      const saved = customer
        ? await updateCustomer(customer.id, { ...input, status })
        : await createCustomer(input);
      await onSaved(saved);
      onClose();
    } catch (error) {
      if (error instanceof CustomerValidationError) {
        setFieldErrors(error.fieldErrors);
      } else {
        setFormError("The customer could not be saved. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-2xl p-6 sm:p-8">
      <h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">
        {customer ? "Edit Customer" : "New Customer"}
      </h2>
      <div className="mt-6 space-y-4">
        <Field label="Full name" required error={fieldErrors.name}>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={!!fieldErrors.name}
          />
        </Field>
        <Field label="Email" error={fieldErrors.email}>
          <EmailInput
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={!!fieldErrors.email}
          />
        </Field>
        <Field label="Phone" required error={fieldErrors.phone}>
          <PhoneInput
            value={phone}
            onChange={setPhone}
            placeholder="3XXX XXXX"
            error={!!fieldErrors.phone}
          />
        </Field>
        <div>
          <Label>Notes</Label>
          <TextArea value={notes} onChange={setNotes} rows={4} placeholder="Customer preferences or notes" />
        </div>
        <CustomerCustomFieldsForm values={customFieldValues} onChange={setCustomFieldValues} errors={fieldErrors} />
        {customer && (
          <div>
            <Label>Status</Label>
            <Select
              key={status}
              options={statusOptions}
              defaultValue={status}
              onChange={(value) => setStatus(value as CustomerStatus)}
            />
          </div>
        )}
        {formError && <p className="text-sm text-error-500">{formError}</p>}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </Modal>
  );
}

function Field({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>
        {label} {required && <span className="text-error-500">*</span>}
      </Label>
      {children}
      {error && <p className="mt-1.5 text-xs text-error-500">{error}</p>}
    </div>
  );
}
