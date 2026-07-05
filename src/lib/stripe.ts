import Stripe from "stripe";
import { getStripe as resolveStripe } from "@/lib/platform-integrations";

/** Client Stripe (config SaaS ou .env). */
export async function getStripe() {
  return resolveStripe();
}

/** @deprecated Préférer `await getStripe()` — lit uniquement .env */
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    })
  : null;