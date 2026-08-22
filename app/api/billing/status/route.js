import { NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { getPlan } from "@/lib/plan-store";
import { getPendingOrderForEmail, getOrder, sweepExpiredOrders } from "@/lib/orders-store";
import { getPaymentDestination } from "@/lib/manual-payment";

// Dipanggil dari /billing buat polling ringan: "order gue udah kebayar belum?"
// Frontend poll endpoint ini tiap beberapa detik selagi nunggu webhook Moota masuk.
export async function GET(req) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  sweepExpiredOrders();

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");

  const plan = getPlan(user.email);
  const order = orderId ? getOrder(orderId) : getPendingOrderForEmail(user.email);

  // Guard: order cuma boleh dilihat pemiliknya sendiri.
  if (order && order.email !== String(user.email).toLowerCase()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    plan,
    order: order
      ? {
          orderId: order.orderId,
          status: order.status,
          grossAmount: order.grossAmount,
          uniqueCode: order.uniqueCode,
          expiresAt: order.expiresAt,
          destination: getPaymentDestination(),
        }
      : null,
  });
}
