import { describe, expect, it } from "vitest";
import type {
  EnergyPreferences,
  EnergySource,
} from "../../../../src/data/energy";
import { DEFAULT_POWER_COLLECTION_KEY } from "../../../../src/data/energy";
import { PowerViewStrategy } from "../../../../src/panels/energy/strategies/power-view-strategy";
import type { HomeAssistant } from "../../../../src/types";

const source = (s: Partial<EnergySource> & { type: string }): EnergySource =>
  s as unknown as EnergySource;

const GRID_WITH_POWER_CONFIG = source({
  type: "grid",
  stat_energy_from: "sensor.grid_in",
  stat_energy_to: "sensor.grid_out",
  power_config: { stat_rate: "sensor.grid_power" },
});

const PREFS: EnergyPreferences = {
  energy_sources: [GRID_WITH_POWER_CONFIG],
  device_consumption: [],
  device_consumption_water: [],
};

/** A fake hass whose connection only has a collection under `_<connectionKey>`. */
const makeHass = (connectionKey: string): HomeAssistant =>
  ({
    localize: (key: string) => key,
    connection: {
      [`_${connectionKey}`]: {
        prefs: PREFS,
        refresh: () => Promise.resolve(),
      },
    },
  }) as unknown as HomeAssistant;

describe("PowerViewStrategy default collection key", () => {
  it("falls back to the power collection when none is configured", async () => {
    const view = await PowerViewStrategy.generate(
      { type: "power" },
      makeHass(DEFAULT_POWER_COLLECTION_KEY)
    );
    expect(view.badges?.[0]).toMatchObject({
      collection_key: DEFAULT_POWER_COLLECTION_KEY,
    });
  });

  it("still honours an explicit collection_key", async () => {
    const view = await PowerViewStrategy.generate(
      { type: "power", collection_key: "energy_custom" },
      makeHass("energy_custom")
    );
    expect(view.badges?.[0]).toMatchObject({
      collection_key: "energy_custom",
    });
  });
});
