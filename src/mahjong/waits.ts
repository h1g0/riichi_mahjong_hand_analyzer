import { shantenAll } from "./shanten";
import { cloneCounts } from "./tiles";

export const improvingTiles = (counts: number[], openMelds: number) => {
  const base = shantenAll(counts, openMelds).min;
  const result: { tile: number; shanten: number }[] = [];
  for (let i = 0; i < 34; i += 1) {
    if (counts[i] >= 4) continue;
    const next = cloneCounts(counts);
    next[i] += 1;
    const nextShanten = shantenAll(next, openMelds).min;
    if (nextShanten < base) {
      result.push({ tile: i, shanten: nextShanten });
    }
  }
  return result;
};
