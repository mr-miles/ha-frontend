import type { LocalizeKeys } from "../../../common/translations/localize";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import type { EnergyConditions } from "./energy-conditions";

/** Strategy config shared by the per-view energy strategies. */
export interface EnergyViewStrategyConfig extends LovelaceStrategyConfig {
  collection_key?: string;
  hidden_cards?: string[];
}

export type EnergyViewPath =
  "overview" | "electricity" | "gas" | "water" | "now";

export const energyCardKey = (view: EnergyViewPath, cardType: string): string =>
  `${view}.${cardType}`;

export const isEnergyCardHidden = (
  view: EnergyViewPath,
  cardType: string,
  hidden: string[] | undefined
): boolean => !!hidden?.includes(energyCardKey(view, cardType));

// --- Card catalog ------------------------------------------------------
// Each view owns the list of cards it can render, including whether a card
// applies to a given set of preferences. A view strategy uses its list
// directly to build its cards; the customise dialog reads the same lists
// (via ENERGY_VIEW_CARDS) to render its per-view toggle groups. There is
// exactly one place a card is declared for a view, so the two can never
// disagree about what exists or when it applies.
//
// A card's localized title never varies by the view that embeds it - the
// same Lovelace card renders identically regardless of which tab it's on -
// so titles live in one global, cardType-keyed table instead of being
// repeated per view.

export interface EnergyCardSpec {
  cardType: string;
  isApplicable: (conditions: EnergyConditions) => boolean;
  /** Static layout overrides. Omitted for `dynamic` cards, which the owning strategy builds itself. */
  extra?: Partial<LovelaceCardConfig>;
  /** Defaults to true; suppresses the auto-localized title when false. */
  title?: boolean;
  /**
   * True when a card needs live, per-request data (e.g. a sankey card's
   * floor/area grouping) that can't be expressed as static `extra` here.
   * The owning strategy builds it directly; `EnergyCardBuilder.addAll` skips
   * it, using this list only for the card's applicability check.
   */
  dynamic?: boolean;
  /** Which layout bucket a card belongs to, for views with more than one (currently only "electricity"). */
  slot?: "sidebar" | "gauge" | "main";
}

export const ENERGY_CARD_LABELS: Readonly<Record<string, LocalizeKeys>> = {
  "energy-distribution": "ui.panel.energy.cards.energy_distribution_title",
  "energy-sources-table": "ui.panel.energy.cards.energy_sources_table_title",
  "power-sources-graph": "ui.panel.energy.cards.power_sources_graph_title",
  "energy-usage-graph": "ui.panel.energy.cards.energy_usage_graph_title",
  "energy-gas-graph": "ui.panel.energy.cards.energy_gas_graph_title",
  "energy-water-graph": "ui.panel.energy.cards.energy_water_graph_title",
  "energy-grid-balance": "ui.panel.energy.cards.energy_grid_balance_title",
  "energy-grid-neutrality-gauge":
    "ui.panel.energy.cards.energy_grid_neutrality_gauge_title",
  "energy-solar-consumed-gauge":
    "ui.panel.energy.cards.energy_solar_consumed_gauge_title",
  "energy-self-sufficiency-gauge":
    "ui.panel.energy.cards.energy_self_sufficiency_gauge_title",
  "energy-carbon-consumed-gauge":
    "ui.panel.energy.cards.energy_carbon_consumed_gauge_title",
  "energy-solar-graph": "ui.panel.energy.cards.energy_solar_graph_title",
  "energy-devices-detail-graph":
    "ui.panel.energy.cards.energy_devices_detail_graph_title",
  "energy-devices-graph": "ui.panel.energy.cards.energy_devices_graph_title",
  "energy-sankey": "ui.panel.energy.cards.energy_sankey_title",
  "water-sankey": "ui.panel.energy.cards.water_sankey_title",
  "power-sankey": "ui.panel.energy.cards.power_sankey_title",
  "water-flow-sankey": "ui.panel.energy.cards.water_flow_sankey_title",
};

export const OVERVIEW_CARDS: readonly EnergyCardSpec[] = [
  {
    cardType: "energy-distribution",
    isApplicable: (c) => c.hasGridSource || c.hasBattery || c.hasSolar,
  },
  {
    cardType: "energy-sources-table",
    isApplicable: (c) => c.hasAnySource,
    extra: { show_only_totals: true },
  },
  {
    cardType: "power-sources-graph",
    isApplicable: (c) => c.hasPowerSources,
    extra: { show_legend: false },
  },
  {
    cardType: "energy-usage-graph",
    isApplicable: (c) => c.hasGridSource || c.hasBattery,
  },
  { cardType: "energy-gas-graph", isApplicable: (c) => c.hasGasSource },
  // One toggle gates the row: the strategy renders energy-water-graph when
  // there's a water source, otherwise falls back to water-sankey.
  {
    cardType: "energy-water-graph",
    isApplicable: (c) => c.hasWaterSource || c.hasWaterDevices,
    dynamic: true,
  },
];

