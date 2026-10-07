# DAYRIXA Entry Lab 0.1 — implementation record

This is an experimental, single-stock research tool. It is **not** a replication of Gu–Kelly–Xiu and not a pretrained general market signal. The models actually fit the uploaded history; there are no hardcoded market forecasts. The sample is deterministic synthetic data, and can never produce a real entry recommendation.

## Scientific provenance

- Gu, Kelly & Xiu (2020), *Empirical Asset Pricing via Machine Learning*, Review of Financial Studies 33(5), 2223–2273. DOI: https://doi.org/10.1093/rfs/hhaa009. Basis for comparing penalized regression, boosted trees and neural networks for return prediction. The published study uses a much broader panel and predictor set than this app. The exact feature list, hyperparameters and thresholds below are engineering choices, **not formulas or settings claimed to have been copied verbatim from the paper**.
- Jiang, Kelly & Xiu (2023), *(Re-)Imag(in)ing Price Trends*, Journal of Finance 78, 3193–3249. DOI: https://doi.org/10.1111/jofi.13268. Relevant next-stage CNN study; not implemented here.
- Gu, Kelly & Xiu (2021), *Autoencoder Asset Pricing Models*, Journal of Econometrics 222, 429–450. DOI: https://doi.org/10.1016/j.jeconom.2020.07.009. Relevant next-stage conditional factor model; not implemented here.

This release does not claim equation-by-equation replication of any paper. A full verified replication, cross-sectional dataset, and economic validation are separate next milestones.

## Data contract

Daily CSV/TSV, dates YYYY-MM-DD, columns Date, Open, High, Low, Close, Volume. Optional Symbol/Ticker, Adj Close/Adjusted Close. One model is trained per selected symbol. At least 900 rows, and at least three full prediction horizons in the test set, are required. 12 MB/file and 15,000 rows/symbol limits. Reject duplicate symbol/date, impossible OHLC, missing numeric cells, and invalid dates; sort valid data by date.

When Adj Close is supplied, multiply O/H/L/C by AdjClose / Close. This uses the vendor's adjustment conventions, potentially including distributions; target and reported performance are consequently adjusted return proxies. Without Adj Close, require explicit confirmation that OHLC already share the same adjustment convention before an entry status can be emitted. Volume is vendor volume, not split-adjusted by this app. Check major corporate actions separately. Gaps above seven calendar days and daily changes above 50% block current entry evaluation; they are diagnostics, not complete data validation.

## Target and features

All information is observed by session t close. Define h = 21 or 63 sessions.

    y[t,h] = adjusted_close[t+h] / adjusted_open[t+1] - 1

This is an arithmetic return identity with a chosen execution convention, not a new asset-pricing equation. At latest close, an estimate concerns a next-session entry; it cannot be executed retrospectively at today's close.

Features: trailing simple returns over 5/20/60 sessions; population daily return standard deviations over 20/60 sessions; current volume / trailing 20-session average volume - 1; (high-low)/close; close/open-1; open/previous close-1; close/trailing 20-session mean close-1. These specific features are a documented reduced implementation, not the full published feature set.

Normalize each feature using training-only mean and population standard deviation (unit scale if zero), then clip standardized inputs to [-10,10]. Normalize targets by training mean and standard deviation. All scalers refit only on the corresponding fitting set.

## Implemented estimators

### Ridge

Minimize on standardized targets and features:

    mean((y_standardized - intercept - X_standardized * beta)^2)
      + 0.1 * sum(beta^2)

The intercept is unpenalized. Solve normal equations with pivoted elimination. This is the standard penalized least-squares objective; the penalty 0.1 is an app default, not an optimality claim.

### Gradient boosting

70 squared-error boosting iterations, learning rate 0.06. Each base learner is a depth-one regression tree. Candidate thresholds are training feature deciles. Require both leaves to contain at least max(15, floor(0.08*n)) observations. Fit the mean current residual in each leaf and add 0.06 times that stump prediction. A deliberately small implementation, not a full library such as XGBoost.

### Neural network

One hidden layer with 8 tanh units; linear scalar output. Deterministic seed 17, 180 full-batch gradient steps, learning rate 0.025. Loss is squared standardized-target residual for |residual| <= 8, with a linear continuation (clipped residual gradient) beyond 8, plus 0.01 times squared weights (gradient contribution 0.02*weight). Biases unpenalized. This is a small MLP, not a CNN, Transformer or deep architecture.

## Model selection and temporal separation

Split labeled observations at 60% and 80% chronologically. Purge training observations whose label endpoint reaches the first validation feature date. Purge validation observations whose label endpoint reaches the first test feature date. Select the model by validation MSE only, with fixed hyperparameters. Refit each model using labels ending strictly before the first test date. Compute test forecasts without refitting inside the test set. Show all models' test metrics but do not choose the model using test results.

