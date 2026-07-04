import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import { generatePowerView } from "./power-view-cards";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";

@customElement("power-view-strategy")
export class PowerViewStrategy extends ReactiveElement {
  static registryDependencies: readonly LovelaceStrategyDependency[] = [];

  static generate(
    _config: EnergyViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    return generatePowerView(_config, hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "power-view-strategy": PowerViewStrategy;
  }
}
