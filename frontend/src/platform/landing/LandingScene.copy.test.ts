import { describe, expect, test } from "bun:test";
import { sceneCopyForState } from "./LandingScene";

describe("landing scene state copy", () => {
  test("distinguishes the static poster from a mounted interactive view", () => {
    const poster = sceneCopyForState("oil", "poster");
    const mounted = sceneCopyForState("oil", "ready-3d");

    expect(poster.caption.includes("vista estática")).toBe(true);
    expect(poster.note.includes("póster")).toBe(true);
    expect(mounted.caption.includes("vista estática")).toBe(false);
    expect(mounted.caption.includes("vista 3D interactiva")).toBe(true);
    expect(mounted.note.includes("3D interactiva")).toBe(true);
    expect(mounted.caption.includes("static")).toBe(false);
    expect(mounted.note.includes("interactive")).toBe(false);
  });
});
