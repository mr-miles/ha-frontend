import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import type {
  LovelaceViewConfig,
  LovelaceViewFooterConfig,
} from "../../../data/lovelace/config/view";

/** The date-range footer shown on every per-domain energy view. */
export const energyDateSelectionFooter = (
  collectionKey: string
): LovelaceViewFooterConfig => ({
  card: {
    type: "energy-date-selection",
    collection_key: collectionKey,
    opening_direction: "right",
    vertical_opening_direction: "up",
  },
});

/**
 * The single-section view scaffold shared by the gas and water view
 * strategies: one full-width grid section under the standard footer. Returns
 * the section too, since callers push their cards into it right away.
 */
export const createSingleSectionView = (
  collectionKey: string
): { view: LovelaceViewConfig; section: LovelaceSectionConfig } => {
  const section: LovelaceSectionConfig = {
    type: "grid",
    cards: [],
    column_span: 3,
  };
  const view: LovelaceViewConfig = {
    type: "sections",
    max_columns: 3,
    sections: [section],
    footer: energyDateSelectionFooter(collectionKey),
  };
  return { view, section };
};
