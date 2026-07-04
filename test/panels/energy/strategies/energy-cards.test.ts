import { describe, expect, it } from "vitest";
// Imported before energy-cards.ts on purpose: this reproduces the import
// order that previously triggered a circular-import bug (see
// getEnergyViewCards in energy-cards.ts). gas-view-strategy.ts pulls in
// gas-view-cards.ts, which - before getEnergyViewCards was made lazy - could
// cause energy-cards.ts to read GAS_CARDS as undefined while building its
// then-eager ENERGY_VIEW_CARDS constant, depending on which strategy a
// consumer happened to import first.
import { GasViewStrategy } from "../../../../src/panels/energy/strategies/gas-view-strategy";
import {
  ENERGY_CARD_LABELS,
  energyCardKey,
  getEnergyViewCards,
  isEnergyCardHidden,
} from "../../../../src/panels/energy/strategies/energy-cards";

describe("energyCardKey", () => {
  it("joins the view path and card type", () => {
    expect(energyCardKey("electricity", "energy-solar-graph")).toBe(
      "electricity.energy-solar-graph"
    );
    expect(energyCardKey("now", "power-sankey")).toBe("now.power-sankey");
  });
});

describe("isEnergyCardHidden", () => {
  it("returns true only when the composite key is in the hidden list", () => {
    const hidden = ["electricity.energy-solar-graph"];
    expect(
      isEnergyCardHidden("electricity", "energy-solar-graph", hidden)
    ).toBe(true);
    // Same card type in a different view is independent.
    expect(isEnergyCardHidden("overview", "energy-solar-graph", hidden)).toBe(
      false
    );
    expect(
      isEnergyCardHidden("electricity", "energy-usage-graph", hidden)
    ).toBe(false);
  });

  it("treats undefined/empty hidden lists as nothing hidden", () => {
    expect(
      isEnergyCardHidden("electricity", "energy-solar-graph", undefined)
    ).toBe(false);
    expect(isEnergyCardHidden("electricity", "energy-solar-graph", [])).toBe(
      false
    );
  });
});

describe("ENERGY_CARD_LABELS", () => {
  it("is a global label independent of which view a card appears in", () => {
    expect(ENERGY_CARD_LABELS["energy-sources-table"]).toBe(
      "ui.panel.energy.cards.energy_sources_table_title"
    );
    expect(ENERGY_CARD_LABELS["energy-distribution"]).toBe(
      "ui.panel.energy.cards.energy_distribution_title"
    );
  });

  it("has a label for every card every view can render", () => {
    for (const specs of Object.values(getEnergyViewCards())) {
      for (const spec of specs) {
        expect(ENERGY_CARD_LABELS[spec.cardType]).toBeDefined();
      }
    }
  });
});

describe("getEnergyViewCards", () => {
  it("covers every energy view path", () => {
    expect(Object.keys(getEnergyViewCards()).sort()).toEqual(
      ["electricity", "gas", "now", "overview", "water"].sort()
    );
  });

  it("never repeats a cardType within a single view's list", () => {
    for (const [view, specs] of Object.entries(getEnergyViewCards())) {
      const cardTypes = specs.map((c) => c.cardType);
      expect(new Set(cardTypes).size, `duplicate cardType in ${view}`).toBe(
        cardTypes.length
      );
    }
  });

  it("only uses `slot` for the electricity view, and gives every one of its cards a slot", () => {
    for (const [view, specs] of Object.entries(getEnergyViewCards())) {
      if (view === "electricity") {
        expect(specs.every((c) => c.slot !== undefined)).toBe(true);
      } else {
        expect(specs.every((c) => c.slot === undefined)).toBe(true);
      }
    }
  });

  it("is fully populated for every view even when a view strategy module is imported first", () => {
    // Guards against the specific bug this file's import order reproduces:
    // every view's list must be non-empty, not just the ones a given test
    // run happens to import in a safe order.
    expect(GasViewStrategy).toBeDefined();
    for (const [view, specs] of Object.entries(getEnergyViewCards())) {
      expect(specs.length, `${view} card list is empty`).toBeGreaterThan(0);
    }
  });
});
