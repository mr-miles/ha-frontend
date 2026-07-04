import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import { generateGasView } from "./gas-view-cards";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";

@customElement("gas-view-strategy")
export class GasViewStrategy extends ReactiveElement {
  static registryDependencies: readonly LovelaceStrategyDependency[] = [];

  static generate(
    _config: EnergyViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    return generateGasView(_config, hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "gas-view-strategy": GasViewStrategy;
  }
}
