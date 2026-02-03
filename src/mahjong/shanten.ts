import type { TileIndex } from "./tiles";
import { cloneCounts, isHonor, tileNumber } from "./tiles";

const findNext = (counts: number[], start: number) => {
  for (let i = start; i < 34; i += 1) {
    if (counts[i] > 0) return i;
  }
  return -1;
};

const isSequenceStart = (i: TileIndex) => i < 27 && !isHonor(i) && tileNumber(i) <= 7;

export const shantenStandard = (countsInput: number[], openMelds: number) => {
  const counts = cloneCounts(countsInput);
  let minShanten = 8;

  const dfs = (idx: number, melds: number, pairs: number, taatsu: number) => {
    if (melds > 4) return;
    const next = findNext(counts, idx);
    if (next === -1) {
      let t = taatsu;
      if (t > 4 - melds) t = 4 - melds;
      const shanten = 8 - melds * 2 - pairs - t;
      if (shanten < minShanten) minShanten = shanten;
      return;
    }

    // Triplet
    if (counts[next] >= 3) {
      counts[next] -= 3;
      dfs(next, melds + 1, pairs, taatsu);
      counts[next] += 3;
    }

    // Sequence
    if (isSequenceStart(next)) {
      if (counts[next + 1] > 0 && counts[next + 2] > 0) {
        counts[next] -= 1;
        counts[next + 1] -= 1;
        counts[next + 2] -= 1;
        dfs(next, melds + 1, pairs, taatsu);
        counts[next] += 1;
        counts[next + 1] += 1;
        counts[next + 2] += 1;
      }
    }

    // Pair
    if (counts[next] >= 2) {
      counts[next] -= 2;
      dfs(next, melds, pairs + 1, taatsu);
      counts[next] += 2;
    }

    // Taatsu: ryanmen/penchan
    if (isSequenceStart(next)) {
      if (counts[next + 1] > 0) {
        counts[next] -= 1;
        counts[next + 1] -= 1;
        dfs(next, melds, pairs, taatsu + 1);
        counts[next] += 1;
        counts[next + 1] += 1;
      }
    }

    // Taatsu: kanchan
    if (isSequenceStart(next)) {
      if (counts[next + 2] > 0) {
        counts[next] -= 1;
        counts[next + 2] -= 1;
        dfs(next, melds, pairs, taatsu + 1);
        counts[next] += 1;
        counts[next + 2] += 1;
      }
    }

    // Skip tile
    counts[next] -= 1;
    dfs(next, melds, pairs, taatsu);
    counts[next] += 1;
  };

  dfs(0, openMelds, 0, 0);
  return minShanten;
};

export const shantenChiitoi = (counts: number[]) => {
  let pairs = 0;
  let uniques = 0;
  for (let i = 0; i < 34; i += 1) {
    if (counts[i] > 0) uniques += 1;
    if (counts[i] >= 2) pairs += 1;
  }
  return 6 - pairs + Math.max(0, 7 - uniques);
};

export const shantenKokushi = (counts: number[]) => {
  const terminals = [
    0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33,
  ];
  let uniques = 0;
  let hasPair = false;
  for (const t of terminals) {
    if (counts[t] > 0) uniques += 1;
    if (counts[t] >= 2) hasPair = true;
  }
  return 13 - uniques - (hasPair ? 1 : 0);
};

export const shantenAll = (counts: number[], openMelds: number) => {
  const standard = shantenStandard(counts, openMelds);
  if (openMelds > 0) return { standard, chiitoi: null, kokushi: null, min: standard };
  const chiitoi = shantenChiitoi(counts);
  const kokushi = shantenKokushi(counts);
  return {
    standard,
    chiitoi,
    kokushi,
    min: Math.min(standard, chiitoi, kokushi),
  };
};
