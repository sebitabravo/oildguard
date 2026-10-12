import { describe, expect, test } from "bun:test";
import { $, $$ } from "./dom-selector";

function element(name: string): Element {
  return { name } as unknown as Element;
}

function rootWith(matches: Element[]): ParentNode {
  return {
    querySelector: () => matches[0] ?? null,
    querySelectorAll: () => matches as unknown as NodeListOf<Element>,
  } as unknown as ParentNode;
}

describe("DOM selector helpers", () => {
  test("returns the first match or null", () => {
    const first = element("first");
    const second = element("second");

    expect($(".item", rootWith([first, second]))).toBe(first);
    expect($(".item", rootWith([]))).toBeNull();
  });

  test("returns all matches in document order as a real array", () => {
    const matches = [element("first"), element("second")];
    const result = $$(".item", rootWith(matches));

    expect(result).toEqual(matches);
    expect(Array.isArray(result)).toBe(true);
  });

  test("scopes queries to the provided root", () => {
    const outerMatch = element("outer");
    const scopedMatch = element("scoped");
    const root = rootWith([scopedMatch]);

    expect($(".item", root)).toBe(scopedMatch);
    expect($$(".item", root)).toEqual([scopedMatch]);
    expect($(".item", rootWith([outerMatch]))).toBe(outerMatch);
  });

  test("returns an empty array when there are no matches", () => {
    expect($$(".missing", rootWith([]))).toEqual([]);
  });

  test("does not swallow invalid selector errors", () => {
    const invalidRoot = {
      querySelector: () => { throw new SyntaxError("Invalid selector"); },
      querySelectorAll: () => { throw new SyntaxError("Invalid selector"); },
    } as unknown as ParentNode;

    expect(() => $("[", invalidRoot)).toThrow(SyntaxError);
    expect(() => $$("[", invalidRoot)).toThrow(SyntaxError);
  });
});
