import { describe, expect, test } from "bun:test";
import { sceneCopyForState } from "./LandingScene";

describe("landing scene mounted-state copy", () => {
  test("keeps the poster label until a 3D scene is actually mounted", () => {
    const copy = sceneCopyForState("assembly", "ready-3d", false);

    expect(copy.caption).toContain("vista estática");
    expect(copy.note).toBe("Vista 3D no cargada; se muestra el póster estático.");
  });

  test("uses active copy after a 3D scene is mounted", () => {
    const copy = sceneCopyForState("assembly", "ready-3d", true);

    expect(copy.caption).toContain("vista 3D interactiva");
    expect(copy.note).toBe("Vista 3D interactiva activa.");
  });
});
