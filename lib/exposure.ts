import { toUsd } from "./format";
import { computeNetWorth } from "./networth";
import { EXPOSURE_CONFIG, type ExposureConfig } from "./exposure-config";

function effectiveRate(spot: number) {
  return spot * 1.015 + 3;
}

export type ExposureAccount = {
  balance: number;
  currency: string;
  type?: string;
  zone?: string;
};

export type ExposureObligation = {
  balance: number;
  currency: string;
  kind?: string;
};

export type CurrencySplit = {
  rub: number;
  usd: number;
  rubPct: number;
  usdPct: number;
};

export type ValueSplit = {
  rubUsd: number;
  usdUsd: number;
  rubPct: number;
  usdPct: number;
  totalUsd: number;
};

export type ExposureSnapshot = {
  income: CurrencySplit;
  outflow: CurrencySplit & {
    rubMonthly: number;
    usdMonthly: number;
    usdInRubAtSpot: number;
    totalRubAtSpot: number;
  };
  assets: ValueSplit;
  debt: ValueSplit;
  conversionLoadRub: number;
  conversionSharePct: number;
  spot: number;
  eff: number;
  verdict: string;
};

export type SensitivityResult = {
  rateShockPct: number;
  newSpot: number;
  usdLoadRub: number;
  usdLoadRubDelta: number;
  conversionSharePct: number;
  netWorthUsd: number;
  netWorthDeltaUsd: number;
  netWorthDeltaPct: number;
  note: string;
};

function pct(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0;
}

function toUsdAt(amount: number, currency: string, spot: number) {
  return toUsd(amount, currency, spot);
}

function incomeSplit(config: ExposureConfig): CurrencySplit {
  const rub = config.monthlyIncomeRub;
  const usd = config.monthlyIncomeUsd;
  const total = rub + usd;
  return { rub, usd, rubPct: pct(rub, total), usdPct: pct(usd, total) };
}

function outflowSplit(config: ExposureConfig, spot: number) {
  const rubMonthly = config.monthlyRubOutflow;
  const usdMonthly = config.monthlyUsdOutflow;
  const usdInRubAtSpot = usdMonthly * spot;
  const totalRubAtSpot = rubMonthly + usdInRubAtSpot;
  return {
    rubMonthly,
    usdMonthly,
    usdInRubAtSpot,
    totalRubAtSpot,
    rub: rubMonthly,
    usd: usdInRubAtSpot,
    rubPct: pct(rubMonthly, totalRubAtSpot),
    usdPct: pct(usdInRubAtSpot, totalRubAtSpot),
  };
}

function assetsByZone(accounts: ExposureAccount[], spot: number): ValueSplit {
  let rubZoneUsd = 0;
  let usdZoneUsd = 0;
  for (const a of accounts) {
    const bal = Number(a.balance);
    if (bal <= 0) continue;
    const usd = toUsdAt(bal, a.currency, spot);
    if (a.zone === "US") usdZoneUsd += usd;
    else rubZoneUsd += usd;
  }
  const totalUsd = rubZoneUsd + usdZoneUsd;
  return {
    rubUsd: rubZoneUsd,
    usdUsd: usdZoneUsd,
    rubPct: pct(rubZoneUsd, totalUsd),
    usdPct: pct(usdZoneUsd, totalUsd),
    totalUsd,
  };
}

function debtByCurrency(accounts: ExposureAccount[], obligations: ExposureObligation[], spot: number): ValueSplit {
  let rubDebtUsd = 0;
  let usdDebtUsd = 0;

  for (const a of accounts) {
    const bal = Number(a.balance);
    if (bal >= 0) continue;
    const usd = toUsdAt(Math.abs(bal), a.currency, spot);
    if (a.currency === "USD") usdDebtUsd += usd;
    else rubDebtUsd += usd;
  }

  for (const o of obligations) {
    if (o.kind === "credit_card") continue;
    const usd = toUsdAt(Math.abs(Number(o.balance)), o.currency, spot);
    if (o.currency === "USD") usdDebtUsd += usd;
    else rubDebtUsd += usd;
  }

  const totalUsd = rubDebtUsd + usdDebtUsd;
  return {
    rubUsd: rubDebtUsd,
    usdUsd: usdDebtUsd,
    rubPct: pct(rubDebtUsd, totalUsd),
    usdPct: pct(usdDebtUsd, totalUsd),
    totalUsd,
  };
}

export function computeExposure(
  accounts: ExposureAccount[],
  obligations: ExposureObligation[],
  spot: number,
  eff = effectiveRate(spot),
  config: ExposureConfig = EXPOSURE_CONFIG
): ExposureSnapshot {
  const income = incomeSplit(config);
  const outflow = outflowSplit(config, spot);
  const assets = assetsByZone(accounts, spot);
  const debt = debtByCurrency(accounts, obligations, spot);
  const conversionLoadRub = Math.round(outflow.usdMonthly * eff);
  const conversionSharePct = pct(conversionLoadRub, config.monthlyIncomeRub);

  const verdict =
    income.usdPct === 0 && outflow.usdPct >= 20
      ? "RUB income / USD costs → vulnerable to a weaker ruble"
      : "mixed currency flows";

  return {
    income,
    outflow,
    assets,
    debt,
    conversionLoadRub,
    conversionSharePct,
    spot,
    eff,
    verdict,
  };
}

export function sensitivityNote(rateShockPct: number) {
  if (rateShockPct > 0) return "RUB income, some USD spending → a weaker ruble works against you";
  if (rateShockPct < 0) return "a stronger ruble lowers the ₽ cost of USD spending and lifts net worth in $";
  return "baseline scenario at current spot";
}

export function computeSensitivity(
  accounts: ExposureAccount[],
  obligations: ExposureObligation[],
  spot: number,
  rateShockPct: number,
  config: ExposureConfig = EXPOSURE_CONFIG
): SensitivityResult {
  const newSpot = spot * (1 + rateShockPct);
  const newEff = effectiveRate(newSpot);
  const baseOutflow = outflowSplit(config, spot);
  const shockedOutflow = outflowSplit(config, newSpot);

  const usdLoadRub = Math.round(config.monthlyUsdOutflow * newEff);
  const usdLoadRubDelta = Math.round(shockedOutflow.usdInRubAtSpot - baseOutflow.usdInRubAtSpot);
  const conversionSharePct = pct(usdLoadRub, config.monthlyIncomeRub);

  const toUsdFn = (n: number, c: string) => toUsdAt(n, c, spot);
  const toUsdShocked = (n: number, c: string) => toUsdAt(n, c, newSpot);
  const baseNet = computeNetWorth(accounts, obligations, toUsdFn).net;
  const shockedNet = computeNetWorth(accounts, obligations, toUsdShocked).net;

  return {
    rateShockPct,
    newSpot,
    usdLoadRub,
    usdLoadRubDelta,
    conversionSharePct,
    netWorthUsd: shockedNet,
    netWorthDeltaUsd: shockedNet - baseNet,
    netWorthDeltaPct: baseNet !== 0 ? ((shockedNet - baseNet) / Math.abs(baseNet)) * 100 : 0,
    note: sensitivityNote(rateShockPct),
  };
}
