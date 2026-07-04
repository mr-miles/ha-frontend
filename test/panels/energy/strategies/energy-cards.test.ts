import { describe, expect, it } from "vitest";
import {
  energyCardEntry,
  energyCardKey,
  ENERGY_CARD_CATALOG,
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

describe("ENERGY_CARD_CATALOG", () => {
  it("contains only plain data: no applicability logic", () => {
    for (const entry of ENERGY_CARD_CATALOG) {
      expect(entry).not.toHaveProperty("isApplicable");
      expect(typeof entry.key).toBe("string");
      expect(typeof entry.view).toBe("string");
      expect(typeof entry.cardType).toBe("string");
      expect(typeof entry.labelKey).toBe("string");
    }
  });

  it("derives every key from its own view and cardType", () => {
    for (const entry of ENERGY_CARD_CATALOG) {
      expect(entry.key).toBe(energyCardKey(entry.view, entry.cardType));
    }
  });

  it("has no duplicate keys", () => {
    const keys = ENERGY_CARD_CATALOG.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("energyCardEntry", () => {
  it("finds the catalog entry for a known (view, cardType) pair", () => {
    const entry = energyCardEntry("electricity", "energy-solar-graph");
    expect(entry?.key).toBe("electricity.energy-solar-graph");
    expect(entry?.labelKey).toBe(
      "ui.panel.energy.cards.energy_solar_graph_title"
    );
  });

  it("returns undefined for an unknown pair", () => {
    expect(energyCardEntry("gas", "energy-solar-graph")).toBeUndefined();
    expect(energyCardEntry("electricity", "not-a-card")).toBeUndefined();
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
