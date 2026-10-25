# Tabulous 2.0.1 website launch

## Scope and preservation

Website repository only: `/Users/noname/Desktop/Projects/Tabulous/tabulous-site`.
Existing dirty tracked files and all untracked files were archived before editing to `/private/tmp/tabulous-site-preservation-20261025/original-workspace.tar.gz` (SHA-256 `dae70184f41ef5451acafdfa4421d15d3bea961e082d8df5defd82898b172968`); the original tracked diff is also preserved as `tracked.patch` (SHA-256 `df6c35854e975389b06a74513cf89615c787b17567792d3a5e6c1c885ae6db06`). No reset or clean was used. Work was isolated on `codex/tabulous2-site-launch`.

## Changes

Rebuilt the static homepage around the extension's Inter font, cyan/purple/navy identity and SVG mark. Added shared responsive navigation and visual styles, pricing, account authentication and billing-status checks, support, privacy, terms, account-deletion instructions, checkout/cancellation/portal return pages and a branded 404. Kept the existing domain, repository and exact Chrome Web Store listing.

The listing was fetched on 25 October 2026 and reported public version **0.8**. Public copy describes **2.0.1** as prepared for store review and makes clear that installing from the listing currently installs its published version. No extension upload or approval is implied.

Website authentication points to the existing London production service. Sessions remain in memory. Online user validation precedes status loading. Only authenticated billing-status determines purchasing availability and Founder availability. Return URLs never grant entitlement. Complimentary Pro is derived from account status, not billing plan text. No production gates or backend configuration were changed by this work; no real charge was attempted.

The established support mailbox is reused. Its delivery was not verified. Account deletion is a support request requiring ownership verification, not an instant or automatic deletion claim. No unsupported fixed retention or refund guarantee was invented.

## Verification

- PASS — shared pricing configuration is byte-identical to canonical extension source: USD cents 199, 1499, 2999, 1999.
- PASS — local HTML navigation targets exist; one shared external listing identifier is used.
- PASS — JavaScript syntax checks.
- PASS — GitHub Pages source verified: existing repository `main` branch, root path, existing `tabulous.tools` CNAME. No hosting migration.
- PASS — 20 rendered-page/viewport cases (10 public pages at 1440×1000 and 390×844), image loads and no horizontal overflow. Desktop/mobile homepage and mobile account screenshots inspected.
- PASS — synthetic OTP sign-in plus online user verification, complimentary Pro, authenticated Founder count, fail-closed purchasing, server rejection of checkout, sign-out clearing account data, and return URLs granting no access.
- PASS — screenshots are genuine packaged 2.0.1 UI with synthetic public fixture data (14 Workspaces / 84 tabs) in a disposable profile. No real account or owner library is shown.
- Headless evidence: `/var/folders/kt/7j1mtxts6532nrz3fzwjkk4w0000gn/T/tabulous-native-website-Sbm1Ul`. Machine-readable results: `docs/verification/2026-10-25-website-headless.json`.
- Pending — authorised GitHub Pages deployment and HTTP verification.

## Agent Usage & Division of Labour

- Root/orchestrator: parent agent coordinates extension, infrastructure and release. Exact root model and reasoning effort: **Not available in telemetry.**
- Website delegated agent: assigned Sol Medium by parent task. Runtime model identifier and reasoning effort confirmation: **Not available in telemetry.** One delegated website task; this agent spawned no subagents (zero further delegated tasks).
- Responsibilities: this agent preserved the existing website workspace, implemented website pages and browser account flow, researched existing deployment/listing/configuration, and performs focused website validation and authorised existing-Pages deployment. Parent owns extension and backend changes and provides synthetic screenshots.
- Estimated share: this agent performs approximately 100% of website implementation and focused website validation; overall task/model shares are **Not available in telemetry.**
- Tokens, costs, model-attributed consumption, five-hour allowance and reset impact: **Not available in telemetry.** No reset credit was consumed or selected model changed to produce this report.
- Inefficiencies: initial path-discovery calls tried several nonexistent historical/configuration paths before finding the canonical worktree and backend layout. These were read-only misses. Two initial restricted Chrome launches could not start (required escalation). One escalated run stalled on image.decode(); its exact verifier/browser processes were stopped. A bounded retry identified the decode wait, and image-load polling replaced it. The final complete suite passed. No personal browser or owner profile was accessed; no broad process termination was used.

## Commercial activation follow-up

The current Chrome Web Store listing declares the publisher a Non-trader. The owner must review that declaration before commercial submission/activation. No listing or billing activation was changed.
