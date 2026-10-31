(function () {
  "use strict";
  const config = globalThis.TabulousWebsite, byId = id => document.getElementById(id);
  const form = byId("account-form"), verify = byId("verify-form");
  let session = null, generation = 0, billing = null, grant = null, checkoutRequest = null, busy = false;
  const plans = new Set(["monthly", "annual", "lifetime", "founder"]);
  const candidate = new URLSearchParams(location.search).get("plan");
  const plan = plans.has(candidate) ? candidate : null;
  const announce = text => { byId("account-status").textContent = text; };
  const messages = {
    BILLING_PURCHASING_CLOSED: "Public purchasing is currently closed. No payment has been started.",
    BILLING_USE_PORTAL: "You already have a subscription. Manage billing to change it.",
    BILLING_ALREADY_LIFETIME: "Your account already has Lifetime access.",
    BILLING_FOUNDER_SOLD_OUT: "Founder places are no longer available. Please choose another plan.",
    BILLING_CHECKOUT_PENDING: "An unfinished checkout exists for your account. Contact support if you cannot resume it.",
    SYNC_UNAUTHENTICATED: "Your sign-in has expired. Sign out and sign in again.",
    BILLING_NOT_CONFIGURED: "Billing management is not available for this account. Contact support for help."
  };
  async function api(path, body, token, method = "POST") {
    let response;
    try {
      response = await fetch(config.origin + path, { method, credentials: "omit", cache: "no-store", redirect: "error",
        signal: AbortSignal.timeout(20000), headers: { apikey: config.publicKey, "Content-Type": "application/json", ...(path === `/functions/v1/${config.accountFunction}` ? { "x-tabulous-client-version": "2.0.1" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    } catch { throw new Error("The account service could not be reached. Please try again. Your local Workspaces are unaffected."); }
    const result = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(messages[result?.code] || (response.status === 429 ? "Too many requests. Please wait before trying again." : "The account or billing service is unavailable. Please try again or contact support."));
    return result;
  }
  const functions = (name, action, token) => api(`/functions/v1/${name}`, action, token);
  function controls() {
    const signed = Boolean(session), purchasing = signed && billing?.publicPurchasing === true;
    byId("refresh-status").disabled = !signed || busy;
    byId("billing-portal").disabled = !signed || billing?.hasBillingHistory !== true || busy;
    byId("start-checkout").disabled = !purchasing || !plan || busy || ["lifetime", "founder"].includes(billing?.currentPlan) || (plan === "founder" && billing?.founderRemaining === 0);
    byId("sign-out").hidden = !signed;
    byId("send-code").disabled = signed || busy || !config.authEnabled;
    form.elements.email.disabled = signed || busy || !config.authEnabled;
  }
  async function refresh() {
    billing = null; grant = null; controls();
    const token = session?.access_token, active = generation;
    if (!token) return;
    const results = await Promise.allSettled([
      functions(config.accountFunction, { action: "status" }, token),
      functions(config.billingFunction, { action: "billing-status" }, token)
    ]);
    if (active !== generation || session?.access_token !== token) return;
    if (results[0].status === "fulfilled") grant = results[0].value;
    if (results[1].status === "fulfilled") billing = results[1].value;
    const paid = grant && ["pro", "lifetime", "trial"].includes(grant.entitlement) && (!grant.expiresAt || new Date(grant.expiresAt).getTime() > Date.now());
    const label = paid && grant.source === "owner-grant" ? "Complimentary Pro" : paid ? (grant.entitlement === "lifetime" ? (grant.founder ? "Founder's Lifetime" : "Lifetime Pro") : "Pro") : grant ? "Free" : "Could not verify access";
    byId("plan-status").textContent = `Current plan: ${label}${billing ? "" : ". Billing status is temporarily unavailable."}`;
    byId("purchase-status").textContent = billing ? (billing.publicPurchasing === true ? "Choose a plan to continue to secure checkout." : "Purchasing is temporarily unavailable. You can still manage your account.") : "We could not load billing. Please refresh or try again later.";
    byId("founder-status").textContent = billing && Number.isInteger(billing.founderRemaining) && billing.founderRemaining >= 0 && billing.founderRemaining <= 100 ? `Founder places available: ${billing.founderRemaining}. Your place is confirmed at checkout.` : "Founder availability could not be verified.";
    controls();
  }
  form.addEventListener("submit", async event => {
    event.preventDefault(); if (busy || session || !config.authEnabled) return;
    busy = true; controls(); const active = generation;
    try { await api("/auth/v1/otp", { email: form.elements.email.value.trim(), create_user: true }); if (active !== generation) return; verify.hidden = false; announce("Check your email for a sign-in code. Account creation does not activate Pro."); }
    catch (e) { if (active === generation) announce(e.message); }
    finally { busy = false; controls(); }
  });
  verify.addEventListener("submit", async event => {
    event.preventDefault(); if (busy || session) return;
    busy = true; controls(); const active = generation;
    try {
      const result = await api("/auth/v1/verify", { email: form.elements.email.value.trim(), token: verify.elements.code.value.trim(), type: "email" });
      if (active !== generation) return;
      if (typeof result?.access_token !== "string" || !result.user?.id || result.user.is_anonymous) throw new Error("The account could not be verified.");
      const user = await api("/auth/v1/user", undefined, result.access_token, "GET");
      if (active !== generation) return;
      if (user?.id !== result.user.id || user.is_anonymous || typeof user.email !== "string") throw new Error("The account could not be verified.");
      session = result; byId("account-profile").textContent = user.email; verify.hidden = true; verify.reset();
      announce("Signed in. Your plan is being checked with the server. Signing in does not upload your Workspaces.");
      await refresh(); announce(byId("plan-status").textContent);
    } catch (e) { if (active === generation) announce(e.message); }
    finally { busy = false; controls(); }
  });
  byId("sign-out").addEventListener("click", () => {
    const token = session?.access_token; generation++; session = null; billing = null; grant = null; checkoutRequest = null; busy = false;
    byId("account-profile").textContent = ""; byId("plan-status").textContent = "Sign in to load your verified account status.";
    byId("purchase-status").textContent = "Purchasing availability is checked after sign-in."; byId("founder-status").textContent = "Sign in to check Founder availability.";
    verify.hidden = true; verify.reset(); controls(); announce("Signed out. Your local Workspaces remain available.");
    if (token) api("/auth/v1/logout?scope=local", undefined, token).catch(() => {});
  });
  byId("refresh-status").addEventListener("click", async () => { if (busy || !session) return; busy = true; controls(); try { await refresh(); announce("Account status refreshed from the server."); } catch (e) { announce(e.message); } finally { busy = false; controls(); } });
  async function redirectBilling(action, allowedOrigin) {
    if (busy || !session) return;
    if (action === "checkout" && (!plan || billing?.publicPurchasing !== true)) return;
    busy = true; controls(); const token = session.access_token, active = generation;
    try {
      checkoutRequest ||= crypto.randomUUID();
      const payload = action === "checkout" ? { action, plan, requestId: checkoutRequest } : { action };
      const result = await functions(config.billingFunction, payload, token);
      if (active !== generation || session?.access_token !== token) return;
      const url = new URL(result.url); if (url.origin !== allowedOrigin || url.username || url.password) throw new Error("The billing service returned an invalid destination.");
      location.assign(url.href);
    } catch (e) { if (active === generation) announce(e.message); }
    finally { busy = false; controls(); }
  }
  byId("start-checkout").addEventListener("click", () => redirectBilling("checkout", "https://checkout.stripe.com"));
  byId("billing-portal").addEventListener("click", () => redirectBilling("portal", "https://billing.stripe.com"));
  byId("selected-plan").textContent = plan ? `Selected plan: ${{ monthly: "Pro Monthly — $1.99/month", annual: "Pro Annual — $14.99/year", lifetime: "Pro Lifetime — $29.99 one-time", founder: "Founder's Lifetime — $19.99 one-time" }[plan]} (USD).` : "Choose a Pro plan on the pricing page.";
  if (new URLSearchParams(location.search).has("checkout")) announce("Welcome back. Sign in to see your payment status and Pro access. You do not need the extension installed.");
  controls();
})();