Forecast skill = 1 - test_MSE_model / test_MSE_historical_mean. The baseline mean uses only the same pretest fitting data. RMSE displayed in percentage points. Overlapping h-session returns are dependent; no naive significance claims are made.

Latest inference: refit the validation-selected family on all labels fully realized by the final uploaded date, then predict from the last 60-session features. This is a different fit from the held-out test fit; performance is not guaranteed to transfer. No rolling retrain backtest is claimed.

## Trading simulation and decision policy (custom design)

Entry threshold: predicted gross return > supplied round-trip cost + 0.005. One position at a time. Enter next session open, exit at horizon close; ignore new signals while invested. Allocate all simulated strategy capital to that one position, with no leverage/shorting; this is a strategy test, not a user position-size recommendation. Idle cash earns zero. Deduct cost/2 multiplicatively at entry and exit. Mark to market daily. Buy-and-hold invests on the first eligible test-entry date and exits the final test-label endpoint, with the same one-round-trip costs. No taxes, account FX, variable liquidity/slippage or stop orders modeled.

The current experimental green status requires all of: positive forecast skill, test strategy return positive and above buy-and-hold, at least 12 closed test trades, current return prediction above cost+0.005, and scaled recent volatility <= 15%. Volatility = trailing 20-session daily standard deviation * sqrt(h), a simplifying independence/stationarity approximation, not a prediction interval. These gates are **custom heuristics**, not statistically validated scientific thresholds. Test gates do not replace a fresh prospective paper-trading evaluation. Negative forecast can emit an unfavorable assessment even where positive entry is not supported. Synthetic, stale, invalid or unconfirmed-adjustment data cannot emit green entry.

Data older than seven calendar days is historical-only; do not call its output today's signal. Strong overnight repricing may invalidate a close-based signal before next open. Recheck price before execution. No real orders are placed.

## Chart and audit

Historical entry markers come only from frozen pretest-model forecasts, never full-history in-sample fitted values. Store/download report with data dates, synthetic flag, selected model, validation/test metrics, purged split boundaries, test forecasts, trades, equity path and current prediction. Uploaded prices stay in browser memory; no server upload, account or cross-device persistence. Inputs/settings changes invalidate the prior output. Reloading clears the current session.

## Next scientific milestones

1. Obtain suitable multi-year point-in-time market data including delisted stocks and publication lags for fundamentals.
2. Verify exact equations/settings against full papers and supplemental code; implement a separately identified replication.
3. Rolling-origin retraining and nested time-based selection, robust uncertainty/calibration and selection-bias assessment.
4. Compare boosted models to MLP/CNN using identical executable cost assumptions and market regimes.
5. Prospective paper-trading and drift monitoring before any production claims.
6. Persist a versioned trained model and support short recent-history inference, live data access and optional platform integration.

## Canada data adapter — 0.2

The default flow accepts a Canadian ticker and exchange or searches for a name. Backend endpoints `/api/market/search` and `/api/market/history` query Yahoo's publicly reachable finance endpoints (not a contracted official data API). No cookies, login bypass, proxy rotation or alternate-host retry is used. HTTP 429 is surfaced to the user with a cooldown, and 401/403 stop automatic retrieval. CSV remains available. End-to-end live retrieval in the authoring environment returned HTTP 429; successful data processing is verified with explicitly synthetic provider fixtures, not claimed as a successful live market-data test.

Supported Yahoo suffixes: .TO (TSX), .V (TSX Venture), .NE (Cboe Canada), .CN (CSE). Exact metadata symbol and currency CAD must match. This does not imply every exchange instrument is supported by the provider. A CDR is classified using the instrument name rather than the exchange suffix. No US underlying stock history is substituted for a Canadian wrapper.

Request up to 10 years of daily OHLCV and Adj Close. Translate timestamps using provider exchange timezone. Drop the current session until its published regular session end plus 20 minutes; drop future dates. Missing OHLC/volume rows are counted and excluded; invalid OHLC, repeated dates or missing adjusted close stop evaluation. The client then applies its existing validation and minimum-history rules. No realtime price, listing-wide completeness or licensed production SLA is claimed. Data requests send the chosen symbol to the app server/Yahoo; uploaded CSV content still stays on the device. In-memory successful-response caches have 15-minute history / 10-minute search TTLs and bounded capacity; they are not durable.

Commercial redistribution requires a suitable provider agreement. This private research connector is intentionally replaceable. Latest data timestamp, source, exchange, instrument type, CAD currency and available history count are shown and included in exported reports.
