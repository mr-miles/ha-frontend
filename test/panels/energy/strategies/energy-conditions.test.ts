import { describe, expect, it } from "vitest";
import type {
  EnergyPreferences,
  EnergySource,
} from "../../../../src/data/energy";
import type { EnergyViewPath } from "../../../../src/panels/energy/strategies/energy-cards";
import {
  energyCardKey,
  getEnergyViewCards,
} from "../../../../src/panels/energy/strategies/energy-cards";
import { EnergyConditions } from "../../../../src/panels/energy/strategies/energy-conditions";

const source = (s: Partial<EnergySource> & { type: string }): EnergySource =>
  s as unknown as EnergySource;

const makePrefs = (
  prefs: Partial<EnergyPreferences> = {}
): EnergyPreferences => ({
  energy_sources: [],
  device_consumption: [],
  device_consumption_water: [],
  ...prefs,
});

const GRID_RETURN = source({
  type: "grid",
  stat_energy_from: "sensor.grid_in",
  stat_energy_to: "sensor.grid_out",
});
const SOLAR = source({ type: "solar", stat_energy_from: "sensor.solar" });
const GAS = source({ type: "gas", stat_energy_from: "sensor.gas" });
const WATER = source({ type: "water", stat_energy_from: "sensor.water" });
const GAS_RATE = source({
  type: "gas",
  stat_energy_from: "sensor.gas",
  stat_rate: "sensor.gas_rate",
});
const WATER_RATE = source({
  type: "water",
  stat_energy_from: "sensor.water",
  stat_rate: "sensor.water_rate",
});

describe("EnergyConditions predicates", () => {
  it("hasEnergySource matches grid/solar/battery sources only", () => {
    expect(
      new EnergyConditions(makePrefs({ energy_sources: [SOLAR] }))
        .hasEnergySource
    ).toBe(true);
    expect(
      new EnergyConditions(makePrefs({ energy_sources: [GRID_RETURN] }))
        .hasEnergySource
    ).toBe(true);
    expect(
      new EnergyConditions(makePrefs({ energy_sources: [GAS, WATER] }))
        .hasEnergySource
    ).toBe(false);
  });

  it("hasAnySource is true whenever any source is configured", () => {
    expect(new EnergyConditions(makePrefs()).hasAnySource).toBe(false);
    expect(
      new EnergyConditions(makePrefs({ energy_sources: [GAS] })).hasAnySource
    ).toBe(true);
  });

  it("hasWaterRateSource / hasGasRateSource require a rate statistic", () => {
    expect(
      new EnergyConditions(makePrefs({ energy_sources: [WATER] }))
        .hasWaterRateSource
    ).toBe(false);
    expect(
      new EnergyConditions(makePrefs({ energy_sources: [WATER_RATE] }))
        .hasWaterRateSource
    ).toBe(true);
    expect(
      new EnergyConditions(makePrefs({ energy_sources: [GAS] }))
        .hasGasRateSource
    ).toBe(false);
    expect(
      new EnergyConditions(makePrefs({ energy_sources: [GAS_RATE] }))
        .hasGasRateSource
    ).toBe(true);
  });
});

describe("EnergyConditions memoization", () => {
  it("evaluates a source-shape condition at most once", () => {
    let energySourcesReads = 0;
    const prefs = makePrefs();
    Object.defineProperty(prefs, "energy_sources", {
      get() {
        energySourcesReads++;
        return [GRID_RETURN];
      },
    });

    const conditions = new EnergyConditions(prefs);
    expect(conditions.hasGridSource).toBe(true);
    expect(conditions.hasGridSource).toBe(true);
    expect(conditions.hasGridSource).toBe(true);

    expect(energySourcesReads).toBe(1);
  });

  it("caches each condition independently", () => {
    let deviceConsumptionReads = 0;
    const prefs = makePrefs();
    Object.defineProperty(prefs, "device_consumption", {
      get() {
        deviceConsumptionReads++;
        return [{ stat_consumption: "sensor.device" }];
      },
    });

    const conditions = new EnergyConditions(prefs);
    // Reading an unrelated condition first must not warm this cache entry.
    expect(conditions.hasSolar).toBe(false);
    expect(deviceConsumptionReads).toBe(0);

    expect(conditions.hasDeviceConsumption).toBe(true);
    expect(conditions.hasDeviceConsumption).toBe(true);
    expect(deviceConsumptionReads).toBe(1);
  });
});

