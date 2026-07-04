import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { LovelaceStrategyDependency } from "../../lovelace/strategies/types";
import type { EnergyViewStrategyConfig } from "./energy-cards";
import { generateOverviewView } from "./energy-overview-view-cards";

@customElement("energy-overview-view-strategy")
export class EnergyOverviewViewStrategy extends ReactiveElement {
  static registryDependencies: readonly LovelaceStrategyDependency[] = [];

  static generate(
    _config: EnergyViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    return generateOverviewView(_config, hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "energy-overview-view-strategy": EnergyOverviewViewStrategy;
  }
}
