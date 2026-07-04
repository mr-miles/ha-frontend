import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import {
  DEFAULT_ENERGY_COLLECTION_KEY,
  DEFAULT_POWER_COLLECTION_KEY,
  EMPTY_PREFERENCES,
  getEnergyDataCollection,
} from "../../../data/energy";
import type { EnergyPreferences } from "../../../data/energy";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import type { LovelaceConfig } from "../../../data/lovelace/config/types";
import type { LovelaceStrategyViewConfig } from "../../../data/lovelace/config/view";
import type { LocalizeKeys } from "../../../common/translations/localize";
import type { HomeAssistant } from "../../../types";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";
import type { EnergyViewPath } from "./energy-cards";
import { EnergyConditions } from "./energy-conditions";

/**
 * Builds a view spec for one of this dashboard's tabs. `collection_key` is
 * deliberately left unset: every energy view strategy already has its own
 * default collection key (most default to the shared energy collection, but
 * e.g. the "now" view defaults to the real-time one instead - see each
 * view-strategy file), and those defaults already match what this dashboard
 * wants for every tab. A user can still override it with an explicit
 * `collection_key` of their own by configuring one of these view strategies
 * directly in their own dashboard YAML, bypassing this dashboard strategy
 * entirely - which is exactly why each view strategy's default is
 * strategy-dependent rather than assumed here.
 */
const defineView = (path: string, type: string): LovelaceStrategyViewConfig =>
  ({
    path,
    strategy: { type },
  }) as LovelaceStrategyViewConfig;

const OVERVIEW_VIEW = defineView("overview", "energy-overview");
const ENERGY_VIEW = defineView("electricity", "energy");
const WATER_VIEW = defineView("water", "water");
const GAS_VIEW = defineView("gas", "gas");
const POWER_VIEW = defineView("now", "power");

const WIZARD_VIEW = {
  type: "panel",
  path: "setup",
  cards: [{ type: "custom:energy-setup-wizard-card" }],
};

export interface EnergyDashboardStrategyConfig extends LovelaceStrategyConfig {
  type: "energy";
  default_collection?: string;
  hidden_cards?: string[];
}

/**
 * Picks which views the dashboard should offer, and in what order, for the
 * given preferences. A candidate view is dropped when every card it would
 * render has been hidden by the user, so we don't show an empty tab - unless
 * that would drop every view, in which case we keep them all so the
 * dashboard never renders blank and the customise entry stays reachable.
 *
 * Pure aside from reading `conditions`/`hidden`, so it's testable without a
 * `HomeAssistant` instance or an energy collection subscription.
 */
export const selectEnergyDashboardViews = (
  conditions: EnergyConditions,
  hidden: string[] | undefined
): LovelaceStrategyViewConfig[] => {
  const hasEnergy = conditions.hasEnergySource;
  const hasGas = conditions.hasGasSource;
  const hasWater = conditions.hasWaterSource || conditions.hasWaterDevices;
  const hasDevices = conditions.hasDeviceConsumption;
  const hasPower = conditions.hasPowerSources || conditions.hasPowerDevices;

  const candidateViewSpecs: readonly {
    view: LovelaceStrategyViewConfig;
    show: boolean;
  }[] = [
    { view: ENERGY_VIEW, show: hasEnergy || hasDevices },
    { view: GAS_VIEW, show: hasGas },
    { view: WATER_VIEW, show: hasWater },
    { view: POWER_VIEW, show: hasPower },
  ];
  const candidateViews = candidateViewSpecs
    .filter((v) => v.show)
    .map((v) => v.view);

  // The overview only earns its place when there's a "now" power source, or
  // when it would actually be summarising more than one other view.
  if (
    conditions.hasPowerSources ||
    [hasEnergy, hasGas, hasWater].filter(Boolean).length > 1
  ) {
    candidateViews.unshift(OVERVIEW_VIEW);
  }

  const views = candidateViews.filter(
    (view) => !conditions.isViewEmpty(view.path as EnergyViewPath, hidden)
  );
  return views.length > 0 ? views : candidateViews;
};

@customElement("energy-dashboard-strategy")
export class EnergyDashboardStrategy extends ReactiveElement {
  static registryDependencies: readonly LovelaceStrategyDependency[] = [];

  static async generate(
    _config: EnergyDashboardStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    const prefs = await fetchEnergyPrefs(hass, _config.default_collection);
    const conditions = new EnergyConditions(prefs);

    if (!conditions.hasAnySource && !conditions.hasDeviceConsumption) {
      await import("../cards/energy-setup-wizard-card");
      return {
        views: [WIZARD_VIEW],
      };
    }

    const hidden = _config.hidden_cards;
    const views = selectEnergyDashboardViews(conditions, hidden);

    return {
      views: views.map((view) => ({
        ...view,
        strategy: { ...view.strategy, hidden_cards: hidden },
        title:
          view.title ||
          hass.localize(`ui.panel.energy.title.${view.path}` as LocalizeKeys),
      })),
    };
  }

  static noEditor = true;
}

async function fetchEnergyPrefs(
  hass: HomeAssistant,
  defaultCollection?: string
): Promise<EnergyPreferences> {
  const collection = getEnergyDataCollection(hass, {
    key: defaultCollection || DEFAULT_ENERGY_COLLECTION_KEY,
    // When landing directly on the "Now" view this warms its real-time
    // collection, so it must be created with midnight rollover too.
    midnightRollover: defaultCollection === DEFAULT_POWER_COLLECTION_KEY,
  });

  return await new Promise<EnergyPreferences>((resolve) => {
    const unsub = collection.subscribe((data) => {
      unsub();
      resolve(data.prefs || EMPTY_PREFERENCES);
    });
  });
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-dashboard-strategy": EnergyDashboardStrategy;
  }
}
