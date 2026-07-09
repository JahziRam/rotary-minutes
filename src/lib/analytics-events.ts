/** GA4 recommended / custom event names */
export const ANALYTICS_EVENTS = {
  SIGN_UP: "sign_up",
  TRIAL_START: "trial_start",
  SELECT_PLAN: "select_plan",
  BEGIN_CHECKOUT: "begin_checkout",
  MINUTE_FINALIZED: "minute_finalized",
} as const;

export const LANDING_ANALYTICS_EVENTS = {
  CTA_CLICK: "landing_cta_click",
  CONTACT_OPEN: "contact_form_open",
  CONTACT_SUBMIT: "contact_form_submit",
  PRICING_VIEW: "pricing_section_view",
  PRICING_INTERVAL: "pricing_interval_toggle",
} as const;