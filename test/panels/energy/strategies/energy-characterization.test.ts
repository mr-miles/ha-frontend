/**
 * Characterization tests pinning the exact current output of the energy
 * dashboard's view/strategy generators, across a wide range of preference
 * fixtures. These exist as a regression net for changes to the
 * energy-cards/energy-conditions/energy-card-builder catalog and the
 * strategies that consume it - a refactor should leave every snapshot here
 * unchanged.
 *
 * Do NOT update these snapshots to make a refactor "pass"; an output change
 * is a behaviour change and must be escalated instead.
 */
import { describe, expect, it } from "vitest";
import type {
  DeviceConsumptionEnergyPreference,
  EnergyPreferences,
  EnergySource,
} from "../../../../src/data/energy";
import { DEFAULT_ENERGY_COLLECTION_KEY } from "../../../../src/data/energy";
import type { HomeAssistant } from "../../../../src/types";
import { EnergyOverviewViewStrategy } from "../../../../src/panels/energy/strategies/energy-overview-view-strategy";
import { EnergyViewStrategy } from "../../../../src/panels/energy/strategies/energy-view-strategy";
import { GasViewStrategy } from "../../../../src/panels/energy/strategies/gas-view-strategy";
import { WaterViewStrategy } from "../../../../src/panels/energy/strategies/water-view-strategy";
import { PowerViewStrategy } from "../../../../src/panels/energy/strategies/power-view-strategy";
import { EnergyDashboardStrategy } from "../../../../src/panels/energy/strategies/energy-dashboard-strategy";

const source = (s: Partial<EnergySource> & { type: string }): EnergySource =>
  s as unknown as EnergySource;

const device = (
  d: Partial<DeviceConsumptionEnergyPreference> & { stat_consumption: string }
): DeviceConsumptionEnergyPreference => d;

const makePrefs = (
  prefs: Partial<EnergyPreferences> = {}
): EnergyPreferences => ({
  energy_sources: [],
  device_consumption: [],
  device_consumption_water: [],
  ...prefs,
});

/** A fake energy collection, keyed the same way for every collection key the
 * strategies might ask for, so `getEnergyDataCollection` short-circuits
 * straight to it without touching the websocket connection. */
const makeHass = (prefs: EnergyPreferences | undefined): HomeAssistant => {
  const collection = {
    prefs,
    refresh: () => Promise.resolve(),
    subscribe: (cb: (data: { prefs?: EnergyPreferences }) => void) => {
      // Real collections notify subscribers asynchronously; calling back
      // synchronously here would run before `unsub` is assigned in
      // `fetchEnergyPrefs`'s `const unsub = collection.subscribe(...)`.
      queueMicrotask(() => cb({ prefs }));
      return () => undefined;
    },
  };
  return {
    localize: (key: string) => key,
    connection: {
      _energy_dashboard: collection,
      _energy_dashboard_now: collection,
    },
  } as unknown as HomeAssistant;
};

const GRID_IMPORT_ONLY = source({
  type: "grid",
  stat_energy_from: "sensor.grid_in",
  stat_energy_to: null,
});
const GRID_RETURN = source({
  type: "grid",
  stat_energy_from: "sensor.grid_in",
  stat_energy_to: "sensor.grid_out",
});
const GRID_WITH_POWER_CONFIG = source({
  type: "grid",
  stat_energy_from: "sensor.grid_in",
  stat_energy_to: "sensor.grid_out",
  power_config: { stat_rate: "sensor.grid_power" },
});
const GRID_POWER_ONLY = source({
  type: "grid",
  stat_energy_from: null,
  stat_energy_to: null,
  stat_rate: "sensor.grid_power",
});
const SOLAR = source({ type: "solar", stat_energy_from: "sensor.solar" });
const SOLAR_RATE = source({
  type: "solar",
  stat_energy_from: "sensor.solar",
  stat_rate: "sensor.solar_power",
});
const BATTERY = source({
  type: "battery",
  stat_energy_from: "sensor.battery_out",
  stat_energy_to: "sensor.battery_in",
});
const BATTERY_WITH_SOC = source({
  type: "battery",
  stat_energy_from: "sensor.battery_out",
  stat_energy_to: "sensor.battery_in",
  stat_rate: "sensor.battery_power",
  stat_soc: "sensor.battery_soc",
});
const GAS = source({ type: "gas", stat_energy_from: "sensor.gas" });
const GAS_RATE = source({
  type: "gas",
  stat_energy_from: "sensor.gas",
  stat_rate: "sensor.gas_rate",
});
const WATER = source({ type: "water", stat_energy_from: "sensor.water" });
const WATER_RATE = source({
  type: "water",
  stat_energy_from: "sensor.water",
  stat_rate: "sensor.water_rate",
});

