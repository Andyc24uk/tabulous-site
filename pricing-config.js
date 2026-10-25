(function (root, factory) {
  const api = factory(); root.TabulousPricing = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(globalThis, function () {
  "use strict";
  // Approved amounts in USD cents. Display approval never enables payments.
  const PRICING = Object.freeze({ currency: "USD", checkoutEnabled: false,
    terms: "Creating an account is free and does not activate a paid plan. All paid plans include the same Pro features. Local Workspaces stay yours if Pro ends.",
    free: Object.freeze({ title: "Free Forever", amount: 0, period: null, approved: true }),
    monthly: Object.freeze({ title: "Pro Monthly", amount: 199, period: "month", approved: true }),
    annual: Object.freeze({ title: "Pro Annual", amount: 1499, period: "year", approved: true, badge: "Recommended / Best Value" }),
    lifetime: Object.freeze({ title: "Pro Lifetime", amount: 2999, period: "lifetime", approved: true }),
    founder: Object.freeze({ title: "Founder's Lifetime", amount: 1999, period: "lifetime", approved: true, limit: 100 }),
    trial: Object.freeze({ approved: false, days: null }), promotion: Object.freeze({ approved: false, text: null }) });
  const PLAN_FEATURES = Object.freeze([
    Object.freeze({ title: "Free", description: "Full local functionality, forever. No account required.", features: Object.freeze(["Local Workspace management and Groups", "Local recovery and merge/reconciliation", "Import and export your Workspaces", "No payment required for existing local features"]) }),
    Object.freeze({ title: "Pro", description: "Cloud convenience across devices and Chrome profiles.", features: Object.freeze(["Cross-device and cross-profile cloud synchronisation", "Cloud backup of your synchronised Workspace library", "Additional sync settings and device management", "Offline-first queued changes and conflict review"]) })
  ]);
  function pricingPresentation(config = PRICING) {
    const prices = [];
    for (const name of ["monthly", "annual", "lifetime", "founder"]) {
      const plan = config[name];
      if (!plan?.approved || !Number.isSafeInteger(plan.amount) || plan.amount <= 0 || !/^[A-Z]{3}$/.test(config.currency || "")) continue;
      prices.push({ name, title: plan.title, badge: plan.badge || null, limit: plan.limit || null,
        label: `${new Intl.NumberFormat("en-US", { style: "currency", currency: config.currency }).format(plan.amount / 100)}${plan.period === "lifetime" ? " one-time" : ` / ${plan.period}`}` });
    }
    const saving = config.monthly?.amount && config.annual?.amount ? Math.floor((1 - config.annual.amount / (config.monthly.amount * 12)) * 100) : 0;
    return { prices, savings: saving > 0 && saving < 100 ? `Save ${saving}% with annual billing` : null,
      terms: config.terms || null, checkoutEnabled: config.checkoutEnabled === true };
  }
  return { PRICING, PLAN_FEATURES, pricingPresentation };
});
