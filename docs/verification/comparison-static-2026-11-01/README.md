# Static homepage comparison — 1 November 2026

Removed the comparison image anchor and its full-size instruction. Moved the existing frame styling from the anchor to the picture element, preserving the image's rounded border, background and clipping without link hover/focus behaviour. Removed the unused caption style. Image/source attributes and full-resolution PNG are unchanged; original Git blob is 5840f8003971d9c848b75bea10f05625f7aeee4a.

Local guarded disposable headless Chrome passed at 1440, 1366, 1024, 820, 390 and 320px. At every width, image x/y position, width, height, PNG source, WebP source and accessibility alt text exactly match the before measurements. No horizontal overflow or missing images. No link/button/tabindex/click attribute remains in the comparison; cursor is noninteractive. Real pointer clicks do not navigate or create a tab. Caption is absent. All 10 remaining homepage links passed. Desktop/mobile screenshots visually inspected.

The focused browser check reused the existing promotional verification harness with temporary assertions/output routing; no permanent test framework or unrelated production files added. Before/local JSON and screenshots preserve measurements.

Production deployment verified at https://tabulous.tools/ from source commit 27d350bda7399abe184e57357e12fed3d995092d. The same six live browser widths and 10 links passed; clicks leave the page and tab count unchanged. Live HTML, CSS, original PNG and WebP match source byte-for-byte. Live screenshots and JSON preserve evidence. No extension, Store listing, sync, billing or account configuration changes.

## Agent Usage & Division of Labour

Root performed all work; estimated 100%. No subagents; zero delegated tasks. Exact model/effort, token consumption, cost and five-hour allowance/reset impact: **Not available in telemetry.** No failed checks or retries. See ../../agent-usage-reports/2026-11-01-static-comparison.md.
