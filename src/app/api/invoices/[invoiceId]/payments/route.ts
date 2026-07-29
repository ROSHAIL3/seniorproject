import { NextResponse } from "next/server";
import { recordInvoicePaymentInDatabase } from "@/server/invoices.repository";
import type { InvoicePaymentInput } from "@/types/invoices";

type Context = { params: Promise<{ invoiceId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { invoiceId } = await context.params;
    const input = (await request.json()) as InvoicePaymentInput;
    return NextResponse.json({
      invoice: await recordInvoicePaymentInDatabase(invoiceId, input),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment request failed." },
      { status: 400 },
    );
  }
}