const DEVICE_PLAIN = device({ stat_consumption: "sensor.device_1" });
const DEVICE_WITH_RATE = device({
  stat_consumption: "sensor.device_2",
  stat_rate: "sensor.device_2_power",
});
const WATER_DEVICE_PLAIN = device({
  stat_consumption: "sensor.water_device_1",
});
const WATER_DEVICE_WITH_RATE = device({
  stat_consumption: "sensor.water_device_2",
  stat_rate: "sensor.water_device_2_rate",
});

interface Fixture {
  name: string;
  prefs: EnergyPreferences | undefined;
  hidden?: string[];
}

const FIXTURES: Fixture[] = [
  { name: "no preferences at all", prefs: undefined },
  { name: "empty preferences", prefs: makePrefs() },
  {
    name: "grid import only",
    prefs: makePrefs({ energy_sources: [GRID_IMPORT_ONLY] }),
  },
  {
    name: "grid with return",
    prefs: makePrefs({ energy_sources: [GRID_RETURN] }),
  },
  {
    name: "grid + solar, no return",
    prefs: makePrefs({ energy_sources: [GRID_IMPORT_ONLY, SOLAR] }),
  },
  {
    name: "grid + solar + return",
    prefs: makePrefs({ energy_sources: [GRID_RETURN, SOLAR] }),
  },
  {
    name: "grid + solar + battery + return",
    prefs: makePrefs({ energy_sources: [GRID_RETURN, SOLAR, BATTERY] }),
  },
  { name: "solar only", prefs: makePrefs({ energy_sources: [SOLAR] }) },
  { name: "battery only", prefs: makePrefs({ energy_sources: [BATTERY] }) },
  { name: "gas only", prefs: makePrefs({ energy_sources: [GAS] }) },
  { name: "gas with rate", prefs: makePrefs({ energy_sources: [GAS_RATE] }) },
  { name: "water source only", prefs: makePrefs({ energy_sources: [WATER] }) },
  {
    name: "water source with rate",
    prefs: makePrefs({ energy_sources: [WATER_RATE] }),
  },
  {
    name: "water devices only, no water source",
    prefs: makePrefs({ device_consumption_water: [WATER_DEVICE_PLAIN] }),
  },
  {
    name: "water devices with rate, no water source",
    prefs: makePrefs({
      device_consumption_water: [WATER_DEVICE_PLAIN, WATER_DEVICE_WITH_RATE],
    }),
  },
  {
    name: "device consumption only, no energy sources",
    prefs: makePrefs({ device_consumption: [DEVICE_PLAIN] }),
  },
  {
    name: "device consumption with a live rate",
    prefs: makePrefs({
      device_consumption: [DEVICE_PLAIN, DEVICE_WITH_RATE],
    }),
  },
  {
    name: "grid power-only (no import/export meters)",
    prefs: makePrefs({ energy_sources: [GRID_POWER_ONLY] }),
  },
  {
    name: "grid with power_config",
    prefs: makePrefs({ energy_sources: [GRID_WITH_POWER_CONFIG] }),
  },
  {
    name: "solar with a live rate",
    prefs: makePrefs({ energy_sources: [SOLAR_RATE] }),
  },
  {
    name: "battery with SoC and rate",
    prefs: makePrefs({ energy_sources: [BATTERY_WITH_SOC] }),
  },
  {
    name: "gas + water (multi-domain, no electricity)",
    prefs: makePrefs({ energy_sources: [GAS, WATER] }),
  },
  {
    name: "kitchen sink: every source, every device shape",
    prefs: makePrefs({
      energy_sources: [
        GRID_RETURN,
        SOLAR_RATE,
        BATTERY_WITH_SOC,
        GAS_RATE,
        WATER_RATE,
      ],
      device_consumption: [DEVICE_PLAIN, DEVICE_WITH_RATE],
      device_consumption_water: [WATER_DEVICE_PLAIN, WATER_DEVICE_WITH_RATE],
    }),
  },
  {
    name: "kitchen sink with some cards hidden",
    prefs: makePrefs({
      energy_sources: [
        GRID_RETURN,
        SOLAR_RATE,
        BATTERY_WITH_SOC,
        GAS_RATE,
        WATER_RATE,
      ],
      device_consumption: [DEVICE_PLAIN, DEVICE_WITH_RATE],
      device_consumption_water: [WATER_DEVICE_PLAIN, WATER_DEVICE_WITH_RATE],
    }),
    hidden: [
      "electricity.energy-solar-graph",
      "overview.energy-gas-graph",
      "water.water-sankey",
      "now.power-sankey",
    ],
  },
  {
    name: "gas-only dashboard with every gas card hidden",
    prefs: makePrefs({ energy_sources: [GAS] }),
    hidden: ["gas.energy-gas-graph", "gas.energy-sources-table"],
  },
];

