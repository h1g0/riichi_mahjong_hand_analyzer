import { describe, expect, it } from "vitest";
import { parseTiles } from "../tiles";
import { evaluateYaku } from "../yaku";

describe("yaku evaluation", () => {
  it("finds tanyao", () => {
    const counts = parseTiles("234m345m456p678p22s");
    const result = evaluateYaku({
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
      isIppatsu: false,
      isRinshan: false,
      isHaitei: false,
      isHoutei: false,
      isChankan: false,
      isTenhou: false,
      isChiihou: false,
    });
    const names = result.yaku.map((y) => y.name);
    expect(names).toContain("Tanyao");
  });

  it("detects chiitoitsu", () => {
    const counts = parseTiles("11m22m33p44p55s66s77z");
    const result = evaluateYaku({
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
      isIppatsu: false,
      isRinshan: false,
      isHaitei: false,
      isHoutei: false,
      isChankan: false,
      isTenhou: false,
      isChiihou: false,
    });
    const names = result.yaku.map((y) => y.name);
    expect(names).toContain("Chiitoitsu");
  });

  it("rejects chiitoitsu with quads by default", () => {
    const counts = parseTiles("11223344446677m");
    const result = evaluateYaku({
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
      isIppatsu: false,
      isRinshan: false,
      isHaitei: false,
      isHoutei: false,
      isChankan: false,
      isTenhou: false,
      isChiihou: false,
    });
    const names = result.yaku.map((y) => y.name);
    expect(names).not.toContain("Chiitoitsu");
  });

  it("allows chiitoitsu with quads when enabled", () => {
    const counts = parseTiles("11223344446677m");
    const result = evaluateYaku({
      counts,
      melds: [],
      winTile: null,
      seatWind: "east",
      roundWind: "east",
      allowChiitoiWithQuads: true,
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
      isIppatsu: false,
      isRinshan: false,
      isHaitei: false,
      isHoutei: false,
      isChankan: false,
      isTenhou: false,
      isChiihou: false,
    });
    const names = result.yaku.map((y) => y.name);
    expect(names).toContain("Chiitoitsu");
  });

  it("detects daisangen", () => {
    const counts = parseTiles("123m11m555666777z");
    const result = evaluateYaku({
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
      isIppatsu: false,
      isRinshan: false,
      isHaitei: false,
      isHoutei: false,
      isChankan: false,
      isTenhou: false,
      isChiihou: false,
    });
    const names = result.yakuman.map((y) => y.name);
    expect(names).toContain("Daisangen");
  });

  it("counts both seat and round wind when same", () => {
    const counts = parseTiles("223344m567p99s111z");
    const result = evaluateYaku({
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
      isIppatsu: false,
      isRinshan: false,
      isHaitei: false,
      isHoutei: false,
      isChankan: false,
      isTenhou: false,
      isChiihou: false,
    });
    const names = result.yaku.map((y) => y.name);
    expect(names.filter((n) => n === "Yakuhai: Seat Wind")).toHaveLength(1);
    expect(names.filter((n) => n === "Yakuhai: Round Wind")).toHaveLength(1);
  });
});
