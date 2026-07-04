import { describe, expect, it } from "vitest";
import type {
  EnergyPreferences,
  EnergySource,
} from "../../../../src/data/energy";
import { selectEnergyDashboardViews } from "../../../../src/panels/energy/strategies/energy-dashboard-strategy";
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

const GAS = source({ type: "gas", stat_energy_from: "sensor.gas" });
const WATER = source({ type: "water", stat_energy_from: "sensor.water" });
// A grid source with a live rate but no import/export meters: contributes to
// hasEnergySource/hasPowerSources without ever satisfying hasGridSource.
const GRID_POWER_ONLY = source({
  type: "grid",
  stat_energy_from: null,
  stat_energy_to: null,
  stat_rate: "sensor.grid_power",
});

const paths = (
  views: ReturnType<typeof selectEnergyDashboardViews>
): string[] => views.map((v) => v.path as string);

describe("selectEnergyDashboardViews", () => {
  it("offers no views when nothing is configured", () => {
    const conditions = new EnergyConditions(makePrefs());
    expect(selectEnergyDashboardViews(conditions, undefined)).toEqual([]);
  });

  it("offers a single view without an overview when only one domain applies", () => {
    const conditions = new EnergyConditions(
      makePrefs({ energy_sources: [GAS] })
    );
    expect(paths(selectEnergyDashboardViews(conditions, undefined))).toEqual([
      "gas",
    ]);
  });

  it("adds the overview once more than one domain applies", () => {
    const conditions = new EnergyConditions(
      makePrefs({ energy_sources: [GAS, WATER] })
    );
    expect(paths(selectEnergyDashboardViews(conditions, undefined))).toEqual([
      "overview",
      "gas",
      "water",
    ]);
  });

  it("shows the electricity view for devices even without an energy source, but no overview", () => {
    const conditions = new EnergyConditions(
      makePrefs({
        device_consumption: [{ stat_consumption: "sensor.device" }],
      })
    );
    // hasEnergySource (grid/solar/battery) is false here, so even though the
    // electricity view shows (device consumption alone is enough), it does
    // not count toward the overview's multi-domain threshold.
    expect(paths(selectEnergyDashboardViews(conditions, undefined))).toEqual([
      "electricity",
    ]);
  });

  it("adds the overview for a single domain when a live power source exists", () => {
    const conditions = new EnergyConditions(
      makePrefs({ energy_sources: [GRID_POWER_ONLY] })
    );
    expect(paths(selectEnergyDashboardViews(conditions, undefined))).toEqual([
      "overview",
      "electricity",
      "now",
    ]);
  });

  it("drops a view whose every applicable card is hidden", () => {
    const conditions = new EnergyConditions(
      makePrefs({ energy_sources: [GAS, WATER] })
    );
    const hidden = ["gas.energy-gas-graph", "gas.energy-sources-table"];
    expect(paths(selectEnergyDashboardViews(conditions, hidden))).toEqual([
      "overview",
      "water",
    ]);
  });

  it("keeps every candidate view when hiding cards would drop them all", () => {
    const conditions = new EnergyConditions(
      makePrefs({ energy_sources: [GAS] })
    );
    const hidden = ["gas.energy-gas-graph", "gas.energy-sources-table"];
    // Only candidate is "gas" and it would be empty; fall back to showing it
    // anyway so the dashboard never renders blank.
    expect(paths(selectEnergyDashboardViews(conditions, hidden))).toEqual([
      "gas",
    ]);
  });
});
