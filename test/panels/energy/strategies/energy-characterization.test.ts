// Characterization tests: run the refactored strategies and the pre-refactor
// originals (frozen under ./__legacy__, extracted from git history) against
// the same set of preference fixtures and assert byte-identical output. This
// is a regression net for the energy-cards/energy-conditions/energy-card-
// builder refactor - it doesn't assert anything about *correct* behaviour,
// only that behaviour did not change.
//
// The view-strategy config always pins an explicit `collection_key` below.
// That sidesteps one deliberate behaviour change: `PowerViewStrategy` now
// falls back to `DEFAULT_POWER_COLLECTION_KEY` (not the shared energy
// collection) when no `collection_key` is configured, unlike the legacy
// original - see power-view-strategy.test.ts for that specific behaviour.
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
import { LegacyEnergyOverviewViewStrategy } from "./__legacy__/energy-overview-view-strategy";
import { LegacyEnergyViewStrategy } from "./__legacy__/energy-view-strategy";
import { LegacyGasViewStrategy } from "./__legacy__/gas-view-strategy";
import { LegacyWaterViewStrategy } from "./__legacy__/water-view-strategy";
import { LegacyPowerViewStrategy } from "./__legacy__/power-view-strategy";
import { LegacyEnergyDashboardStrategy } from "./__legacy__/energy-dashboard-strategy";

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

const VIEW_STRATEGY_PAIRS: {
  name: string;
  legacy: { generate: (config: any, hass: HomeAssistant) => Promise<unknown> };
  current: {
    generate: (config: any, hass: HomeAssistant) => Promise<unknown>;
  };
}[] = [
  {
    name: "overview",
    legacy: LegacyEnergyOverviewViewStrategy,
    current: EnergyOverviewViewStrategy,
  },
  {
    name: "electricity",
    legacy: LegacyEnergyViewStrategy,
    current: EnergyViewStrategy,
  },
  { name: "gas", legacy: LegacyGasViewStrategy, current: GasViewStrategy },
  {
    name: "water",
    legacy: LegacyWaterViewStrategy,
    current: WaterViewStrategy,
  },
  {
    name: "power (now)",
    legacy: LegacyPowerViewStrategy,
    current: PowerViewStrategy,
  },
];

describe.each(VIEW_STRATEGY_PAIRS)(
  "$name view strategy matches the original",
  ({ legacy, current }) => {
    it.each(FIXTURES)("for: $name", async ({ prefs, hidden }) => {
      // Pinned explicitly so PowerViewStrategy's new own-default (see the
      // file header) doesn't make it diverge from the legacy original here.
      const config = {
        type: "energy-view",
        collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
        hidden_cards: hidden,
      };
      const legacyResult = await legacy.generate(config, makeHass(prefs));
      const currentResult = await current.generate(config, makeHass(prefs));
      expect(currentResult).toEqual(legacyResult);
    });
  }
);

/**
 * The dashboard intentionally no longer pins `collection_key` on each
 * generated view (see the comment on `defineView` in
 * energy-dashboard-strategy.ts): every view strategy now has its own
 * strategy-dependent default that already matches what the dashboard wants,
 * so it's left for each view strategy to resolve instead of being restated
 * here. Strips it from both sides before comparing against the legacy
 * original, which always pinned it explicitly.
 */
const stripCollectionKey = (config: {
  views: readonly Record<string, any>[];
}) => ({
  ...config,
  views: config.views.map((view) => {
    if (!view.strategy) return view;
    const { collection_key, ...rest } = view.strategy;
    return { ...view, strategy: rest };
  }),
});

describe("dashboard strategy matches the original", () => {
  it.each(FIXTURES)("for: $name", async ({ prefs, hidden }) => {
    const config = { type: "energy" as const, hidden_cards: hidden };
    const legacyResult = await LegacyEnergyDashboardStrategy.generate(
      config,
      makeHass(prefs)
    );
    const currentResult = await EnergyDashboardStrategy.generate(
      config,
      makeHass(prefs)
    );
    expect(stripCollectionKey(currentResult)).toEqual(
      stripCollectionKey(legacyResult)
    );
  });

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