export const ELECTRICITY_CARDS: readonly EnergyCardSpec[] = [
  {
    cardType: "energy-distribution",
    isApplicable: (c) => c.hasGridSource || c.hasBattery || c.hasSolar,
    slot: "sidebar",
  },
  // Only included if we have both grid import and export configured.
  {
    cardType: "energy-grid-balance",
    isApplicable: (c) => c.hasGridSource && c.hasReturn,
    title: false,
    slot: "sidebar",
  },
  // Only included if we have a grid source & return.
  {
    cardType: "energy-grid-neutrality-gauge",
    isApplicable: (c) => c.hasReturn,
    title: false,
    slot: "gauge",
  },
  // Only included if we have a solar source & return.
  {
    cardType: "energy-solar-consumed-gauge",
    isApplicable: (c) => c.hasSolar && c.hasReturn,
    title: false,
    slot: "gauge",
  },
  // Only included if we have a solar source & grid.
  {
    cardType: "energy-self-sufficiency-gauge",
    isApplicable: (c) => c.hasSolar && c.hasGridSource,
    title: false,
    slot: "gauge",
  },
  // Only included if we have a grid.
  {
    cardType: "energy-carbon-consumed-gauge",
    isApplicable: (c) => c.hasGridSource,
    title: false,
    slot: "gauge",
  },
  {
    cardType: "energy-usage-graph",
    isApplicable: (c) => c.hasGridSource || c.hasBattery,
    extra: { grid_options: { columns: 36 } },
    slot: "main",
  },
  {
    cardType: "energy-solar-graph",
    isApplicable: (c) => c.hasSolar,
    extra: { grid_options: { columns: 36 } },
    slot: "main",
  },
  {
    cardType: "energy-sources-table",
    isApplicable: (c) => c.hasGridSource || c.hasSolar || c.hasBattery,
    extra: {
      types: ["grid", "solar", "battery"],
      grid_options: { columns: 36 },
    },
    slot: "main",
  },
  // Device cards: each only included if we have at least 1 device configured.
  {
    cardType: "energy-devices-detail-graph",
    isApplicable: (c) => c.hasDeviceConsumption,
    extra: { grid_options: { columns: 36 } },
    slot: "main",
  },
  {
    cardType: "energy-devices-graph",
    isApplicable: (c) => c.hasDeviceConsumption,
    extra: { grid_options: { columns: 36 } },
    slot: "main",
  },
  {
    cardType: "energy-sankey",
    isApplicable: (c) => c.hasDeviceConsumption,
    dynamic: true,
    slot: "main",
  },
];

export const GAS_CARDS: readonly EnergyCardSpec[] = [
  {
    cardType: "energy-gas-graph",
    isApplicable: (c) => c.hasGasSource,
    extra: { grid_options: { columns: 24 } },
  },
  {
    cardType: "energy-sources-table",
    isApplicable: (c) => c.hasGasSource,
    extra: { types: ["gas"], grid_options: { columns: 12 } },
  },
];

export const WATER_CARDS: readonly EnergyCardSpec[] = [
  {
    cardType: "energy-water-graph",
    isApplicable: (c) => c.hasWaterSource,
    extra: { grid_options: { columns: 24 } },
  },
  {
    cardType: "energy-sources-table",
    isApplicable: (c) => c.hasWaterSource,
    extra: { types: ["water"], grid_options: { columns: 12 } },
  },
  // Only included if we have at least 1 water device in the config.
  {
    cardType: "water-sankey",
    isApplicable: (c) => c.hasWaterDevices,
    dynamic: true,
  },
];

export const POWER_CARDS: readonly EnergyCardSpec[] = [
  {
    cardType: "power-sources-graph",
    isApplicable: (c) => c.hasPowerSources,
    extra: { grid_options: { columns: 36 } },
  },
  {
    cardType: "power-sankey",
    isApplicable: (c) => c.hasPowerDevices,
    dynamic: true,
  },
  {
    cardType: "water-flow-sankey",
    isApplicable: (c) => c.hasWaterRateDevices,
    dynamic: true,
  },
];

export const ENERGY_VIEW_CARDS: Readonly<
  Record<EnergyViewPath, readonly EnergyCardSpec[]>
> = {
  overview: OVERVIEW_CARDS,
  electricity: ELECTRICITY_CARDS,
  gas: GAS_CARDS,
  water: WATER_CARDS,
  now: POWER_CARDS,
};
