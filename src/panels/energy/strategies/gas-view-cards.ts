import { DEFAULT_ENERGY_COLLECTION_KEY } from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { EnergyCardSpec, EnergyViewStrategyConfig } from "./energy-cards";
import { EnergyCardBuilder } from "./energy-card-builder";
import { loadEnergyConditions } from "./energy-conditions";
import { createSingleSectionView } from "./energy-view-layout";

/** Cards appended to the single gas section, in order, when visible. */
export const GAS_CARDS: readonly EnergyCardSpec[] = [
  {
    cardType: "energy-gas-graph",
    isApplicable: (c) => c.hasGasSource,
    extra: { grid_options: { columns: 24 } },
  },
  {
    cardType: "energy-sources-table",
    isApplicable: (c) => c.hasGasSource,
    extra: { types: ["gas"], grid_options: { columns: 12 } },
  },
];

export const generateGasView = async (
  _config: EnergyViewStrategyConfig,
  hass: HomeAssistant
): Promise<LovelaceViewConfig> => {
  const collectionKey = _config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY;
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
};
