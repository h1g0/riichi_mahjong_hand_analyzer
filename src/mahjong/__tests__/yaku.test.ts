import { describe, expect, it } from "vitest";
import { parseSingleTile, parseTiles } from "../tiles";
import { evaluateYaku } from "../yaku";

const evaluate = (counts: number[], overrides: Partial<Parameters<typeof evaluateYaku>[0]> = {}) =>
  evaluateYaku({
    counts,
    melds: [],
    winTile: null,
    seatWind: "east",
    roundWind: "east",
    allowChiitoiWithQuads: false,
    allowOpenTanyao: true,
    applyKuisagari: true,
    allowIppatsuUra: true,
    redDoraEnabled: true,
    redDoraCount: 0,
    doraIndicators: [],
    uraIndicators: [],
    doubleYakumanRule: "single",
    paoEnabled: false,
    tsumoFu2: true,
    roundTo10Fu: true,
    pinfuTsumo20: true,
    kuipinfu30: true,
    kiriageMangan: true,
    isTsumo: false,
    isRiichi: false,
    isDoubleRiichi: false,
    isIppatsu: false,
    isRinshan: false,
    isHaitei: false,
    isHoutei: false,
    isChankan: false,
    isTenhou: false,
    isChiihou: false,
    ...overrides,
  });

