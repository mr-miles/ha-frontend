import type { LocalizeKeys } from "../../../common/translations/localize";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import type { EnergyConditions } from "./energy-conditions";
import { OVERVIEW_CARDS } from "./energy-overview-view-cards";
import { ELECTRICITY_CARDS } from "./energy-view-cards";
import { GAS_CARDS } from "./gas-view-cards";
import { WATER_CARDS } from "./water-view-cards";
import { POWER_CARDS } from "./power-view-cards";

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
// Each view's own card list (OVERVIEW_CARDS, ELECTRICITY_CARDS, ...) lives
// next to that view's strategy, in its `*-view-cards.ts` sibling - the one
// non-Lit module a `*-view-strategy.ts` file and this file both depend on.
// A view strategy uses its own list directly to build its cards; the
// customise dialog reads the same lists (via getEnergyViewCards() below) to
// render its per-view toggle groups. There is exactly one place a card is
// declared for a view, so the two can never disagree about what exists or
// when it applies - and neither has to import the (heavier, independently
// lazy-loaded) Lit strategy components to get there.
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

/**
 * Every view's card list, keyed by view. Built inside a function rather than
 * as a top-level constant: this module and each `*-view-cards.ts` sibling
 * import each other (this file for `EnergyCardSpec`/labels, the siblings for
 * their own `OVERVIEW_CARDS` etc.), and depending on which strategy a
 * consumer happens to import first, that cycle can resolve in an order where
 * one of these five bindings is still uninitialized. Reading them eagerly at
 * module top level risked silently capturing `undefined` for whichever view
 * lost that race; deferring the read into a function body means it only ever
 * runs after the whole module graph has finished loading, once, well before
 * any view strategy or the customise dialog actually calls this.
 */
export const getEnergyViewCards = (): Readonly<
  Record<EnergyViewPath, readonly EnergyCardSpec[]>
> => ({
  overview: OVERVIEW_CARDS,
  electricity: ELECTRICITY_CARDS,
  gas: GAS_CARDS,
  water: WATER_CARDS,
  now: POWER_CARDS,
});
