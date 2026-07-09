import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getClubStripe, getClubStripeWebhookSecret } from "@/lib/club-stripe";
import { fulfillMemberDuesCheckout } from "@/lib/dues-stripe-checkout";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;
  const stripe = await getClubStripe(clubId);
  if (!stripe) {
    return NextResponse.json({ error: "Club Stripe not configured" }, { status: 503 });
  }

  const webhookSecret = await getClubStripeWebhookSecret(clubId);
  if (!webhookSecret) {
    return NextResponse.json({ error: "Club webhook secret missing" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await fulfillMemberDuesCheckout({
        id: event.data.object.id,
        metadata: event.data.object.metadata as Record<string, string>,
        payment_intent: event.data.object.payment_intent,
      });
    }
  } catch (err) {
    console.error("[club stripe webhook]", clubId, event.type, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}