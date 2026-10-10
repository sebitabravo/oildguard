export type DemoState = "nominal" | "N1" | "N2" | "N4" | "stale" | "link-down" | "out-of-service";
export interface DemoWheel { id: string; truckId: string; position: string; model: "GDY106" | "GDY108-C"; liters: number; state: DemoState; validated: boolean; }
export interface DemoTruck { id: string; model: "930E-4SE" | "980E-5"; state: DemoState; wheels: DemoWheel[]; }

function seeded(seed: number) { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }

export function createDemoDataset(seed = 930106): { trucks: DemoTruck[]; wheels: DemoWheel[] } {
  const random = seeded(seed);
  const states: DemoState[] = ["nominal", "N1", "N2", "N4", "stale", "link-down"];
  const trucks = Array.from({ length: 6 }, (_, truckIndex) => {
    const is980 = truckIndex === 5;
    const truckId = `OG-${String(truckIndex + 1).padStart(2, "0")}`;
    const wheels = Array.from({ length: 2 }, (_, wheelIndex) => ({
      id: `${truckId}-W${wheelIndex + 1}`,
      truckId, position: wheelIndex === 0 ? "front-left" : "front-right",
      model: is980 ? "GDY108-C" as const : "GDY106" as const,
      liters: Number((82 + random() * 11).toFixed(1)),
      state: (is980 ? "out-of-service" : states[(truckIndex + wheelIndex) % states.length]) as DemoState,
      validated: !is980,
    }));
    return { id: truckId, model: is980 ? "980E-5" as const : "930E-4SE" as const, state: wheels[0].state, wheels };
  });
  return { trucks, wheels: trucks.flatMap((truck) => truck.wheels) };
}

export const demoDataset = createDemoDataset();