describe("EnergyConditions.isApplicable", () => {
  it("gates the solar graph and gauges on their sources", () => {
    expect(
      new EnergyConditions(makePrefs({ energy_sources: [SOLAR] })).isApplicable(
        "electricity",
        "energy-solar-graph"
      )
    ).toBe(true);
    expect(
      new EnergyConditions(
        makePrefs({ energy_sources: [GRID_RETURN] })
      ).isApplicable("electricity", "energy-solar-graph")
    ).toBe(false);

    // Needs grid export (return).
    expect(
      new EnergyConditions(
        makePrefs({ energy_sources: [GRID_RETURN] })
      ).isApplicable("electricity", "energy-grid-neutrality-gauge")
    ).toBe(true);
    expect(
      new EnergyConditions(makePrefs({ energy_sources: [SOLAR] })).isApplicable(
        "electricity",
        "energy-grid-neutrality-gauge"
      )
    ).toBe(false);
  });

  it("only lists cards relevant to the configured sources", () => {
    const gasOnly = new EnergyConditions(makePrefs({ energy_sources: [GAS] }));
    expect(gasOnly.applicableCardKeys("gas")).toEqual([
      "gas.energy-gas-graph",
      "gas.energy-sources-table",
    ]);
    // No electricity sources -> no electricity cards apply.
    expect(gasOnly.applicableCardKeys("electricity")).toEqual([]);
  });

  it("is false for a card type that is not in the catalog for the view", () => {
    const conditions = new EnergyConditions(
      makePrefs({ energy_sources: [SOLAR] })
    );
    expect(conditions.isApplicable("gas", "energy-solar-graph")).toBe(false);
  });
});

describe("EnergyConditions.isVisible", () => {
  it("is true when the card applies and is not hidden", () => {
    const conditions = new EnergyConditions(
      makePrefs({ energy_sources: [SOLAR] })
    );
    expect(
      conditions.isVisible("electricity", "energy-solar-graph", undefined)
    ).toBe(true);
  });

  it("is false when the card applies but is hidden", () => {
    const conditions = new EnergyConditions(
      makePrefs({ energy_sources: [SOLAR] })
    );
    expect(
      conditions.isVisible("electricity", "energy-solar-graph", [
        "electricity.energy-solar-graph",
      ])
    ).toBe(false);
  });

  it("is false when the card does not apply to the preferences", () => {
    const conditions = new EnergyConditions(
      makePrefs({ energy_sources: [GRID_RETURN] })
    );
    expect(
      conditions.isVisible("electricity", "energy-solar-graph", undefined)
    ).toBe(false);
  });

  it("equals isApplicable && !hidden for every catalog entry", () => {
    // A config that exercises every source type, so many cards apply.
    const conditions = new EnergyConditions(
      makePrefs({ energy_sources: [GRID_RETURN, SOLAR, GAS, WATER] })
    );
    const viewCards = getEnergyViewCards();
    for (const view of Object.keys(viewCards) as EnergyViewPath[]) {
      for (const spec of viewCards[view]) {
        expect(conditions.isVisible(view, spec.cardType, undefined)).toBe(
          conditions.isApplicable(view, spec.cardType)
        );
        // Hiding the card's own key always wins.
        const key = energyCardKey(view, spec.cardType);
        expect(conditions.isVisible(view, spec.cardType, [key])).toBe(false);
      }
    }
  });
});

describe("EnergyConditions.isViewEmpty", () => {
  const conditions = () =>
    new EnergyConditions(makePrefs({ energy_sources: [WATER] }));

  it("is false when no cards in the view are hidden", () => {
    expect(conditions().isViewEmpty("water", undefined)).toBe(false);
  });

  it("is false when only some applicable cards are hidden", () => {
    expect(
      conditions().isViewEmpty("water", ["water.energy-water-graph"])
    ).toBe(false);
  });

  it("is true when every applicable card is hidden", () => {
    expect(
      conditions().isViewEmpty("water", [
        "water.energy-water-graph",
        "water.energy-sources-table",
      ])
    ).toBe(true);
  });

  it("is false when the view has no applicable cards at all", () => {
    // Water source configured, but the gas view has nothing applicable.
    expect(conditions().isViewEmpty("gas", [])).toBe(false);
  });
});
