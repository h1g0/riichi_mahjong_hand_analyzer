import { describe, expect, it } from "vitest";
import { parseTiles } from "../tiles";
import { shantenAll } from "../shanten";

describe("shanten", () => {
  it("detects complete standard hand", () => {
    const counts = parseTiles("123m123p123s111z22z");
    const result = shantenAll(counts, 0);
    expect(result.min).toBe(-1);
  });

  it("detects chiitoi one-away", () => {
    const counts = parseTiles("11m22m33p44p55s6s7s8z");
    const result = shantenAll(counts, 0);
    expect(result.chiitoi).toBe(1);
  });

  it("detects kokushi tenpai", () => {
    const counts = parseTiles("19m19p19s1234567z");
    const result = shantenAll(counts, 0);
    expect(result.kokushi).toBe(0);
  });
});
