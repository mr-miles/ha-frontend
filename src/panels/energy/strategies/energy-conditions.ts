import { getEnergyDataCollection } from "../../../data/energy";
import type {
  EnergyPreferences,
  GridSourceTypeEnergyPreference,
} from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { EnergyViewPath } from "./energy-cards";
import {
  ENERGY_CARD_CATALOG,
  energyCardKey,
  isEnergyCardHidden,
} from "./energy-cards";

type EnergyConditionName =
  | "hasGridSource"
  | "hasReturn"
  | "hasSolar"
  | "hasBattery"
  | "hasAnySource"
  | "hasEnergySource"
  | "hasGasSource"
  | "hasWaterSource"
  | "hasWaterDevices"
  | "hasDeviceConsumption"
  | "hasPowerSources"
  | "hasPowerDevices"
  | "hasWaterRateDevices"
  | "hasWaterRateSource"
  | "hasGasRateSource";

type EnergyCardApplicabilityPredicate = (
  conditions: EnergyConditions
) => boolean;

/**
 * Card applicability, keyed by catalog entry. This is the single source of
 * truth for whether a card can ever show for a given set of preferences:
 * view strategies use it to decide what to render, and the customise dialog
 * uses it to decide what to offer, so the two can never disagree.
 */
const ENERGY_CARD_APPLICABILITY: ReadonlyMap<
  string,
  EnergyCardApplicabilityPredicate
> = new Map<string, EnergyCardApplicabilityPredicate>([
  // --- Overview ---
  [
    energyCardKey("overview", "energy-distribution"),
    (c) => c.hasGridSource || c.hasBattery || c.hasSolar,
  ],
  [energyCardKey("overview", "energy-sources-table"), (c) => c.hasAnySource],
  [energyCardKey("overview", "power-sources-graph"), (c) => c.hasPowerSources],
  [
    energyCardKey("overview", "energy-usage-graph"),
    (c) => c.hasGridSource || c.hasBattery,
  ],
  [energyCardKey("overview", "energy-gas-graph"), (c) => c.hasGasSource],
  [
    energyCardKey("overview", "energy-water-graph"),
    (c) => c.hasWaterSource || c.hasWaterDevices,
  ],

  // --- Electricity ---
  [
    energyCardKey("electricity", "energy-distribution"),
    (c) => c.hasGridSource || c.hasBattery || c.hasSolar,
  ],
  [
    energyCardKey("electricity", "energy-grid-balance"),
    (c) => c.hasGridSource && c.hasReturn,
  ],
  [
    energyCardKey("electricity", "energy-grid-neutrality-gauge"),
    (c) => c.hasReturn,
  ],
  [
    energyCardKey("electricity", "energy-solar-consumed-gauge"),
    (c) => c.hasSolar && c.hasReturn,
  ],
  [
    energyCardKey("electricity", "energy-self-sufficiency-gauge"),
    (c) => c.hasSolar && c.hasGridSource,
  ],
  [
    energyCardKey("electricity", "energy-carbon-consumed-gauge"),
    (c) => c.hasGridSource,
  ],
  [
    energyCardKey("electricity", "energy-usage-graph"),
    (c) => c.hasGridSource || c.hasBattery,
  ],
  [energyCardKey("electricity", "energy-solar-graph"), (c) => c.hasSolar],
  [
    energyCardKey("electricity", "energy-sources-table"),
    (c) => c.hasGridSource || c.hasSolar || c.hasBattery,
  ],
  [
    energyCardKey("electricity", "energy-devices-detail-graph"),
    (c) => c.hasDeviceConsumption,
  ],
  [
    energyCardKey("electricity", "energy-devices-graph"),
    (c) => c.hasDeviceConsumption,
  ],
  [
    energyCardKey("electricity", "energy-sankey"),
    (c) => c.hasDeviceConsumption,
  ],

  // --- Gas ---
  [energyCardKey("gas", "energy-gas-graph"), (c) => c.hasGasSource],
  [energyCardKey("gas", "energy-sources-table"), (c) => c.hasGasSource],

  // --- Water ---
  [energyCardKey("water", "energy-water-graph"), (c) => c.hasWaterSource],
  [energyCardKey("water", "energy-sources-table"), (c) => c.hasWaterSource],
  [energyCardKey("water", "water-sankey"), (c) => c.hasWaterDevices],

  // --- Now (power) ---
  [energyCardKey("now", "power-sources-graph"), (c) => c.hasPowerSources],
  [energyCardKey("now", "power-sankey"), (c) => c.hasPowerDevices],
  [energyCardKey("now", "water-flow-sankey"), (c) => c.hasWaterRateDevices],
]);

/**
 * The applicability/visibility decisions for the energy dashboard, computed
 * once per set of preferences. Source-shape predicates (`hasGridSource`,
 * `hasBattery`, ...) are lazily evaluated and cached on first access, since
 * a single `generate()` call reads several of them multiple times across
 * catalog entries. Card-level applicability is derived from those
 * predicates here, so it lives with the rest of the strategy logic rather
 * than inside the (data-only) card catalog.
 */
export class EnergyConditions {
  constructor(private readonly _prefs: EnergyPreferences) {}

  /** The raw preferences, for call sites that need to iterate a source/device list directly. */
  get preferences(): EnergyPreferences {
    return this._prefs;
  }

  private readonly _cache = new Map<EnergyConditionName, boolean>();

  private _memo(name: EnergyConditionName, compute: () => boolean): boolean {
    let value = this._cache.get(name);
    if (value === undefined) {
      value = compute();
      this._cache.set(name, value);
    }
    return value;
  }

