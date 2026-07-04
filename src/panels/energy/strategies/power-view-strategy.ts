import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { DEFAULT_POWER_COLLECTION_KEY } from "../../../data/energy";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import type { EnergyCardSpec } from "./energy-card-builder";
import { EnergyCardBuilder } from "./energy-card-builder";
import type { EnergyConditions } from "./energy-conditions";
import { loadEnergyConditions } from "./energy-conditions";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";

/** Total badges, in order, shown when their underlying source is present. */
const TOTAL_BADGE_TYPES: readonly {
  type: string;
  visible: (c: EnergyConditions) => boolean;
}[] = [
  { type: "power-total", visible: (c) => c.hasPowerSources },
  { type: "gas-total", visible: (c) => c.hasGasRateSource },
  { type: "water-total", visible: (c) => c.hasWaterRateSource },
];

@customElement("power-view-strategy")
export class PowerViewStrategy extends ReactiveElement {
  static registryDependencies: readonly LovelaceStrategyDependency[] = [];

  static async generate(
    _config: EnergyViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    // The "now" view is real-time; it has its own collection, distinct from
    // the shared energy one every other view defaults to.
    const collectionKey =
      _config.collection_key || DEFAULT_POWER_COLLECTION_KEY;
    const hidden = _config.hidden_cards;

    const chartsSection: LovelaceSectionConfig = {
      type: "grid",
      cards: [],
    };
    const badges: LovelaceBadgeConfig[] = [];

    const view: LovelaceViewConfig = {
      type: "sections",
      sections: [chartsSection],
    };

    // The "Now" view is real-time; roll its day period over at midnight.
    const conditions = await loadEnergyConditions(hass, collectionKey, {
      midnightRollover: true,
    });

    // No sources configured
    if (
      !conditions ||
      (!conditions.hasPowerSources &&
        !conditions.hasPowerDevices &&
        !conditions.hasWaterRateDevices &&
        !conditions.hasWaterRateSource &&
        !conditions.hasGasRateSource)
    ) {
      return view;
    }

    const builder = new EnergyCardBuilder(
      hass,
      conditions,
      "now",
      collectionKey,
      hidden
    );

    for (const { type, visible } of TOTAL_BADGE_TYPES) {
      if (visible(conditions)) {
        badges.push({ type, collection_key: collectionKey });
      }
    }
    conditions.preferences.energy_sources.forEach((source) => {
      if (source.type === "battery" && source.stat_soc) {
        badges.push({
          type: "entity",
          entity: source.stat_soc,
        });
      }
    });

    // Chart cards, in order, when visible. The sankey cards need per-source
    // computed extras, so each builds its own lazily.
    const chartCards: readonly EnergyCardSpec[] = [
      {
        cardType: "power-sources-graph",
        extra: { grid_options: { columns: 36 } },
      },
      {
        cardType: "power-sankey",
        extra: () =>
          builder.sankeyExtra(
            conditions.preferences.device_consumption,
            (d) => d.stat_rate,
            36
          ),
      },
      {
        cardType: "water-flow-sankey",
        extra: () =>
          builder.sankeyExtra(
            conditions.preferences.device_consumption_water,
            (d) => d.stat_rate,
            36
          ),
      },
    ];

    builder.addAll(chartsSection.cards!, chartCards);

    if (badges.length) {
      view.badges = badges;
    }

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "power-view-strategy": PowerViewStrategy;
  }
}
