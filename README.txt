DAYRIXA Research Studio 3.5.0
Created and developed by Iman Malekikhajkolaei.
Copyright 2026 DAYRIXA. All rights reserved.

START
Extract the ZIP. In this folder run:
  python -m http.server 8080
(or python3 on systems using that command).
Open http://localhost:8080/ai/ and choose Data Analyst.
Upload CSV or Excel. Confirm detected multi-row headers when prompted.
The synthetic demo and project-reopen controls are under a disclosure.
Save your project before closing: browser memory is not persistent storage.

FOUR MAIN AREAS
Start: choose preparation, combining files or model analysis.
Data: preview/record cleaning, create variables, merge, history, replay.
Analysis: model lab/CAPM, advanced settings, saved models, sensitivity.
Results: HTML report, CSV tables/data, chart PNG, project JSON and LaTeX.
Legacy descriptive/chart/panel/question tools remain inside Explore data &
additional tools. Data also links directly to descriptive and trend tools.
New interface text is English; full Persian localization is not completed.

REPEATABLE PREPARATION
Use Data preparation to record duplicate removal, missing-row removal,
empty-column removal and IQR removal/winsorization. Preview shows counts.
Rules are recorded even if the current file needs no changes.
Formula variables, ordered lags, CAPM excess-return creation, explicit
header interpretation and validated merges also create executable steps.
Undo/redo restores both data and its active steps (12 recent changes).
Older projects retain their results, but earlier audit text is not converted
into executable steps. Unsupported legacy/manual operations are marked and
block replay rather than silently disappearing. Record them again using
Data preparation. Row-number deletion is not a repeatable rule.

REPEAT WITH NEW FILES
1. Save model definitions and your project.
2. Data > Repeat with new files > Download workflow JSON.
3. In this or another loaded project, load that workflow.
4. Upload a new primary dataset and a new file for each recorded merge.
5. Run and preview. Review each step's row counts and refitted results.
6. Confirm before replacing the current run; save the old project first.
A workflow contains rules, model definitions and optional comparison/latest
sensitivity settings. It does not contain data or reuse old secondary files.
All models are refitted. Stored comparison sample policies and sensitivity
settings are rerun too. Explicit date ranges remain fixed until changed.
Missing/extra primary columns, changed header structure, missing secondary
files, duplicate-right merge keys, empty results and invalid models stop
execution. The current working dataset is unchanged by a failed preview.
Applying a new run starts a new project history/undo buffer.

WHAT CHANGES IF...? (SENSITIVITY)
Save a model, then open the decision check in Analysis.
- Outliers: exclude values outside 1.5 x IQR in a selected screening column.
  Fences use the baseline model's complete-case sample. Missing screening
  values are retained. No original data is deleted.
- Period: choose a date field and inclusive start/end dates. Missing,
  invalid and non-day-precision dates are excluded from this alternative.
- Predictors: change X fields. Both models use the same complete rows;
  any baseline sample reduction for alignment is shown separately.
The output shows N, removed/added rows, coefficient changes and R-squared.
It does not choose a winner or establish causality. The latest check is
saved in the project, included in reports and can be replayed.

CONTEXTUAL HELP
CAPM requires an explicit answer about the risk-free input: same-period
return, annualized yield or unknown. Annualized/unknown inputs stop setup
with guidance; no implicit division by 12 is performed. Inputs must share
units and frequency. Select actual returns, not index price levels.
Already-excess returns should be modeled directly without subtracting Rf.
Constant/redundant predictors are named; no variable is silently dropped.
For ambiguous panel merges, duplicate right keys block multiplication and
an eligible compound-key suggestion can be selected for review.
Suggestions establish observed matching/uniqueness, not semantic identity.

LATEX
Results > Download LaTeX (.tex).
Compile with XeLaTeX or LuaLaTeX; in Overleaf choose that compiler.
Tables contain coefficients, SE, t, fixed/estimated status, N, excluded
rows, R-squared, adjusted R-squared, residual df/SE and model specifications.
Saved earlier-revision models are labeled. Current comparison and latest
sensitivity baseline/alternative are included with sample-policy notes.
Special LaTeX characters in names/notes are escaped.
examples/verified_results.tex is a compiled/visually checked example using
summary results from the supplied 207-row file (no raw data is bundled).
English labels and the default font are used. Non-Latin scripts may need
an appropriate font and direction configuration in your LaTeX editor.

CALCULATIONS AND LIMITS
OLS via scaled QR; conventional or HC1 standard errors; optional fixed
coefficients. Fixed terms have no estimated SE/t. Panel fixed effects,
clustered/HAC errors, p-values and confidence intervals are not implemented.
HC1 does not adjust for serial correlation or clustered observations.
CAPM/model fits pool all working rows; select a single asset's data when
asset-specific parameters are wanted.
Created variables store computed values. Later changes to their inputs do
not automatically recalculate them; workflows execute the recorded order.
Lag means the previous observed row within each entity, not the preceding
calendar month. Date handling and merges retain earlier explicit semantics.
Percent strings stay in percentage-point units: 5% becomes 5.
No live generative AI is connected. No new runtime UI/chart/font dependency
was added. Excel uses on-demand SheetJS from a CDN; internet is required
when not cached. Existing non-Data-Analyst modules have their own behavior.
Browser memory limits matter: 100 MB / 1M row guards are not performance
promises. This release is suitable for evaluation, not a claim of readiness
for arbitrary large panels or commercial production.
See TEST_REPORT_v3_5_0.md and README_FA.md.

TESTS (Node.js, no npm installation)
node tests/research-core.test.cjs
node tests/coefficients.test.cjs
node tests/merge.test.cjs
node tests/workflow.test.cjs
node tests/studio-workflow.test.cjs
node tests/data-tools.test.cjs

Existing landing page, assets, scholarly modules, whitepaper and testnet
materials are retained. DRXA remains testnet-only: no real monetary value,
sale, fundraising, real liquidity or mainnet deployment.