const VIEW_STRATEGIES: {
  name: string;
  strategy: {
    generate: (config: any, hass: HomeAssistant) => Promise<unknown>;
  };
}[] = [
  { name: "overview", strategy: EnergyOverviewViewStrategy },
  { name: "electricity", strategy: EnergyViewStrategy },
  { name: "gas", strategy: GasViewStrategy },
  { name: "water", strategy: WaterViewStrategy },
  { name: "power (now)", strategy: PowerViewStrategy },
];

describe.each(VIEW_STRATEGIES)("$name view strategy output", ({ strategy }) => {
  it.each(FIXTURES)(
    "matches snapshot for: $name",
    async ({ prefs, hidden }) => {
      // Pinned explicitly: PowerViewStrategy defaults its own collection key
      // when unspecified (see power-view-strategy.test.ts), which would
      // otherwise make its snapshot depend on that default rather than on the
      // card-building logic these tests target.
      const config = {
        type: "energy-view",
        collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
        hidden_cards: hidden,
      };
      const result = await strategy.generate(config, makeHass(prefs));
      expect(result).toMatchSnapshot();
    }
  );
});

describe("dashboard strategy output", () => {
  it.each(FIXTURES)(
    "matches snapshot for: $name",
    async ({ prefs, hidden }) => {
      const config = { type: "energy" as const, hidden_cards: hidden };
      const result = await EnergyDashboardStrategy.generate(
        config,
        makeHass(prefs)
      );
      expect(result).toMatchSnapshot();
    }
  );

  it("omits collection_key from generated views, deferring to each view strategy's own default", async () => {
    const result: { views: Record<string, any>[] } =
      (await EnergyDashboardStrategy.generate(
        { type: "energy" },
        makeHass(makePrefs({ energy_sources: [GAS, WATER] }))
      )) as any;
    const strategyViews = result.views.filter((view) => view.strategy);
    expect(strategyViews.length).toBeGreaterThan(0);
    for (const view of strategyViews) {
      expect(view.strategy).not.toHaveProperty("collection_key");
    }
  });
});
