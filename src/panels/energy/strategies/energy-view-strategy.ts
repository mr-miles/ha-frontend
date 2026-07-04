import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import { generateElectricityView } from "./energy-view-cards";

@customElement("energy-view-strategy")
export class EnergyViewStrategy extends ReactiveElement {
  static registryDependencies: readonly LovelaceStrategyDependency[] = [];

  static generate(
    _config: EnergyViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    return generateElectricityView(_config, hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-view-strategy": EnergyViewStrategy;
  }
}
