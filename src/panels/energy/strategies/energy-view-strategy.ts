import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../../../data/energy";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import type { EnergyCardSpec } from "./energy-card-builder";
import { EnergyCardBuilder } from "./energy-card-builder";
import { loadEnergyConditions } from "./energy-conditions";
import { energyDateSelectionFooter } from "./energy-view-layout";
import {
  LARGE_SCREEN_CONDITION,
  SMALL_SCREEN_CONDITION,
} from "../../lovelace/strategies/helpers/view-columns-conditions";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";

/**
 * Cards that live in the sidebar and are mirrored into their own
 * small-screen section, in order, when visible.
 */
const SIDEBAR_CARDS: readonly { cardType: string; title?: boolean }[] = [
  { cardType: "energy-distribution" },
  // Only included if we have both grid import and export configured.
  { cardType: "energy-grid-balance", title: false },
];

/** Gauges collected into a single grid, in order, when visible. */
const GAUGE_CARD_SPECS: readonly EnergyCardSpec[] = [
  // Only included if we have a grid source & return.
  { cardType: "energy-grid-neutrality-gauge", title: false },
  // Only included if we have a solar source & return.
  { cardType: "energy-solar-consumed-gauge", title: false },
  // Only included if we have a solar source & grid.
  { cardType: "energy-self-sufficiency-gauge", title: false },
  // Only included if we have a grid.
  { cardType: "energy-carbon-consumed-gauge", title: false },
];

/** Main-column cards, in order, when visible. */
const MAIN_CARDS: readonly EnergyCardSpec[] = [
  // Only included if we have a grid or battery.
  { cardType: "energy-usage-graph", extra: { grid_options: { columns: 36 } } },
  // Only included if we have a solar source.
  { cardType: "energy-solar-graph", extra: { grid_options: { columns: 36 } } },
  {
    cardType: "energy-sources-table",
    extra: {
      types: ["grid", "solar", "battery"],
      grid_options: { columns: 36 },
    },
  },
  // Device cards: each only included if we have at least 1 device configured.
  {
    cardType: "energy-devices-detail-graph",
    extra: { grid_options: { columns: 36 } },
  },
  {
    cardType: "energy-devices-graph",
    extra: { grid_options: { columns: 36 } },
  },
];

@customElement("energy-view-strategy")
export class EnergyViewStrategy extends ReactiveElement {
  static registryDependencies: readonly LovelaceStrategyDependency[] = [];

  static async generate(
    _config: EnergyViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const collectionKey =
      _config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY;
    const hidden = _config.hidden_cards;

    const view: LovelaceViewConfig = {
      type: "sections",
      sections: [],
      sidebar: {
        sections: [{ cards: [] }],
        visibility: [LARGE_SCREEN_CONDITION],
      },
      footer: energyDateSelectionFooter(collectionKey),
    };

    const conditions = await loadEnergyConditions(hass, collectionKey);

    // No energy sources available
    if (
      !conditions ||
      (!conditions.hasAnySource && !conditions.hasDeviceConsumption)
    ) {
      return view;
    }

    const builder = new EnergyCardBuilder(
      hass,
      conditions,
      "electricity",
      collectionKey,
      hidden
    );

    const mainCards: LovelaceCardConfig[] = [];
    const gaugeCards: LovelaceCardConfig[] = [];
    const sidebarSection = view.sidebar!.sections![0];

    for (const { cardType, title } of SIDEBAR_CARDS) {
      if (!builder.isVisible(cardType)) continue;
      const cardConfig = builder.card(cardType, {}, { title });
      sidebarSection.cards!.push(cardConfig);
      view.sections!.push({
        type: "grid",
        column_span: 1,
        cards: [cardConfig],
        visibility: [SMALL_SCREEN_CONDITION],
      });
    }

    builder.addAll(gaugeCards, GAUGE_CARD_SPECS);

    if (gaugeCards.length) {
      sidebarSection.cards!.push({
        type: "grid",
        columns: gaugeCards.length === 1 ? 1 : 2,
        cards: gaugeCards,
      });
      view.sections!.push({
        type: "grid",
        column_span: 1,
        visibility: [SMALL_SCREEN_CONDITION],
        cards:
          gaugeCards.length === 1
            ? [gaugeCards[0]]
            : gaugeCards.map((card) => ({
                ...card,
                grid_options: { columns: 6 },
              })),
      });
    }

    mainCards.push(
      builder.card("energy-compare", { grid_options: { columns: 36 } })
    );

    builder.addAll(mainCards, MAIN_CARDS);

    if (builder.isVisible("energy-sankey")) {
      mainCards.push(
        builder.card(
          "energy-sankey",
          builder.sankeyExtra(
            conditions.preferences.device_consumption,
            (d) => d.stat_consumption,
            36
          )
        )
      );
    }

    view.sections!.push({
      type: "grid",
      column_span: 3,
      cards: mainCards,
    });

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-view-strategy": EnergyViewStrategy;
  }
}
