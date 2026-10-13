import { describe, expect, test } from "bun:test";
import { sceneCopyForState, sceneVisibleNoteForState } from "./LandingScene";

describe("active landing scene copy", () => {
  test("mentions the active 3D view once across caption and note", () => {
    const copy = sceneCopyForState("assembly", "ready-3d", true);
    const visibleNote = sceneVisibleNoteForState("ready-3d", copy.note);
    const combined = `${copy.caption} · ${visibleNote}`.toLocaleLowerCase();
    const matches = combined.match(/vista 3d interactiva/g) ?? [];

    expect(matches).toHaveLength(1);
    expect(copy.caption).toContain("vista 3D interactiva");
    expect(visibleNote.toLocaleLowerCase()).not.toContain("vista 3d interactiva");
  });
});
