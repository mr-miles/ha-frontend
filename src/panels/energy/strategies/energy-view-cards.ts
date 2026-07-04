import { DEFAULT_ENERGY_COLLECTION_KEY } from "../../../data/energy";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { EnergyCardSpec, EnergyViewStrategyConfig } from "./energy-cards";
import { EnergyCardBuilder } from "./energy-card-builder";
import { loadEnergyConditions } from "./energy-conditions";
import { energyDateSelectionFooter } from "./energy-view-layout";
import {
  LARGE_SCREEN_CONDITION,
  SMALL_SCREEN_CONDITION,
} from "../../lovelace/strategies/helpers/view-columns-conditions";

/** Electricity view cards, in order, when visible. */
export const ELECTRICITY_CARDS: readonly EnergyCardSpec[] = [
  {
    cardType: "energy-distribution",
    isApplicable: (c) => c.hasGridSource || c.hasBattery || c.hasSolar,
    slot: "sidebar",
  },
  // Only included if we have both grid import and export configured.
  {
    cardType: "energy-grid-balance",
    isApplicable: (c) => c.hasGridSource && c.hasReturn,
    title: false,
    slot: "sidebar",
  },
  // Only included if we have a grid source & return.
  {
    cardType: "energy-grid-neutrality-gauge",
    isApplicable: (c) => c.hasReturn,
    title: false,
    slot: "gauge",
  },
  // Only included if we have a solar source & return.
  {
    cardType: "energy-solar-consumed-gauge",
    isApplicable: (c) => c.hasSolar && c.hasReturn,
    title: false,
    slot: "gauge",
  },
  // Only included if we have a solar source & grid.
  {
    cardType: "energy-self-sufficiency-gauge",
    isApplicable: (c) => c.hasSolar && c.hasGridSource,
    title: false,
    slot: "gauge",
  },
  // Only included if we have a grid.
  {
    cardType: "energy-carbon-consumed-gauge",
    isApplicable: (c) => c.hasGridSource,
    title: false,
    slot: "gauge",
  },
  {
    cardType: "energy-usage-graph",
    isApplicable: (c) => c.hasGridSource || c.hasBattery,
    extra: { grid_options: { columns: 36 } },
    slot: "main",
  },
  {
    cardType: "energy-solar-graph",
    isApplicable: (c) => c.hasSolar,
    extra: { grid_options: { columns: 36 } },
    slot: "main",
  },
  {
    cardType: "energy-sources-table",
    isApplicable: (c) => c.hasGridSource || c.hasSolar || c.hasBattery,
    extra: {
      types: ["grid", "solar", "battery"],
      grid_options: { columns: 36 },
    },
    slot: "main",
  },
  // Device cards: each only included if we have at least 1 device configured.
  {
    cardType: "energy-devices-detail-graph",
    isApplicable: (c) => c.hasDeviceConsumption,
    extra: { grid_options: { columns: 36 } },
    slot: "main",
  },
  {
    cardType: "energy-devices-graph",
    isApplicable: (c) => c.hasDeviceConsumption,
    extra: { grid_options: { columns: 36 } },
    slot: "main",
  },
  {
    cardType: "energy-sankey",
    isApplicable: (c) => c.hasDeviceConsumption,
    dynamic: true,
    slot: "main",
  },
];

export const generateElectricityView = async (
  _config: EnergyViewStrategyConfig,
  hass: HomeAssistant
): Promise<LovelaceViewConfig> => {
  const collectionKey = _config.collection_key || DEFAULT_ENERGY_COLLECTION_KEY;
  const hidden = _config.hidden_cards;

  const view: LovelaceViewConfig = {
    type: "sections",
    sections: [],
    sidebar: {
      sections: [{ cards: [] }],
      visibility: [LARGE_SCREEN_CONDITION],
    },
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
    "electricity",
    collectionKey,
    hidden
  );

  const mainCards: LovelaceCardConfig[] = [];
  const gaugeCards: LovelaceCardConfig[] = [];
  const sidebarSection = view.sidebar!.sections![0];

  for (const spec of ELECTRICITY_CARDS) {
    if (spec.slot !== "sidebar" || !builder.isVisible(spec.cardType)) {
      continue;
    }
    const cardConfig = builder.card(spec.cardType, spec.extra, {
      title: spec.title,
    });
    sidebarSection.cards!.push(cardConfig);
    view.sections!.push({
      type: "grid",
      column_span: 1,
      cards: [cardConfig],
      visibility: [SMALL_SCREEN_CONDITION],
    });
  }

  builder.addAll(
    gaugeCards,
    ELECTRICITY_CARDS.filter((c) => c.slot === "gauge")
  );

  if (gaugeCards.length) {
    sidebarSection.cards!.push({
      type: "grid",
      columns: gaugeCards.length === 1 ? 1 : 2,
      cards: gaugeCards,
    });
    view.sections!.push({
      type: "grid",
      column_span: 1,
      visibility: [SMALL_SCREEN_CONDITION],
      cards:
        gaugeCards.length === 1
          ? [gaugeCards[0]]
          : gaugeCards.map((card) => ({
              ...card,
              grid_options: { columns: 6 },
            })),
    });
  }

  mainCards.push(
    builder.card("energy-compare", { grid_options: { columns: 36 } })
  );

  builder.addAll(
    mainCards,
    ELECTRICITY_CARDS.filter((c) => c.slot === "main")
  );

  if (builder.isVisible("energy-sankey")) {
    mainCards.push(
      builder.card(
        "energy-sankey",
        builder.sankeyExtra(
          conditions.preferences.device_consumption,
          (d) => d.stat_consumption,
          36
        )
      )
    );
  }

  view.sections!.push({
    type: "grid",
    column_span: 3,
    cards: mainCards,
  });

  return view;
};
