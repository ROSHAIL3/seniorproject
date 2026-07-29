"use client";

import { useState } from "react";
import Alert from "@/components/ui/alert/Alert";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { DocsIcon, DollarLineIcon, EnvelopeIcon } from "@/icons";
import { formatBhd } from "@/lib/formatters";
import { recordInvoicePayment } from "@/services/invoices.service";
import type {
  Invoice,
  PaymentKind,
  PaymentMethod,
} from "@/types/invoices";

export default function InvoiceActions({
  invoice,
  onUpdated,
}: {
  invoice: Invoice;
  onUpdated: (invoice: Invoice) => void;
}) {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [kind, setKind] = useState<PaymentKind>("Payment");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submitPayment = async () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      const updated = await recordInvoicePayment(invoice.id, {
        amountBhd: numericAmount,
        kind,
        method,
        note,
        recordedBy: invoice.createdBy || "Team Member",
      });
      onUpdated(updated);
      setAmount("");
      setNote("");
      setIsPaymentModalOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The transaction could not be recorded.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 print:hidden">
        <Button
          size="sm"
          startIcon={<DollarLineIcon />}
          onClick={() => setIsPaymentModalOpen(true)}
        >
          Payment / Refund
        </Button>
        <Button
          size="sm"
          variant="outline"
          startIcon={<EnvelopeIcon />}
          onClick={() => setIsEmailModalOpen(true)}
        >
          Send by Email
        </Button>
        <Button
          size="sm"
          variant="outline"
          startIcon={<DocsIcon />}
          onClick={() => window.print()}
        >
          Print / Save as PDF
        </Button>
      </div>

      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        className="m-4 max-w-[500px] p-5 shadow-theme-xl sm:p-6"
      >
        <h2 className="pr-12 text-xl font-semibold text-gray-900 dark:text-white">
          Email delivery is not connected
        </h2>

        <div className="mt-6 flex items-start gap-4">
          <span className="inline-flex size-11 shrink-0 items-center justify-center overflow-visible rounded-xl bg-brand-50 text-brand-700 leading-none dark:bg-brand-500/10 dark:text-brand-400 [&>svg]:block [&>svg]:size-6 [&>svg]:shrink-0 [&>svg]:overflow-visible">
            <EnvelopeIcon />
          </span>
          <p className="min-w-0 pt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
            Phase 6 does not send email or use a paid provider. Print invoice{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {invoice.invoiceNumber}
            </span>{" "}
            as a PDF and send it manually to{" "}
            <span className="break-all font-semibold text-gray-900 dark:text-white">
              {invoice.customerEmail}
            </span>
            .
          </p>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <Button size="sm" onClick={() => setIsEmailModalOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => !isSaving && setIsPaymentModalOpen(false)}
        className="m-4 max-w-[520px] p-5 shadow-theme-xl sm:p-6"
      >
        <h2 className="pr-12 text-xl font-semibold text-gray-900 dark:text-white">
          Record payment transaction
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Remaining: {formatBhd(invoice.remainingBalanceBhd)} · Paid:{" "}
          {formatBhd(invoice.amountPaidBhd)}
        </p>

        {error && (
          <div className="mt-5">
            <Alert variant="error" title="Transaction not saved" message={error} />
          </div>
        )}

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Type
            <Select
              key={kind}
              defaultValue={kind}
              options={[
                { label: "Payment", value: "Payment" },
                { label: "Refund", value: "Refund" },
              ]}
              onChange={(value) => setKind(value as PaymentKind)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Method
            <Select
              key={method}
              defaultValue={method}
              options={[
                { label: "Cash", value: "Cash" },
                { label: "Card", value: "Card" },
                { label: "Bank Transfer", value: "Bank Transfer" },
                { label: "Other", value: "Other" },
              ]}
              onChange={(value) => setMethod(value as PaymentMethod)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">
            Amount (BHD)
            <Input
              type="number"
              min="0.001"
              step={0.001}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              ariaLabel="Transaction amount in BHD"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">
            Note (optional)
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-800 shadow-theme-xs outline-none focus:border-brand-400 focus:ring-3 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </label>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <Button
            size="sm"
            variant="outline"
            disabled={isSaving}
            onClick={() => setIsPaymentModalOpen(false)}
          >
            Cancel
          </Button>
          <Button size="sm" disabled={isSaving} onClick={submitPayment}>
            {isSaving ? "Recording..." : `Record ${kind.toLowerCase()}`}
          </Button>
        </div>
      </Modal>
    </>
  );
}
