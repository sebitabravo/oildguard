import { describe, expect, it } from "bun:test";
import { shouldPollLive } from "./livePolling";

describe("shouldPollLive", () => {
  const eligible = {
    live: true,
    demoActive: false,
    hidden: false,
    inFlight: false,
  };

  it("polls only when live, visible, outside the demo, and idle", () => {
    expect(shouldPollLive(eligible)).toBe(true);
    expect(shouldPollLive({ ...eligible, live: false })).toBe(false);
    expect(shouldPollLive({ ...eligible, demoActive: true })).toBe(false);
    expect(shouldPollLive({ ...eligible, hidden: true })).toBe(false);
    expect(shouldPollLive({ ...eligible, inFlight: true })).toBe(false);
  });
});
