import type { DeviceConsumptionEnergyPreference } from "../../../data/energy";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import type { EnergyCardSpec, EnergyViewPath } from "./energy-cards";
import { ENERGY_CARD_LABELS } from "./energy-cards";
import type { EnergyConditions } from "./energy-conditions";
import { shouldShowFloorsAndAreas } from "./show-floors-and-areas";

export interface EnergyCardOptions {
  /** Localize the card's global label into `title`. Defaults to `true`. */
  title?: boolean;
}

/**
 * Assembles the Lovelace card configs for a single energy view. A view
 * strategy creates one builder for its view and loops over its declarative
 * list of card specs (from energy-cards.ts), instead of repeating an
 * `if (isEnergyCardVisible(...)) { section.cards.push({ ... }) }` block per
 * card.
 */
export class EnergyCardBuilder {
  constructor(
    private readonly _hass: HomeAssistant,
    private readonly _conditions: EnergyConditions,
    private readonly _view: EnergyViewPath,
    private readonly _collectionKey: string,
    private readonly _hidden: string[] | undefined
  ) {}

  /** Whether `cardType` should currently be rendered in this view. */
  isVisible(cardType: string): boolean {
    return this._conditions.isVisible(this._view, cardType, this._hidden);
  }

  /**
   * Builds the config for `cardType`: `type` and `collection_key` are always
   * set, the title defaults to the card's global localized label (when one
   * exists), and `extra` is layered on top for card-specific options.
   */
  card(
    cardType: string,
    extra: Partial<LovelaceCardConfig> = {},
    options: EnergyCardOptions = {}
  ): LovelaceCardConfig {
    const labelKey = ENERGY_CARD_LABELS[cardType];
    const withTitle = options.title ?? true;
    return {
      type: cardType,
      collection_key: this._collectionKey,
      ...(withTitle && labelKey
        ? { title: this._hass.localize(labelKey) }
        : {}),
      ...extra,
    } as LovelaceCardConfig;
  }

  /**
   * Builds the card for `cardType` and appends it to `target` when visible.
   * Returns the card that was added, or `undefined` when it was skipped, so
   * callers can reuse the same config elsewhere (e.g. a small-screen
   * section mirroring the sidebar).
   */
  addTo(
    target: LovelaceCardConfig[],
    cardType: string,
    extra: Partial<LovelaceCardConfig> = {},
    options: EnergyCardOptions = {}
  ): LovelaceCardConfig | undefined {
    if (!this.isVisible(cardType)) {
      return undefined;
    }
    const cardConfig = this.card(cardType, extra, options);
    target.push(cardConfig);
    return cardConfig;
  }

  /**
   * Builds and appends every visible, non-dynamic spec's card to `target`,
   * in order. Cards marked `dynamic` are skipped - their owning strategy
   * builds them directly, since they need live per-request data (see
   * `sankeyExtra`).
   */
  addAll(target: LovelaceCardConfig[], specs: readonly EnergyCardSpec[]): void {
    for (const spec of specs) {
      if (spec.dynamic || !this.isVisible(spec.cardType)) continue;
      target.push(this.card(spec.cardType, spec.extra, { title: spec.title }));
    }
  }

  /**
   * The `group_by_floor`/`group_by_area`/`grid_options` extras shared by
   * every sankey card: whether to group by floor/area is derived from
   * whether `devices` actually span more than one area.
   */
  sankeyExtra(
    devices: DeviceConsumptionEnergyPreference[],
    getEntityId: (
      device: DeviceConsumptionEnergyPreference
    ) => string | undefined,
    columns: number
  ): Partial<LovelaceCardConfig> {
    const showFloorsAndAreas = shouldShowFloorsAndAreas(
      devices,
      this._hass,
      getEntityId
    );
    return {
      group_by_floor: showFloorsAndAreas,
      group_by_area: showFloorsAndAreas,
      grid_options: { columns },
    };
  }
}
