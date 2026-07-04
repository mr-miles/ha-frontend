import { describe, expect, it } from "vitest";
import type {
  EnergyPreferences,
  EnergySource,
} from "../../../../src/data/energy";
import type { LovelaceCardConfig } from "../../../../src/data/lovelace/config/card";
import { EnergyCardBuilder } from "../../../../src/panels/energy/strategies/energy-card-builder";
import { EnergyConditions } from "../../../../src/panels/energy/strategies/energy-conditions";
import type { HomeAssistant } from "../../../../src/types";

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

const makeHass = (): HomeAssistant =>
  ({
    localize: (key: string) => `localized:${key}`,
  }) as unknown as HomeAssistant;

const SOLAR = source({ type: "solar", stat_energy_from: "sensor.solar" });

describe("EnergyCardBuilder.isVisible", () => {
  it("delegates to EnergyConditions.isVisible for the builder's view", () => {
    const conditions = new EnergyConditions(
      makePrefs({ energy_sources: [SOLAR] })
    );
    const builder = new EnergyCardBuilder(
      makeHass(),
      conditions,
      "electricity",
      "energy",
      undefined
    );
    expect(builder.isVisible("energy-solar-graph")).toBe(true);
    expect(builder.isVisible("energy-gas-graph")).toBe(false);
  });

  it("respects the hidden-cards list passed at construction", () => {
    const conditions = new EnergyConditions(
      makePrefs({ energy_sources: [SOLAR] })
    );
    const builder = new EnergyCardBuilder(
      makeHass(),
      conditions,
      "electricity",
      "energy",
      ["electricity.energy-solar-graph"]
    );
    expect(builder.isVisible("energy-solar-graph")).toBe(false);
  });
});

describe("EnergyCardBuilder.card", () => {
  it("sets type and collection_key, and localizes the catalog title by default", () => {
    const conditions = new EnergyConditions(makePrefs());
    const builder = new EnergyCardBuilder(
      makeHass(),
      conditions,
      "electricity",
      "my-collection",
      undefined
    );
    expect(builder.card("energy-solar-graph")).toEqual({
      type: "energy-solar-graph",
      collection_key: "my-collection",
      title: "localized:ui.panel.energy.cards.energy_solar_graph_title",
    });
  });

  it("omits the title when the card has no catalog entry for this view", () => {
    const conditions = new EnergyConditions(makePrefs());
    const builder = new EnergyCardBuilder(
      makeHass(),
      conditions,
      "gas",
      "my-collection",
      undefined
    );
    expect(builder.card("energy-solar-graph")).toEqual({
      type: "energy-solar-graph",
      collection_key: "my-collection",
    });
  });

  it("suppresses the title when options.title is false", () => {
    const conditions = new EnergyConditions(makePrefs());
    const builder = new EnergyCardBuilder(
      makeHass(),
      conditions,
      "electricity",
      "my-collection",
      undefined
    );
    expect(builder.card("energy-solar-graph", {}, { title: false })).toEqual({
      type: "energy-solar-graph",
      collection_key: "my-collection",
    });
  });

  it("layers extra on top of, and able to override, the defaults", () => {
    const conditions = new EnergyConditions(makePrefs());
    const builder = new EnergyCardBuilder(
      makeHass(),
      conditions,
      "electricity",
      "my-collection",
      undefined
    );
    expect(
      builder.card("energy-solar-graph", {
        grid_options: { columns: 36 },
        title: "custom title",
      })
    ).toEqual({
      type: "energy-solar-graph",
      collection_key: "my-collection",
      title: "custom title",
      grid_options: { columns: 36 },
    });
  });
});

describe("EnergyCardBuilder.addTo", () => {
  it("appends the built card and returns it when visible", () => {
    const conditions = new EnergyConditions(
      makePrefs({ energy_sources: [SOLAR] })
    );
    const builder = new EnergyCardBuilder(
      makeHass(),
      conditions,
      "electricity",
      "energy",
      undefined
    );
    const target: LovelaceCardConfig[] = [];
    const added = builder.addTo(target, "energy-solar-graph");
    expect(added).toBeDefined();
    expect(target).toEqual([added]);
  });

  it("does not append anything and returns undefined when not visible", () => {
    const conditions = new EnergyConditions(makePrefs());
    const builder = new EnergyCardBuilder(
      makeHass(),
      conditions,
      "electricity",
      "energy",
      undefined
    );
    const target: LovelaceCardConfig[] = [];
    const added = builder.addTo(target, "energy-solar-graph");
    expect(added).toBeUndefined();
    expect(target).toEqual([]);
  });
});
