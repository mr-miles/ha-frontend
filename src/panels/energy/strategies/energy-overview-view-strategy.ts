import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import { OVERVIEW_CARDS } from "./energy-cards";
import { EnergyCardBuilder } from "./energy-card-builder";
import { loadEnergyConditions } from "./energy-conditions";
import { energyDateSelectionFooter } from "./energy-view-layout";

@customElement("energy-overview-view-strategy")
export class EnergyOverviewViewStrategy extends ReactiveElement {
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
      dense_section_placement: true,
      max_columns: 3,
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
      "overview",
      collectionKey,
      hidden
    );

    for (const spec of OVERVIEW_CARDS) {
      if (spec.dynamic || !builder.isVisible(spec.cardType)) continue;
      view.sections!.push({
        type: "grid",
        cards: [builder.card(spec.cardType, spec.extra)],
      });
    }

    // One toggle gates the row: render energy-water-graph when there's a
    // water source, otherwise fall back to water-sankey for water devices.
    if (builder.isVisible("energy-water-graph")) {
      const waterCard = conditions.hasWaterSource
        ? builder.card("energy-water-graph")
        : builder.card("water-sankey");
      view.sections!.push({ type: "grid", cards: [waterCard] });
    }

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-overview-view-strategy": EnergyOverviewViewStrategy;
  }
}
