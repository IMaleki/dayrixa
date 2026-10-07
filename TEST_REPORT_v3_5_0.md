# DAYRIXA 3.5.0 verification

## Passed

- `research-core.test.cjs`: expression parser, panel lags, OLS/HC1 against independent NumPy references, common samples, rank rejection and escaping.
- `coefficients.test.cjs`: restricted intercept/slopes, all-fixed equations, conditional OLS/HC1 errors, df and named constant-column errors.
- `merge.test.cjs`: panel/macro and panel/panel keys, exact row counts, duplicates, dates and collisions.
- `workflow.test.cjs`: sensitivity membership/counts, inclusive periods, common-sample alternative predictors and nonmutation. Repeatable cleaning/variables/merges/refitting; changed-input recomputation; missing files, changed schemas and duplicate-key failure. Replayed comparison/sample policy and sensitivity. LaTeX escaping.
- `studio-workflow.test.cjs`: actual app handlers in a custom DOM. No-op preparation rules remain recorded; variables, CAPM, constraints, undo/redo, comparison, sensitivity persistence, failed project import atomicity, replay file upload/preview/review/apply. Changing Y by +5 changes the new fitted intercept by +5 rather than retaining old coefficients.
- `data-tools.test.cjs`: retained regression, suggestions, ranking, cleaning, outliers, trends and questions.
- Actual supplied XLSX through SheetJS 0.18.5 and app header workflow: 207 rows, 9 fields; maximum numeric-cell difference against Open XML extraction = 0. OLS beta/SE match independent NumPy to 1e-9; R² = 0.8103816625024078. CAPM arithmetic verified with Rf as supplied, without asserting its economic frequency.
- Actual generated LaTeX compiled with XeLaTeX. Example table visually inspected; no overfull-box warnings in the final example.
- JavaScript syntax, local HTML script paths and archive integrity checked.

## Scope and remaining uncertainty

Interface tests use a simulated DOM/canvas, not browser rendering. Real browser desktop/mobile interaction, keyboard/accessibility behavior and network load times remain unverified. Native downloads and Excel upload UI were not exercised in a browser, although the actual Excel parser ran against the uploaded file in Node.

No new UI framework, chart dependency, remote font or AI service is added. The research core + workflow + studio + CSS total roughly 134 KB uncompressed. This is a code-size observation, not a measured page-load time; the retained full website has other assets/modules. Large-panel memory/performance has not been benchmarked.

Replay supports recorded preparation controls, headers, formulas, merges, model definitions, comparison and the latest sensitivity settings. Unsupported legacy/manual operations stop replay. Applying a run resets session undo history after explicit review. Schema-compatible data can still have changed units or meanings: replay does not prove semantic compatibility.

LaTeX uses English labels and a default Unicode engine/font; non-Latin typography may require user font/direction configuration. It is not certified for any journal template. Arbitrary user content/very wide tables may need layout adjustments.

No user pilot has yet run. PILOT_GUIDE_FA.md contains the proposed protocol. Statistical methods remain OLS/HC1; panel FE, cluster/HAC inference and unrestricted financial-data conventions are not added. Commercial production readiness is not asserted.
