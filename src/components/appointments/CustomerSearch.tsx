"use client";

import { useMemo, useState } from "react";
import Input from "@/components/form/input/InputField";
import EmailInput from "@/components/form/input/EmailInput";
import PhoneInput from "@/components/form/group-input/PhoneInput";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { PlusIcon, UserCircleIcon } from "@/icons";
import { createCustomer as createCustomerRecord } from "@/services/customers.service";
import { CustomerValidationError } from "@/services/customers.service";
import type { Customer, CustomerFieldErrors } from "@/types/customers";
import type { CustomerFieldValueMap } from "@/types/customer-fields";
import CustomerCustomFieldsForm from "@/components/customers/CustomerCustomFieldsForm";

type CustomerSearchProps = {
  selectedCustomer: Customer | null;
  initialCustomers: Customer[];
  onSelect: (customer: Customer) => void;
};

export default function CustomerSearch({
  selectedCustomer,
  initialCustomers,
  onSelect,
}: CustomerSearchProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [query, setQuery] = useState(selectedCustomer?.name ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<CustomerFieldValueMap>({});
  const [fieldErrors, setFieldErrors] = useState<CustomerFieldErrors>({});
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return customers.slice(0, 4);
    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.email].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [customers, query]);

  const selectCustomer = (customer: Customer) => {
    onSelect(customer);
    setQuery(customer.name);
    setIsOpen(false);
  };

  const openCreateCustomer = () => {
    setNewName(query.trim());
    setCustomFieldValues({});
    setFieldErrors({});
    setIsCreateOpen(true);
    setIsOpen(false);
  };

  const createCustomer = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    setIsCreating(true);
    setCreateError("");
    try {
      const customer = await createCustomerRecord({
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        notes: "",
        customFieldValues,
      });
      setCustomers((current) => [...current, customer]);
      selectCustomer(customer);
      setIsCreateOpen(false);
    } catch (error) {
      if (error instanceof CustomerValidationError) setFieldErrors(error.fieldErrors);
      else setCreateError("Customer could not be created. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <Label htmlFor="customer-search">
        Customer <span className="text-error-500">*</span>
      </Label>
      <div className="relative">
        <Input
          id="customer-search"
          value={query}
          placeholder="Search name, phone or email"
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          className={selectedCustomer ? "border-success-400" : ""}
        />
        {isOpen && (
          <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark">
            <div className="max-h-64 overflow-y-auto p-1.5">
              {suggestions.map((customer) => (
                <button
                  type="button"
                  key={customer.id}
                  onClick={() => selectCustomer(customer)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15">
                    <UserCircleIcon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
                      {customer.name}
                    </span>
                    <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                      {customer.email} · {customer.phone}
                    </span>
                  </span>
                </button>
              ))}
              {suggestions.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-gray-400">
                  No matching customers
                </p>
              )}
            </div>
            {query.trim() && (
              <button
                type="button"
                onClick={openCreateCustomer}
                className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-sm font-medium text-brand-500 hover:bg-brand-50 dark:border-gray-800 dark:hover:bg-brand-500/10"
              >
                <PlusIcon className="size-4" />
                Add “{query.trim()}” as new customer
              </button>
            )}
          </div>
        )}
      </div>

      {selectedCustomer && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {selectedCustomer.phone} · {selectedCustomer.email}
        </p>
      )}

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        className="max-w-lg p-6 sm:p-8"
      >
        <h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">
          Quick add customer
        </h2>
        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="new-customer-name">Customer name</Label>
            <Input
              id="new-customer-name"
              value={newName}
              error={!!fieldErrors.name}
              onChange={(event) => setNewName(event.target.value)}
            />
            {fieldErrors.name && <p className="mt-1.5 text-xs text-error-500">{fieldErrors.name}</p>}
          </div>
          <CustomerCustomFieldsForm values={customFieldValues} onChange={setCustomFieldValues} errors={fieldErrors} />
          <div>
            <Label htmlFor="new-customer-phone">Phone</Label>
            <PhoneInput
              id="new-customer-phone"
              value={newPhone}
              error={!!fieldErrors.phone}
              onChange={setNewPhone}
              placeholder="3XXX XXXX"
            />
            {fieldErrors.phone && <p className="mt-1.5 text-xs text-error-500">{fieldErrors.phone}</p>}
          </div>
          <div>
            <Label htmlFor="new-customer-email">Email</Label>
            <EmailInput
              id="new-customer-email"
              value={newEmail}
              error={!!fieldErrors.email}
              onChange={(event) => setNewEmail(event.target.value)}
            />
            {fieldErrors.email && <p className="mt-1.5 text-xs text-error-500">{fieldErrors.email}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          {createError && (
            <p className="mr-auto text-sm text-error-500">{createError}</p>
          )}
          <Button
            size="sm"
            onClick={createCustomer}
            disabled={
              isCreating ||
              !newName.trim() ||
              !newPhone.trim()
            }
          >
            {isCreating ? "Adding..." : "Add customer"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
