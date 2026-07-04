import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import { GAS_CARDS } from "./energy-cards";
import { EnergyCardBuilder } from "./energy-card-builder";
import { loadEnergyConditions } from "./energy-conditions";
import { createSingleSectionView } from "./energy-view-layout";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";

@customElement("gas-view-strategy")
export class GasViewStrategy extends ReactiveElement {
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

    // No gas sources available
    if (!conditions || !conditions.hasGasSource) {
      return view;
    }

    const builder = new EnergyCardBuilder(
      hass,
      conditions,
      "gas",
      collectionKey,
      hidden
    );

    section.cards!.push(
      builder.card("energy-compare", { grid_options: { columns: 36 } })
    );

    builder.addAll(section.cards!, GAS_CARDS);

    return view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "gas-view-strategy": GasViewStrategy;
  }
}
