import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../../../data/energy";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import { ELECTRICITY_CARDS } from "./energy-cards";
import { EnergyCardBuilder } from "./energy-card-builder";
import { loadEnergyConditions } from "./energy-conditions";
import { energyDateSelectionFooter } from "./energy-view-layout";
import {
  LARGE_SCREEN_CONDITION,
  SMALL_SCREEN_CONDITION,
} from "../../lovelace/strategies/helpers/view-columns-conditions";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";

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

    for (const spec of ELECTRICITY_CARDS) {
      if (spec.slot !== "sidebar" || !builder.isVisible(spec.cardType)) {
        continue;
      }
      const cardConfig = builder.card(spec.cardType, spec.extra, {
        title: spec.title,
      });
      sidebarSection.cards!.push(cardConfig);
      view.sections!.push({
        type: "grid",
        column_span: 1,
        cards: [cardConfig],
        visibility: [SMALL_SCREEN_CONDITION],
      });
    }

    builder.addAll(
      gaugeCards,
      ELECTRICITY_CARDS.filter((c) => c.slot === "gauge")
    );

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

    builder.addAll(
      mainCards,
      ELECTRICITY_CARDS.filter((c) => c.slot === "main")
    );

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
