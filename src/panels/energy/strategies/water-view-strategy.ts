import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../../../data/energy";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import type { EnergyCardSpec } from "./energy-card-builder";
import { EnergyCardBuilder } from "./energy-card-builder";
import { loadEnergyConditions } from "./energy-conditions";
import { createSingleSectionView } from "./energy-view-layout";

/** Cards appended to the single water section, in order, when visible. */
const WATER_CARDS: readonly EnergyCardSpec[] = [
  {
    cardType: "energy-water-graph",
    extra: { grid_options: { columns: 24 } },
  },
  {
    cardType: "energy-sources-table",
    extra: { types: ["water"], grid_options: { columns: 12 } },
  },
];

@customElement("water-view-strategy")
export class WaterViewStrategy extends ReactiveElement {
  static registryDependencies: readonly LovelaceStrategyDependency[] = [];

  static async generate(
    _config: EnergyViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const collectionKey =
      _config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY;
    const hidden = _config.hidden_cards;

    const { view, section } = createSingleSectionView(collectionKey);

    const conditions = await loadEnergyConditions(hass, collectionKey);

    // No water sources or devices available
    if (
      !conditions ||
      (!conditions.hasWaterDevices && !conditions.hasWaterSource)
    ) {
      return view;
    }

    const builder = new EnergyCardBuilder(
      hass,
      conditions,
      "water",
      collectionKey,
      hidden
    );

    section.cards!.push(
      builder.card("energy-compare", { grid_options: { columns: 36 } })
    );

    builder.addAll(section.cards!, WATER_CARDS);

    // Only include if we have at least 1 water device in the config.
    if (builder.isVisible("water-sankey")) {
      section.cards!.push(
        builder.card(
          "water-sankey",
          builder.sankeyExtra(
            conditions.preferences.device_consumption_water,
            (d) => d.stat_consumption,
            24
          )
        )
      );
    }

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "water-view-strategy": WaterViewStrategy;
  }
}
