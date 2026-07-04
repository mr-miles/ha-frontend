import {
  DEFAULT_ENERGY_COLLECTION_KEY,
  getEnergyDataCollection,
} from "../../../../../src/data/energy";
import type { HomeAssistant } from "../../../../../src/types";
import type { LovelaceViewConfig } from "../../../../../src/data/lovelace/config/view";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import { hasGasSource, isEnergyCardVisible } from "./energy-cards";
import type { LovelaceSectionConfig } from "../../../../../src/data/lovelace/config/section";
import type { LovelaceStrategyDependency } from "../../../../../src/panels/lovelace/strategies/types";

// Frozen historical snapshot for characterization testing; not styled as production code.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class LegacyGasViewStrategy {
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
      max_columns: 3,
      sections: [{ type: "grid", cards: [], column_span: 3 }],
      footer: {
        card: {
          type: "energy-date-selection",
          collection_key: collectionKey,
          opening_direction: "right",
          vertical_opening_direction: "up",
        },
      },
    };

    const energyCollection = getEnergyDataCollection(hass, {
      key: collectionKey,
    });
    if (!energyCollection.prefs) {
      await energyCollection.refresh();
    }
    const prefs = energyCollection.prefs;

    // No gas sources available
    if (!prefs || !hasGasSource(prefs)) {
      return view;
    }

    const section = view.sections![0] as LovelaceSectionConfig;

    section.cards!.push({
      type: "energy-compare",
      collection_key: collectionKey,
      grid_options: {
        columns: 36,
      },
    });

    if (isEnergyCardVisible("gas", "energy-gas-graph", prefs, hidden)) {
      section.cards!.push({
        title: hass.localize("ui.panel.energy.cards.energy_gas_graph_title"),
        type: "energy-gas-graph",
        collection_key: collectionKey,
        grid_options: {
          columns: 24,
        },
      });
    }

    if (isEnergyCardVisible("gas", "energy-sources-table", prefs, hidden)) {
      section.cards!.push({
        title: hass.localize(
          "ui.panel.energy.cards.energy_sources_table_title"
        ),
        type: "energy-sources-table",
        collection_key: collectionKey,
        types: ["gas"],
        grid_options: {
          columns: 12,
        },
      });
    }

    return view;
  }
}