  get hasGridSource(): boolean {
    return this._memo("hasGridSource", () =>
      this._prefs.energy_sources.some(
        (source): source is GridSourceTypeEnergyPreference =>
          source.type === "grid" &&
          (!!source.stat_energy_from || !!source.stat_energy_to)
      )
    );
  }

  get hasReturn(): boolean {
    return this._memo("hasReturn", () =>
      this._prefs.energy_sources.some(
        (source) => source.type === "grid" && !!source.stat_energy_to
      )
    );
  }

  get hasSolar(): boolean {
    return this._memo("hasSolar", () =>
      this._prefs.energy_sources.some((source) => source.type === "solar")
    );
  }

  get hasBattery(): boolean {
    return this._memo("hasBattery", () =>
      this._prefs.energy_sources.some((source) => source.type === "battery")
    );
  }

  /** Any source at all has been configured. */
  get hasAnySource(): boolean {
    return this._memo(
      "hasAnySource",
      () => this._prefs.energy_sources.length > 0
    );
  }

  /** Any electricity-relevant source: grid, solar, or battery. */
  get hasEnergySource(): boolean {
    return this._memo("hasEnergySource", () =>
      this._prefs.energy_sources.some((source) =>
        ["grid", "solar", "battery"].includes(source.type)
      )
    );
  }

  get hasGasSource(): boolean {
    return this._memo("hasGasSource", () =>
      this._prefs.energy_sources.some((source) => source.type === "gas")
    );
  }

  get hasWaterSource(): boolean {
    return this._memo("hasWaterSource", () =>
      this._prefs.energy_sources.some((source) => source.type === "water")
    );
  }

  get hasWaterDevices(): boolean {
    return this._memo(
      "hasWaterDevices",
      () => (this._prefs.device_consumption_water?.length ?? 0) > 0
    );
  }

  get hasDeviceConsumption(): boolean {
    return this._memo(
      "hasDeviceConsumption",
      () => this._prefs.device_consumption.length > 0
    );
  }

  get hasPowerSources(): boolean {
    return this._memo("hasPowerSources", () =>
      this._prefs.energy_sources.some((source) => {
        if (source.type === "solar" && source.stat_rate) return true;
        if (source.type === "battery" && source.stat_rate) return true;
        if (source.type === "grid") {
          return !!source.stat_rate || !!source.power_config;
        }
        return false;
      })
    );
  }

  get hasPowerDevices(): boolean {
    return this._memo("hasPowerDevices", () =>
      this._prefs.device_consumption.some((device) => device.stat_rate)
    );
  }

  get hasWaterRateDevices(): boolean {
    return this._memo("hasWaterRateDevices", () =>
      (this._prefs.device_consumption_water ?? []).some(
        (device) => device.stat_rate
      )
    );
  }

  /** A water source exposing a live flow-rate statistic. */
  get hasWaterRateSource(): boolean {
    return this._memo("hasWaterRateSource", () =>
      this._prefs.energy_sources.some(
        (source) => source.type === "water" && !!source.stat_rate
      )
    );
  }

  /** A gas source exposing a live flow-rate statistic. */
  get hasGasRateSource(): boolean {
    return this._memo("hasGasRateSource", () =>
      this._prefs.energy_sources.some(
        (source) => source.type === "gas" && !!source.stat_rate
      )
    );
  }

  /** Whether the catalog card `(view, cardType)` can ever show for these preferences. */
  isApplicable(view: EnergyViewPath, cardType: string): boolean {
    const predicate = ENERGY_CARD_APPLICABILITY.get(
      energyCardKey(view, cardType)
    );
    return !!predicate && predicate(this);
  }

  /**
   * Whether a view strategy should emit this card: it must be applicable to
   * the current preferences and not hidden by the user.
   */
  isVisible(
    view: EnergyViewPath,
    cardType: string,
    hidden: string[] | undefined
  ): boolean {
    return (
      this.isApplicable(view, cardType) &&
      !isEnergyCardHidden(view, cardType, hidden)
    );
  }

  /** Keys of all catalog cards that apply to these preferences for a view. */
  applicableCardKeys(view: EnergyViewPath): string[] {
    return ENERGY_CARD_CATALOG.filter(
      (c) => c.view === view && this.isApplicable(c.view, c.cardType)
    ).map((c) => c.key);
  }

  /** True when a view has applicable cards but every one of them is hidden. */
  isViewEmpty(view: EnergyViewPath, hidden: string[] | undefined): boolean {
    const applicable = this.applicableCardKeys(view);
    return (
      applicable.length > 0 && applicable.every((key) => hidden?.includes(key))
    );
  }
}

/** Exposed for tests that verify every catalog entry has an applicability rule. */
export const ENERGY_CARD_APPLICABILITY_KEYS: ReadonlySet<string> = new Set(
  ENERGY_CARD_APPLICABILITY.keys()
);

/**
 * Fetches the energy collection for `collectionKey` and wraps its
 * preferences in an `EnergyConditions`, or returns `undefined` when no
 * preferences are available yet. Shared by every view strategy so the
 * `getEnergyDataCollection` + `refresh()` + null-check dance lives in one
 * place instead of being repeated per view.
 */
export const loadEnergyConditions = async (
  hass: HomeAssistant,
  collectionKey: string,
  options: { midnightRollover?: boolean } = {}
): Promise<EnergyConditions | undefined> => {
  const energyCollection = getEnergyDataCollection(hass, {
    key: collectionKey,
    midnightRollover: options.midnightRollover,
  });
  if (!energyCollection.prefs) {
    await energyCollection.refresh();
  }
  const prefs = energyCollection.prefs;
  return prefs ? new EnergyConditions(prefs) : undefined;
};
