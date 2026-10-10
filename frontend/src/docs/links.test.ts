import { describe, expect, test } from "bun:test";
import { buildSlug, docRoute, docTitle, resolveDocLink, rewriteDocHtml } from "./links";

describe("buildSlug", () => {
  test("keeps the .md suffix and normalises separators", () => {
    expect(buildSlug("thesis-annex.md")).toBe("thesis-annex.md");
    expect(buildSlug("./bench/stress.md")).toBe("bench/stress.md");
    expect(buildSlug("bench\\stress.md")).toBe("bench/stress.md");
  });
});

describe("docRoute", () => {
  test("prefixes the docs route", () => {
    expect(docRoute("bench/stress.md")).toBe("/docs/bench/stress.md");
  });
});

describe("resolveDocLink", () => {
  test("resolves sibling and nested documents", () => {
    expect(resolveDocLink("calibration.md", "thesis-annex.md")).toEqual({
      kind: "doc",
      href: "/docs/calibration.md",
    });
    expect(resolveDocLink("bench/stress.md", "demo-script.md")).toEqual({
      kind: "doc",
      href: "/docs/bench/stress.md",
    });
  });

  test("resolves relative to the source document directory", () => {
    expect(resolveDocLink("precision.md", "bench/stress.md").href).toBe("/docs/bench/precision.md");
    expect(resolveDocLink("../calibration.md", "bench/stress.md").href).toBe("/docs/calibration.md");
    expect(resolveDocLink("./stress.md", "bench/README.md").href).toBe("/docs/bench/stress.md");
  });

  test("keeps the anchor", () => {
    expect(resolveDocLink("bench/stress.md#results", "demo-script.md").href).toBe(
      "/docs/bench/stress.md#results",
    );
  });

  test("marks links that leave the docs folder as repo references", () => {
    expect(resolveDocLink("../frontend/README.md", "demo-script.md")).toEqual({ kind: "repo" });
    expect(resolveDocLink("../../bench/precision/README.md", "bench/stress.md")).toEqual({ kind: "repo" });
  });

  test("marks non-markdown files in docs as repo references", () => {
    expect(resolveDocLink("bench/stress-baseline.json", "demo-script.md")).toEqual({ kind: "repo" });
  });

  test("passes anchors and external links through", () => {
    expect(resolveDocLink("#route-map", "demo-script.md")).toEqual({ kind: "anchor", href: "#route-map" });
    expect(resolveDocLink("https://docs.astro.build/", "demo-script.md")).toEqual({
      kind: "external",
      href: "https://docs.astro.build/",
    });
    expect(resolveDocLink("mailto:a@b.c", "demo-script.md").kind).toBe("external");
  });
});

describe("docTitle", () => {
  test("uses the first level-1 heading", () => {
    expect(docTitle("intro\n\n# Real title\n\n## Sub\n# Second", "x.md")).toBe("Real title");
  });

  test("skips a leading blockquote", () => {
    expect(docTitle("> Historical note\n\n# T3 — Oil\n", "t3.md")).toBe("T3 — Oil");
  });

  test("ignores headings inside code fences", () => {
    expect(docTitle("```sh\n# comment\n```\n# Title", "x.md")).toBe("Title");
  });

  test("falls back to the file name", () => {
    expect(docTitle("no heading here", "bench/README.md")).toBe("bench/README.md");
    expect(docTitle(undefined, "a.md")).toBe("a.md");
  });
});

describe("rewriteDocHtml", () => {
  test("rewrites doc links and keeps external ones", () => {
    const html = '<p><a href="bench/stress.md#r">stress</a> <a href="https://x.dev/">x</a></p>';
    expect(rewriteDocHtml(html, "demo-script.md")).toBe(
      '<p><a href="/docs/bench/stress.md#r">stress</a> <a href="https://x.dev/">x</a></p>',
    );
  });

  test("turns repo references into plain spans", () => {
    const html = '<a href="../frontend/README.md" title="t">frontend</a>';
    expect(rewriteDocHtml(html, "demo-script.md")).toBe(
      '<span class="docs-repo-ref" data-path="../frontend/README.md">frontend</span>',
    );
  });

  test("wraps tables for horizontal scrolling", () => {
    expect(rewriteDocHtml("<table><tr></tr></table>", "a.md")).toBe(
      '<div class="docs-table-wrap"><table><tr></tr></table></div>',
    );
  });

  test("leaves escaped markup inside code blocks alone", () => {
    const html = "<pre><code>&lt;table&gt;&lt;a href=&quot;x.md&quot;&gt;</code></pre>";
    expect(rewriteDocHtml(html, "a.md")).toBe(html);
  });
});
