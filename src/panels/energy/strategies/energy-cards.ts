import type { LocalizeKeys } from "../../../common/translations/localize";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";

/** Strategy config shared by the per-view energy strategies. */
export interface EnergyViewStrategyConfig extends LovelaceStrategyConfig {
  collection_key?: string;
  hidden_cards?: string[];
}

export type EnergyViewPath =
  "overview" | "electricity" | "gas" | "water" | "now";

// --- Card catalog ----------------------------------------------------------
// A plain data catalog of the cards a view strategy may render: which view
// they belong to, and their localized label for the customise dialog. It
// intentionally knows nothing about *when* a card applies or how a view is
// assembled - that behaviour lives in `EnergyConditions` and the individual
// view strategies, so this file stays a single source of truth for card
// identity without also being a decision-maker.

export interface EnergyCardDefinition {
  /** Stable identifier and storage token: `<view>.<cardType>`. */
  key: string;
  view: EnergyViewPath;
  cardType: string;
  /** Localize key for the label shown in the customise dialog. */
  labelKey: LocalizeKeys;
}

export const energyCardKey = (view: EnergyViewPath, cardType: string): string =>
  `${view}.${cardType}`;

const card = (
  view: EnergyViewPath,
  cardType: string,
  labelKey: LocalizeKeys
): EnergyCardDefinition => ({
  key: energyCardKey(view, cardType),
  view,
  cardType,
  labelKey,
});

export const ENERGY_CARD_CATALOG: readonly EnergyCardDefinition[] = [
  // --- Overview ---
  card(
    "overview",
    "energy-distribution",
    "ui.panel.energy.cards.energy_distribution_title"
  ),
  card(
    "overview",
    "energy-sources-table",
    "ui.panel.energy.cards.energy_sources_table_title"
  ),
  card(
    "overview",
    "power-sources-graph",
    "ui.panel.energy.cards.power_sources_graph_title"
  ),
  card(
    "overview",
    "energy-usage-graph",
    "ui.panel.energy.cards.energy_usage_graph_title"
  ),
  card(
    "overview",
    "energy-gas-graph",
    "ui.panel.energy.cards.energy_gas_graph_title"
  ),
  // One toggle gates the water row, which renders energy-water-graph (sources)
  // or, with only water devices, water-sankey.
  card(
    "overview",
    "energy-water-graph",
    "ui.panel.energy.cards.energy_water_graph_title"
  ),

  // --- Electricity ---
  card(
    "electricity",
    "energy-distribution",
    "ui.panel.energy.cards.energy_distribution_title"
  ),
  card(
    "electricity",
    "energy-grid-balance",
    "ui.panel.energy.cards.energy_grid_balance_title"
  ),
  card(
    "electricity",
    "energy-grid-neutrality-gauge",
    "ui.panel.energy.cards.energy_grid_neutrality_gauge_title"
  ),
  card(
    "electricity",
    "energy-solar-consumed-gauge",
    "ui.panel.energy.cards.energy_solar_consumed_gauge_title"
  ),
  card(
    "electricity",
    "energy-self-sufficiency-gauge",
    "ui.panel.energy.cards.energy_self_sufficiency_gauge_title"
  ),
  card(
    "electricity",
    "energy-carbon-consumed-gauge",
    "ui.panel.energy.cards.energy_carbon_consumed_gauge_title"
  ),
  card(
    "electricity",
    "energy-usage-graph",
    "ui.panel.energy.cards.energy_usage_graph_title"
  ),
  card(
    "electricity",
    "energy-solar-graph",
    "ui.panel.energy.cards.energy_solar_graph_title"
  ),
  card(
    "electricity",
    "energy-sources-table",
    "ui.panel.energy.cards.energy_sources_table_title"
  ),
  card(
    "electricity",
    "energy-devices-detail-graph",
    "ui.panel.energy.cards.energy_devices_detail_graph_title"
  ),
  card(
    "electricity",
    "energy-devices-graph",
    "ui.panel.energy.cards.energy_devices_graph_title"
  ),
  card(
    "electricity",
    "energy-sankey",
    "ui.panel.energy.cards.energy_sankey_title"
  ),

  // --- Gas ---
  card(
    "gas",
    "energy-gas-graph",
    "ui.panel.energy.cards.energy_gas_graph_title"
  ),
  card(
    "gas",
    "energy-sources-table",
    "ui.panel.energy.cards.energy_sources_table_title"
  ),

  // --- Water ---
  card(
    "water",
    "energy-water-graph",
    "ui.panel.energy.cards.energy_water_graph_title"
  ),
  card(
    "water",
    "energy-sources-table",
    "ui.panel.energy.cards.energy_sources_table_title"
  ),
  card("water", "water-sankey", "ui.panel.energy.cards.water_sankey_title"),

  // --- Now (power) ---
  card(
    "now",
    "power-sources-graph",
    "ui.panel.energy.cards.power_sources_graph_title"
  ),
  card("now", "power-sankey", "ui.panel.energy.cards.power_sankey_title"),
  card(
    "now",
    "water-flow-sankey",
    "ui.panel.energy.cards.water_flow_sankey_title"
  ),
];

// --- Lookup helpers --------------------------------------------------------

const ENERGY_CARD_CATALOG_BY_KEY = new Map<string, EnergyCardDefinition>(
  ENERGY_CARD_CATALOG.map((c) => [c.key, c])
);

/** The catalog entry for a `(view, cardType)` pair, or undefined if unknown. */
export const energyCardEntry = (
  view: EnergyViewPath,
  cardType: string
): EnergyCardDefinition | undefined =>
  ENERGY_CARD_CATALOG_BY_KEY.get(energyCardKey(view, cardType));

export const isEnergyCardHidden = (
  view: EnergyViewPath,
  cardType: string,
  hidden: string[] | undefined
): boolean => !!hidden?.includes(energyCardKey(view, cardType));
