import type { DeviceConsumptionEnergyPreference } from "../../../data/energy";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import type { EnergyViewPath } from "./energy-cards";
import { energyCardEntry } from "./energy-cards";
import type { EnergyConditions } from "./energy-conditions";
import { shouldShowFloorsAndAreas } from "./show-floors-and-areas";

export interface EnergyCardOptions {
  /** Localize the catalog label into `title`. Defaults to `true`. */
  title?: boolean;
}

/**
 * A declarative row for `EnergyCardBuilder.addAll`. `extra` may be a plain
 * object, or a thunk for call sites whose extras need per-source computed
 * values (e.g. `sankeyExtra`) - the thunk only runs when the card is
 * actually visible.
 */
export interface EnergyCardSpec {
  cardType: string;
  extra?: Partial<LovelaceCardConfig> | (() => Partial<LovelaceCardConfig>);
  title?: boolean;
}

/**
 * Assembles the Lovelace card configs for a single energy view. A view
 * strategy creates one builder for its view and loops over a declarative
 * list of card specs, instead of repeating an
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
   * set, the title defaults to the catalog's localized label (when one
   * exists), and `extra` is layered on top for card-specific options.
   */
  card(
    cardType: string,
    extra: Partial<LovelaceCardConfig> = {},
    options: EnergyCardOptions = {}
  ): LovelaceCardConfig {
    const entry = energyCardEntry(this._view, cardType);
    const withTitle = options.title ?? true;
    return {
      type: cardType,
      collection_key: this._collectionKey,
      ...(withTitle && entry
        ? { title: this._hass.localize(entry.labelKey) }
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
   * Builds and appends every visible spec's card to `target`, in order. The
   * shared shape for a view's "loop over a declarative list of cards"
   * pattern, so strategies don't each write their own for-loop over
   * `addTo`.
   */
  addAll(target: LovelaceCardConfig[], specs: readonly EnergyCardSpec[]): void {
    for (const spec of specs) {
      if (!this.isVisible(spec.cardType)) continue;
      const extra =
        typeof spec.extra === "function" ? spec.extra() : spec.extra;
      target.push(this.card(spec.cardType, extra, { title: spec.title }));
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