describe("yaku evaluation", () => {
  it("finds tanyao", () => {
    const counts = parseTiles("234m345m456p678p22s");
    const result = evaluate(counts);
    const names = result.yaku.map((y) => y.name);
    expect(names).toContain("Tanyao");
    expect(result.totalHan).toBe(1);
    expect(result.fuRounded).toBe(30);
    expect(result.score?.limit).toBe(null);
    expect(result.score?.ron).toBe(1500);
  });

  it("detects chiitoitsu", () => {
    const counts = parseTiles("11m22m33p44p55s66s77z");
    const result = evaluate(counts);
    const names = result.yaku.map((y) => y.name);
    expect(names).toContain("Chiitoitsu");
    expect(result.totalHan).toBe(2);
    expect(result.fuRounded).toBe(25);
    expect(result.score?.limit).toBe(null);
    expect(result.score?.ron).toBe(2400);
  });

  it("rejects chiitoitsu with quads by default", () => {
    const counts = parseTiles("11223344446677m");
    const result = evaluate(counts);
    const names = result.yaku.map((y) => y.name);
    expect(names).not.toContain("Chiitoitsu");
    expect(result.isAgari).toBe(false);
    expect((result as { totalHan?: number }).totalHan).toBeUndefined();
    expect((result as { fuRounded?: number }).fuRounded).toBeUndefined();
    expect((result as { score?: unknown }).score).toBeUndefined();
  });

  it("allows chiitoitsu with quads when enabled", () => {
    const counts = parseTiles("11223344446677m");
    const result = evaluate(counts, { allowChiitoiWithQuads: true });
    const names = result.yaku.map((y) => y.name);
    expect(names).toContain("Chiitoitsu");
    expect(result.totalHan).toBe(8);
    expect(result.fuRounded).toBe(25);
    expect(result.score?.limit).toBe("baiman");
    expect(result.score?.ron).toBe(24000);
  });

  it("detects daisangen", () => {
    const counts = parseTiles("123m11m555666777z");
    const result = evaluate(counts);
    const names = result.yakuman.map((y) => y.name);
    expect(names).toContain("Daisangen");
    expect(result.totalHan).toBeNull();
    expect(result.fuRounded).toBeNull();
    expect(result.score?.limit).toBe("yakuman");
    expect(result.score?.ron).toBe(48000);
  });

  it("counts both seat and round wind when same", () => {
    const counts = parseTiles("223344m567p99s111z");
    const result = evaluate(counts);
    const names = result.yaku.map((y) => y.name);
    expect(names.filter((n) => n === "Yakuhai: Seat Wind")).toHaveLength(1);
    expect(names.filter((n) => n === "Yakuhai: Round Wind")).toHaveLength(1);
    expect(result.totalHan).toBe(3);
    expect(result.fuRounded).toBe(40);
    expect(result.score?.limit).toBe(null);
    expect(result.score?.ron).toBe(7700);
  });

  it("prefers ryanpeikou over chiitoitsu when both patterns exist", () => {
    const counts = parseTiles("112233m445566s77p");
    const result = evaluate(counts);
    const names = result.yaku.map((y) => y.name);
    expect(names).toContain("Ryanpeikou");
    expect(names).not.toContain("Chiitoitsu");
    expect(result.totalHan).toBe(3);
    expect(result.fuRounded).toBe(30);
    expect(result.score?.limit).toBe(null);
    expect(result.score?.ron).toBe(5800);
  });

  it("combines chiitoitsu with chinitsu", () => {
    const counts = parseTiles("11224455668899p");
    const result = evaluate(counts);
    const names = result.yaku.map((y) => y.name);
    expect(names).toContain("Chiitoitsu");
    expect(names).toContain("Chinitsu");
    expect(result.totalHan).toBe(8);
    expect(result.fuRounded).toBe(25);
    expect(result.score?.limit).toBe("baiman");
    expect(result.score?.ron).toBe(24000);
  });

  it("combines chiitoitsu with honitsu", () => {
    const counts = parseTiles("112244556688p11z");
    const result = evaluate(counts);
    const names = result.yaku.map((y) => y.name);
    expect(names).toContain("Chiitoitsu");
    expect(names).toContain("Honitsu");
    expect(result.totalHan).toBe(5);
    expect(result.fuRounded).toBe(25);
    expect(result.score?.limit).toBe("mangan");
    expect(result.score?.ron).toBe(12000);
  });

  it("combines chiitoitsu with honroutou", () => {
    const counts = parseTiles("11m99m11p99p11s99s11z");
    const result = evaluate(counts);
    const names = result.yaku.map((y) => y.name);
    expect(names).toContain("Chiitoitsu");
    expect(names).toContain("Honroutou");
    expect(result.totalHan).toBe(4);
    expect(result.fuRounded).toBe(25);
    expect(result.score?.limit).toBe(null);
    expect(result.score?.ron).toBe(9600);
  });

  it("combines chiitoitsu with tanyao", () => {
    const counts = parseTiles("22446688m224466p");
    const result = evaluate(counts);
    const names = result.yaku.map((y) => y.name);
    expect(names).toContain("Chiitoitsu");
    expect(names).toContain("Tanyao");
    expect(result.totalHan).toBe(3);
    expect(result.fuRounded).toBe(25);
    expect(result.score?.limit).toBe(null);
    expect(result.score?.ron).toBe(4800);
  });

  it("prefers yakuman over chiitoitsu for tsuuiisou", () => {
    const counts = parseTiles("11223344556677z");
    const result = evaluate(counts);
    const yakumanNames = result.yakuman.map((y) => y.name);
    const yakuNames = result.yaku.map((y) => y.name);
    expect(yakumanNames).toContain("Tsuuiisou");
    expect(yakuNames).not.toContain("Chiitoitsu");
    expect(result.totalHan).toBeNull();
    expect(result.fuRounded).toBeNull();
    expect(result.score).toBeNull();
  });

  it("prefers yakuman over chiitoitsu for chinroutou when quads allowed", () => {
    const counts = parseTiles("1111m99m11p99p11s99s");
    const result = evaluate(counts, { allowChiitoiWithQuads: true });
    const yakumanNames = result.yakuman.map((y) => y.name);
    const yakuNames = result.yaku.map((y) => y.name);
    expect(yakumanNames).toContain("Chinroutou");
    expect(yakuNames).not.toContain("Chiitoitsu");
    expect(result.totalHan).toBeNull();
    expect(result.fuRounded).toBeNull();
    expect(result.score).toBeNull();
  });

  it("treats suu ankou as not valid on ron without tanki", () => {
    const counts = parseTiles("111222m333p444s55z");
    const result = evaluate(counts, { winTile: parseSingleTile("3p"), isTsumo: false });
    const yakumanNames = result.yakuman.map((y) => y.name);
    const yakuNames = result.yaku.map((y) => y.name);
    expect(yakumanNames).not.toContain("Suu Ankou");
    expect(yakuNames).toContain("San Ankou");
    expect(yakuNames).toContain("Toitoi");
    expect(result.totalHan).toBe(4);
    expect(result.fuRounded).toBe(60);
    expect(result.score?.limit).toBe("mangan");
    expect(result.score?.ron).toBe(12000);
  });

  it("treats suu ankou tanki on ron as double yakuman", () => {
    const counts = parseTiles("111222m333p444s55z");
    const result = evaluate(counts, { winTile: parseSingleTile("5z"), isTsumo: false });
    const yakuman = result.yakuman.find((y) => y.name === "Suu Ankou Tanki");
    expect(yakuman?.yakuman).toBe(2);
    expect(result.totalHan).toBeNull();
    expect(result.fuRounded).toBeNull();
    expect(result.score?.limit).toBe("doubleYakuman");
    expect(result.score?.ron).toBe(96000);
  });

  it("treats suu ankou on tsumo as yakuman", () => {
    const counts = parseTiles("111222m333p444s55z");
    const result = evaluate(counts, { isTsumo: true });
    const yakuman = result.yakuman.find((y) => y.name === "Suu Ankou");
    expect(yakuman?.yakuman).toBe(1);
    expect(result.totalHan).toBeNull();
    expect(result.fuRounded).toBeNull();
    expect(result.score?.limit).toBe("yakuman");
    expect(result.score?.ron).toBeNull();
    expect(result.score?.tsumo?.total).toBe(48000);
  });

  it("treats suu ankou tanki on tsumo as double yakuman", () => {
    const counts = parseTiles("111222m333p444s55z");
    const result = evaluate(counts, { winTile: parseSingleTile("5z"), isTsumo: true });
    const yakuman = result.yakuman.find((y) => y.name === "Suu Ankou Tanki");
    expect(yakuman?.yakuman).toBe(2);
    expect(result.totalHan).toBeNull();
    expect(result.fuRounded).toBeNull();
    expect(result.score?.limit).toBe("doubleYakuman");
    expect(result.score?.ron).toBeNull();
    expect(result.score?.tsumo?.total).toBe(96000);
  });
});
