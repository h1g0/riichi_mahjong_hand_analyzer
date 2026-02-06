import type { Meld, TileIndex } from "./tiles";
import {
  countsFromMelds,
  emptyCounts,
  isHonor,
  isSimple,
  isTerminal,
  suitOf,
  tileNumber,
  totalCount,
} from "./tiles";

type Yaku = {
  name: string;
  han: number;
};

type Yakuman = {
  name: string;
  yakuman: number;
};

type EvalInput = {
  counts: number[];
  melds: Meld[];
  winTile: TileIndex | null;
  seatWind: string;
  roundWind: string;
  allowChiitoiWithQuads: boolean;
  allowOpenTanyao: boolean;
  applyKuisagari: boolean;
  allowIppatsuUra: boolean;
  redDoraEnabled: boolean;
  redDoraCount: number;
  doraIndicators: TileIndex[];
  uraIndicators: TileIndex[];
  doubleYakumanRule: "single" | "double" | "triple";
  paoEnabled: boolean;
  tsumoFu2: boolean;
  roundTo10Fu: boolean;
  pinfuTsumo20: boolean;
  kuipinfu30: boolean;
  isTsumo: boolean;
  isRiichi: boolean;
  isDoubleRiichi: boolean;
  isIppatsu: boolean;
  isRinshan: boolean;
  isHaitei: boolean;
  isHoutei: boolean;
  isChankan: boolean;
  isTenhou: boolean;
  isChiihou: boolean;
  kiriageMangan: boolean;
};

type Decomposition = {
  pair: TileIndex;
  melds: Meld[];
};

const windToIndex = (wind: string) => {
  switch (wind) {
    case "east":
      return 27;
    case "south":
      return 28;
    case "west":
      return 29;
    case "north":
      return 30;
    default:
      return 27;
  }
};

const countsAfterMelds = (counts: number[], melds: Meld[]) => {
  const meldCounts = countsFromMelds(melds);
  const next = emptyCounts();
  for (let i = 0; i < 34; i += 1) {
    next[i] = counts[i] - meldCounts[i];
    if (next[i] < 0) return null;
  }
  return next;
};

const isAllZero = (counts: number[]) => counts.every((c) => c === 0);

const canSequence = (i: TileIndex, counts: number[]) =>
  i < 27 && tileNumber(i) <= 7 && counts[i + 1] > 0 && counts[i + 2] > 0;

const generateMelds = (counts: number[], needed: number): Meld[][] => {
  if (needed === 0) {
    return isAllZero(counts) ? [[]] : [];
  }
  let idx = -1;
  for (let i = 0; i < 34; i += 1) {
    if (counts[i] > 0) {
      idx = i;
      break;
    }
  }
  if (idx === -1) return [];
  const results: Meld[][] = [];
  if (counts[idx] >= 3) {
    counts[idx] -= 3;
    for (const rest of generateMelds(counts, needed - 1)) {
      results.push([{ tiles: [idx, idx, idx], type: "pon", open: false }, ...rest]);
    }
    counts[idx] += 3;
  }
  if (canSequence(idx, counts)) {
    counts[idx] -= 1;
    counts[idx + 1] -= 1;
    counts[idx + 2] -= 1;
    for (const rest of generateMelds(counts, needed - 1)) {
      results.push([
        { tiles: [idx, idx + 1, idx + 2], type: "chi", open: false },
        ...rest,
      ]);
    }
    counts[idx] += 1;
    counts[idx + 1] += 1;
    counts[idx + 2] += 1;
  }
  return results;
};

const generateDecompositions = (counts: number[], melds: Meld[]): Decomposition[] => {
  const after = countsAfterMelds(counts, melds);
  if (!after) return [];
  const needed = 4 - melds.length;
  if (needed < 0) return [];
  const results: Decomposition[] = [];
  for (let i = 0; i < 34; i += 1) {
    if (after[i] >= 2) {
      after[i] -= 2;
      const meldLists = generateMelds(after, needed);
      for (const list of meldLists) {
        results.push({ pair: i, melds: [...melds, ...list] });
      }
      after[i] += 2;
    }
  }
  return results;
};

const isChiitoi = (counts: number[], allowQuads: boolean) => {
  let pairs = 0;
  for (let i = 0; i < 34; i += 1) {
    const c = counts[i];
    if (!allowQuads && c >= 3) return false;
    if (c === 2) pairs += 1;
    if (allowQuads && c === 4) pairs += 2;
    if (c === 3 || c === 1) return false;
  }
  return pairs === 7;
};

const isKokushi = (counts: number[]) => {
  const terminals = [
    0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33,
  ];
  let uniques = 0;
  let pairs = 0;
  for (const t of terminals) {
    if (counts[t] > 0) uniques += 1;
    if (counts[t] >= 2) pairs += 1;
  }
  return uniques === 13 && pairs >= 1;
};

const isAllHonors = (counts: number[]) => counts.every((c, i) => (c === 0 ? true : isHonor(i)));
const isAllTerminals = (counts: number[]) =>
  counts.every((c, i) => (c === 0 ? true : isTerminal(i)));

const isAllGreen = (counts: number[]) => {
  const greenTiles = new Set([19, 20, 21, 23, 25, 32]);
  return counts.every((c, i) => (c === 0 ? true : greenTiles.has(i)));
};

const suitSummary = (counts: number[]) => {
  const suits = new Set<number>();
  let honors = false;
  for (let i = 0; i < 34; i += 1) {
    if (counts[i] === 0) continue;
    const s = suitOf(i);
    if (s === 3) honors = true;
    else suits.add(s);
  }
  return { suits: Array.from(suits), honors };
};

const countMeldTypes = (melds: Meld[]) => {
  const sequences = melds.filter((m) => m.type === "chi");
  const triplets = melds.filter((m) => m.type === "pon" || m.type === "kan");
  const kans = melds.filter((m) => m.type === "kan");
  const closedTriplets = triplets.filter((m) => !m.open).length;
  return { sequences, triplets, kans, closedTriplets };
};

const valuePair = (pair: TileIndex, seatWind: number, roundWind: number) => {
  if (pair >= 31) return true;
  if (pair === seatWind || pair === roundWind) return true;
  return false;
};

const isRyanmenWait = (pair: TileIndex, melds: Meld[], winTile: TileIndex | null) => {
  if (winTile === null) return false;
  if (pair === winTile) return false;
  for (const m of melds) {
    if (m.type !== "chi") continue;
    const [a, b, c] = m.tiles;
    if (winTile !== a && winTile !== b && winTile !== c) continue;
    if (winTile === b) return false; // kanchan
    const remain1 = winTile === a ? b : a;
    const remain2 = winTile === a ? c : b;
    const r1 = tileNumber(remain1);
    const r2 = tileNumber(remain2);
    // Penchan only when remaining are 1-2 or 8-9
    if ((r1 === 1 && r2 === 2) || (r1 === 8 && r2 === 9)) return false;
    return true;
  }
  return false;
};

const waitFu = (pair: TileIndex, melds: Meld[], winTile: TileIndex | null) => {
  if (winTile === null) return 0;
  if (pair === winTile) return 2; // tanki
  let foundRyanmen = false;
  let foundKanchanOrPenchan = false;
  for (const m of melds) {
    if (m.type !== "chi") continue;
    const [a, b, c] = m.tiles;
    if (winTile !== a && winTile !== b && winTile !== c) continue;
    if (winTile === b) {
      foundKanchanOrPenchan = true;
      continue;
    }
    const remain1 = winTile === a ? b : a;
    const remain2 = winTile === a ? c : b;
    const r1 = tileNumber(remain1);
    const r2 = tileNumber(remain2);
    if ((r1 === 1 && r2 === 2) || (r1 === 8 && r2 === 9)) {
      foundKanchanOrPenchan = true;
    } else {
      foundRyanmen = true;
    }
  }
  if (foundRyanmen) return 0;
  if (foundKanchanOrPenchan) return 2;
  return 0;
};

const pairFu = (pair: TileIndex, seatWind: number, roundWind: number) => {
  let fu = 0;
  if (pair >= 31) fu += 2;
  if (pair === seatWind) fu += 2;
  if (pair === roundWind) fu += 2;
  return fu;
};

const meldFu = (melds: Meld[]) => {
  let fu = 0;
  for (const m of melds) {
    if (m.type !== "pon" && m.type !== "kan") continue;
    const tile = m.tiles[0];
    const terminalOrHonor = isTerminal(tile) || isHonor(tile);
    if (m.type === "pon") {
      if (m.open) fu += terminalOrHonor ? 4 : 2;
      else fu += terminalOrHonor ? 8 : 4;
    } else {
      if (m.open) fu += terminalOrHonor ? 16 : 8;
      else fu += terminalOrHonor ? 32 : 16;
    }
  }
  return fu;
};

const isPinfuLike = (pair: TileIndex, melds: Meld[], winTile: TileIndex | null, seatWind: number, roundWind: number) => {
  const allSequences = melds.every((m) => m.type === "chi");
  if (!allSequences) return false;
  if (valuePair(pair, seatWind, roundWind)) return false;
  return isRyanmenWait(pair, melds, winTile);
};

const roundFu = (fu: number, roundTo10: boolean) => {
  if (!roundTo10) return fu;
  if (fu === 25) return 25;
  return Math.ceil(fu / 10) * 10;
};

const checkIipeikou = (sequences: Meld[]) => {
  const map = new Map<string, number>();
  for (const s of sequences) {
    const key = s.tiles.join("-");
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  let pairs = 0;
  for (const v of map.values()) {
    if (v >= 2) pairs += Math.floor(v / 2);
  }
  return pairs;
};

const checkSanshokuDoujun = (sequences: Meld[]) => {
  const seqBySuit = new Map<number, Set<number>>();
  for (const s of sequences) {
    const suit = suitOf(s.tiles[0]);
    const start = tileNumber(s.tiles[0]);
    if (!seqBySuit.has(start)) seqBySuit.set(start, new Set());
    seqBySuit.get(start)!.add(suit);
  }
  for (const suits of seqBySuit.values()) {
    if (suits.size === 3) return true;
  }
  return false;
};

const checkSanshokuDoukou = (triplets: Meld[]) => {
  const map = new Map<number, Set<number>>();
  for (const t of triplets) {
    const suit = suitOf(t.tiles[0]);
    if (suit === 3) continue;
    const num = tileNumber(t.tiles[0]);
    if (!map.has(num)) map.set(num, new Set());
    map.get(num)!.add(suit);
  }
  for (const suits of map.values()) {
    if (suits.size === 3) return true;
  }
  return false;
};

const checkIttsuu = (sequences: Meld[]) => {
  const suits = new Map<number, Set<number>>();
  for (const s of sequences) {
    const suit = suitOf(s.tiles[0]);
    const start = tileNumber(s.tiles[0]);
    if (!suits.has(suit)) suits.set(suit, new Set());
    suits.get(suit)!.add(start);
  }
  for (const starts of suits.values()) {
    if (starts.has(1) && starts.has(4) && starts.has(7)) return true;
  }
  return false;
};

const checkChanta = (pair: TileIndex, melds: Meld[], allowHonors: boolean) => {
  const hasSequence = melds.some((m) => m.type === "chi");
  if (!hasSequence) return false;
  const allGroups = [
    ...melds.map((m) => m.tiles),
    [pair],
  ];
  for (const tiles of allGroups) {
    const hasTerminalOrHonor = tiles.some((t) => isTerminal(t) || isHonor(t));
    if (!hasTerminalOrHonor) return false;
    if (!allowHonors && tiles.some((t) => isHonor(t))) return false;
  }
  return true;
};

const checkHonroutou = (melds: Meld[], counts: number[]) => {
  if (melds.some((m) => m.type === "chi")) return false;
  return counts.every((c, i) => (c === 0 ? true : isTerminal(i) || isHonor(i)));
};

const checkChuuren = (counts: number[]) => {
  const { suits, honors } = suitSummary(counts);
  if (honors || suits.length !== 1) return false;
  const suit = suits[0];
  const start = suit * 9;
  const seq = counts.slice(start, start + 9);
  if (seq[0] < 3 || seq[8] < 3) return false;
  for (let i = 1; i < 8; i += 1) {
    if (seq[i] < 1) return false;
  }
  const total = seq.reduce((a, b) => a + b, 0);
  return total === 14;
};

const collectYakuhai = (triplets: Meld[], seatWind: number, roundWind: number) => {
  const yakus: Yaku[] = [];
  for (const t of triplets) {
    const tile = t.tiles[0];
    if (tile >= 31) {
      const name = tile === 31 ? "Yakuhai: White" : tile === 32 ? "Yakuhai: Green" : "Yakuhai: Red";
      yakus.push({ name, han: 1 });
    }
    if (tile === seatWind) {
      yakus.push({ name: "Yakuhai: Seat Wind", han: 1 });
    }
    if (tile === roundWind) {
      yakus.push({ name: "Yakuhai: Round Wind", han: 1 });
    }
  }
  return yakus;
};

const evaluateStandard = (
  decomposition: Decomposition,
  input: EvalInput,
  winTile: TileIndex | null
) => {
  const yakus: Yaku[] = [];
  const yakuman: Yakuman[] = [];
  const { pair, melds } = decomposition;
  const counts = input.counts;
  const menzen = !melds.some((m) => m.open);
  const { sequences, triplets, kans, closedTriplets } = countMeldTypes(melds);
  const { suits, honors } = suitSummary(counts);

  if (input.isTenhou) yakuman.push({ name: "Tenhou", yakuman: 1 });
  if (input.isChiihou) yakuman.push({ name: "Chiihou", yakuman: 1 });

  if (isAllHonors(counts)) yakuman.push({ name: "Tsuuiisou", yakuman: 1 });
  if (isAllTerminals(counts)) yakuman.push({ name: "Chinroutou", yakuman: 1 });
  if (isAllGreen(counts)) yakuman.push({ name: "Ryuuiisou", yakuman: 1 });
  if (checkChuuren(counts) && menzen) yakuman.push({ name: "Chuuren Poutou", yakuman: 1 });
  if (kans.length >= 4) yakuman.push({ name: "Suu Kantsu", yakuman: 1 });
  if (closedTriplets >= 4) {
    if (input.isTsumo) {
      yakuman.push({ name: "Suu Ankou", yakuman: 1 });
    } else if (winTile !== null && pair === winTile) {
      yakuman.push({ name: "Suu Ankou Tanki", yakuman: 2 });
    }
  }

  const dragonTriplets = triplets.filter((m) => m.tiles[0] >= 31);
  if (dragonTriplets.length >= 3) yakuman.push({ name: "Daisangen", yakuman: 1 });
  if (dragonTriplets.length === 2 && pair >= 31) {
    yakus.push({ name: "Shousangen", han: 2 });
  }

  const windTriplets = triplets.filter((m) => m.tiles[0] >= 27 && m.tiles[0] <= 30);
  if (windTriplets.length === 4) yakuman.push({ name: "Daisuushi", yakuman: 1 });
  if (windTriplets.length === 3 && pair >= 27 && pair <= 30) {
    yakuman.push({ name: "Shousuushi", yakuman: 1 });
  }

  if (menzen && input.isDoubleRiichi) yakus.push({ name: "Double Riichi", han: 2 });
  else if (menzen && input.isRiichi) yakus.push({ name: "Riichi", han: 1 });
  if (menzen && input.isTsumo) yakus.push({ name: "Menzen Tsumo", han: 1 });
  if (menzen && (input.isRiichi || input.isDoubleRiichi) && input.isIppatsu && input.allowIppatsuUra) {
    yakus.push({ name: "Ippatsu", han: 1 });
  }
  if (input.isRinshan) yakus.push({ name: "Rinshan Kaihou", han: 1 });
  if (input.isHaitei) yakus.push({ name: "Haitei Raoyue", han: 1 });
  if (input.isHoutei) yakus.push({ name: "Houtei Raoyui", han: 1 });
  if (input.isChankan) yakus.push({ name: "Chankan", han: 1 });

  if (counts.every((c, i) => (c === 0 ? true : isSimple(i)))) {
    if (menzen || input.allowOpenTanyao) {
      yakus.push({ name: "Tanyao", han: 1 });
    }
  }
  if (sequences.length === 4 && menzen) {
    const seat = windToIndex(input.seatWind);
    const round = windToIndex(input.roundWind);
    if (!valuePair(pair, seat, round) && isRyanmenWait(pair, melds, winTile)) {
      yakus.push({ name: "Pinfu", han: 1 });
    }
  }

  const iipei = checkIipeikou(sequences);
  if (menzen && iipei >= 2) yakus.push({ name: "Ryanpeikou", han: 3 });
  else if (menzen && iipei >= 1) yakus.push({ name: "Iipeikou", han: 1 });

  if (triplets.length === 4) yakus.push({ name: "Toitoi", han: 2 });
  if (closedTriplets >= 3) yakus.push({ name: "San Ankou", han: 2 });
  if (kans.length >= 3) yakus.push({ name: "San Kantsu", han: 2 });

  const kuisagariHan = (closed: number, open: number) =>
    input.applyKuisagari ? (menzen ? closed : open) : closed;

  if (checkSanshokuDoujun(sequences)) {
    yakus.push({ name: "Sanshoku Doujun", han: kuisagariHan(2, 1) });
  }
  if (checkSanshokuDoukou(triplets)) yakus.push({ name: "Sanshoku Doukou", han: 2 });
  if (checkIttsuu(sequences)) {
    yakus.push({ name: "Ittsuu", han: kuisagariHan(2, 1) });
  }

  if (checkChanta(pair, melds, true)) {
    yakus.push({ name: "Chanta", han: kuisagariHan(2, 1) });
  }
  if (checkChanta(pair, melds, false)) {
    yakus.push({ name: "Junchan", han: kuisagariHan(3, 2) });
  }
  if (checkHonroutou(melds, counts)) yakus.push({ name: "Honroutou", han: 2 });

  if (suits.length === 1 && honors) yakus.push({ name: "Honitsu", han: kuisagariHan(3, 2) });
  if (suits.length === 1 && !honors) yakus.push({ name: "Chinitsu", han: kuisagariHan(6, 5) });

  yakus.push(...collectYakuhai(triplets, windToIndex(input.seatWind), windToIndex(input.roundWind)));

  return { yakus, yakuman };
};

const sumHan = (yakus: Yaku[]) => yakus.reduce((a, b) => a + b.han, 0);
const sumYakuman = (yakus: Yakuman[]) => yakus.reduce((a, b) => a + b.yakuman, 0);

const indicatorToDora = (tile: TileIndex) => {
  if (tile < 27) {
    const base = Math.floor(tile / 9) * 9;
    const num = tileNumber(tile);
    const nextNum = num === 9 ? 1 : num + 1;
    return base + (nextNum - 1);
  }
  if (tile >= 27 && tile <= 30) {
    return tile === 30 ? 27 : tile + 1;
  }
  if (tile >= 31 && tile <= 33) {
    return tile === 33 ? 31 : tile + 1;
  }
  return tile;
};

const doraFromIndicators = (counts: number[], indicators: TileIndex[]) => {
  let total = 0;
  for (const ind of indicators) {
    const dora = indicatorToDora(ind);
    total += counts[dora] ?? 0;
  }
  return total;
};

export const evaluateYaku = (input: EvalInput) => {
  const notes: string[] = [];
  const kanCount = input.melds.filter((m) => m.type === "kan").length;
  const expectedTotal = 14 + kanCount;
  if (totalCount(input.counts) !== expectedTotal) {
    return { isAgari: false, yaku: [], yakuman: [], notes };
  }

  if (input.doubleYakumanRule !== "single") {
    notes.push("Double yakuman handling is not implemented in scoring.");
  }
  if (input.paoEnabled) {
    notes.push("Pao handling is not implemented.");
  }

  const melds = input.melds;
  const winTile: TileIndex | null = input.winTile ?? null;

  if (melds.length === 0 && isKokushi(input.counts)) {
    const dora =
      doraFromIndicators(input.counts, input.doraIndicators) +
      (input.redDoraEnabled ? input.redDoraCount : 0) +
      (input.allowIppatsuUra && input.isRiichi
        ? doraFromIndicators(input.counts, input.uraIndicators)
        : 0);
    return {
      isAgari: true,
      yaku: [],
      yakuman: [{ name: "Kokushi Musou", yakuman: 1 }],
      doraHan: dora,
      fu: null,
      fuRounded: null,
      totalHan: null,
      score: null,
      notes,
    };
  }

  const chiitoiPossible = melds.length === 0 && isChiitoi(input.counts, input.allowChiitoiWithQuads);
  if (chiitoiPossible) {
    const chiitoiYakuman: Yakuman[] = [];
    if (isAllHonors(input.counts)) chiitoiYakuman.push({ name: "Tsuuiisou", yakuman: 1 });
    if (isAllTerminals(input.counts)) chiitoiYakuman.push({ name: "Chinroutou", yakuman: 1 });
    if (isAllGreen(input.counts)) chiitoiYakuman.push({ name: "Ryuuiisou", yakuman: 1 });
    if (chiitoiYakuman.length > 0) {
      const dora =
        doraFromIndicators(input.counts, input.doraIndicators) +
        (input.redDoraEnabled ? input.redDoraCount : 0) +
        (input.allowIppatsuUra && input.isRiichi
          ? doraFromIndicators(input.counts, input.uraIndicators)
          : 0);
      return {
        isAgari: true,
        yaku: [],
        yakuman: chiitoiYakuman,
        doraHan: dora,
        fu: null,
        fuRounded: null,
        totalHan: null,
        score: null,
        notes,
      };
    }
  }

  const decompositions = generateDecompositions(input.counts, melds);
  if (decompositions.length === 0 && !chiitoiPossible) {
    return { isAgari: false, yaku: [], yakuman: [], notes };
  }

  let bestYaku: Yaku[] = [];
  let bestYakuman: Yakuman[] = [];
  let bestScore = -1;
  let bestYakumanScore = -1;
  let bestDecomposition: Decomposition | null = null;
  let bestIsChiitoi = false;
  let bestChiitoiHan = 0;
  let hadDecomposition = false;

  for (const d of decompositions) {
    hadDecomposition = true;
    const { yakus, yakuman } = evaluateStandard(d, input, winTile);
    const yakumanScore = sumYakuman(yakuman);
    const hanScore = sumHan(yakus);
    if (yakumanScore > 0) {
      if (yakumanScore > bestYakumanScore) {
        bestYakumanScore = yakumanScore;
        bestYakuman = yakuman;
        bestYaku = [];
        bestDecomposition = d;
      }
      continue;
    }
    if (bestYakumanScore > 0) continue;
    if (hanScore > bestScore) {
      bestScore = hanScore;
      bestYaku = yakus;
      bestYakuman = [];
      bestDecomposition = d;
    }
  }

  if (chiitoiPossible) {
    const { suits, honors } = suitSummary(input.counts);
    const chiitoiYakus: Yaku[] = [{ name: "Chiitoitsu", han: 2 }];
    if (suits.length === 1 && honors) chiitoiYakus.push({ name: "Honitsu", han: 3 });
    if (suits.length === 1 && !honors) chiitoiYakus.push({ name: "Chinitsu", han: 6 });
    if (input.counts.every((c, i) => (c === 0 ? true : isSimple(i)))) {
      if (input.allowOpenTanyao) {
        chiitoiYakus.push({ name: "Tanyao", han: 1 });
      }
    }
    if (input.counts.every((c, i) => (c === 0 ? true : isTerminal(i) || isHonor(i)))) {
      chiitoiYakus.push({ name: "Honroutou", han: 2 });
    }
    const chiitoiHan = sumHan(chiitoiYakus);

    if (!hadDecomposition) {
      bestYaku = chiitoiYakus;
      bestYakuman = [];
      bestScore = chiitoiHan;
      bestYakumanScore = 0;
      bestDecomposition = null;
      bestIsChiitoi = true;
      bestChiitoiHan = chiitoiHan;
    } else if (bestYakumanScore === 0 && bestScore < chiitoiHan) {
      bestYaku = chiitoiYakus;
      bestYakuman = [];
      bestScore = chiitoiHan;
      bestDecomposition = null;
      bestIsChiitoi = true;
      bestChiitoiHan = chiitoiHan;
    }
  }

  if (bestYaku.length === 0 && bestYakuman.length === 0) {
    notes.push("No yaku found for the current decomposition set.");
  }

  const dora =
    doraFromIndicators(input.counts, input.doraIndicators) +
    (input.redDoraEnabled ? input.redDoraCount : 0) +
    (input.allowIppatsuUra && input.isRiichi
      ? doraFromIndicators(input.counts, input.uraIndicators)
      : 0);

  let fu: number | null = null;
  let fuRounded: number | null = null;
  let totalHan: number | null = null;
  if (bestYakuman.length === 0 && bestIsChiitoi) {
    fu = 25;
    fuRounded = 25;
    totalHan = bestChiitoiHan + dora;
  } else if (bestYakuman.length === 0 && bestDecomposition) {
    const { pair, melds: usedMelds } = bestDecomposition;
    const seat = windToIndex(input.seatWind);
    const round = windToIndex(input.roundWind);
    const menzen = !usedMelds.some((m) => m.open);
    const pinfuLike = isPinfuLike(pair, usedMelds, winTile, seat, round);
    if (pinfuLike) {
      if (!menzen && input.kuipinfu30) {
        fu = 30;
        fuRounded = 30;
      } else if (menzen && input.isTsumo && input.pinfuTsumo20) {
        fu = 20;
        fuRounded = 20;
      } else if (menzen && !input.isTsumo) {
        fu = 30;
        fuRounded = 30;
      }
    }
    if (fu === null) {
      fu = 20;
      if (input.isTsumo && input.tsumoFu2) fu += 2;
      if (menzen && !input.isTsumo) fu += 10;
      fu += pairFu(pair, seat, round);
      fu += meldFu(usedMelds);
      fu += waitFu(pair, usedMelds, winTile);
      fuRounded = roundFu(fu, input.roundTo10Fu);
    }
    totalHan = sumHan(bestYaku) + dora;
  }

  const yakumanCountRaw = sumYakuman(bestYakuman);
  const yakumanMultiplier =
    yakumanCountRaw === 0
      ? 0
      : yakumanCountRaw *
        (input.doubleYakumanRule === "double"
          ? 2
          : input.doubleYakumanRule === "triple"
          ? 3
          : 1);

  const score =
    bestYakuman.length > 0 || (totalHan !== null && fuRounded !== null)
      ? calculateScore({
          han: totalHan ?? 0,
          fu: fuRounded ?? 0,
          isDealer: input.seatWind === "east",
          isTsumo: input.isTsumo,
          yakumanMultiplier,
          kiriageMangan: input.kiriageMangan,
        })
      : null;

  return {
    isAgari: true,
    yaku: bestYaku,
    yakuman: bestYakuman,
    doraHan: dora,
    fu,
    fuRounded,
    totalHan,
    score,
    notes,
  };
};

const ceil100 = (n: number) => Math.ceil(n / 100) * 100;

type ScoreInput = {
  han: number;
  fu: number;
  isDealer: boolean;
  isTsumo: boolean;
  yakumanMultiplier: number;
  kiriageMangan: boolean;
};

export const calculateScore = (input: ScoreInput) => {
  const { han, fu, isDealer, isTsumo, yakumanMultiplier, kiriageMangan } = input;

  let base = 0;
  let limit:
    | "yakuman"
    | "doubleYakuman"
    | "kazoe"
    | "sanbaiman"
    | "baiman"
    | "haneman"
    | "mangan"
    | null = null;

  if (yakumanMultiplier > 0) {
    base = 8000 * yakumanMultiplier;
    limit = yakumanMultiplier >= 2 ? "doubleYakuman" : "yakuman";
  } else if (han >= 13) {
    base = 8000;
    limit = "kazoe";
  } else if (han >= 11) {
    base = 6000;
    limit = "sanbaiman";
  } else if (han >= 8) {
    base = 4000;
    limit = "baiman";
  } else if (han >= 6) {
    base = 3000;
    limit = "haneman";
  } else {
    const calcBase = fu * Math.pow(2, han + 2);
    if (han >= 5 || calcBase >= 2000) {
      base = 2000;
      limit = "mangan";
    } else if (kiriageMangan && ((han === 4 && fu === 30) || (han === 3 && fu === 60))) {
      base = 2000;
      limit = "mangan";
    } else {
      base = calcBase;
    }
  }

  if (isTsumo) {
    if (isDealer) {
      const pay = ceil100(base * 2);
      return {
        limit,
        base,
        tsumo: { dealerPay: pay, nonDealerPay: pay, total: pay * 3 },
        ron: null,
      };
    }
    const dealerPay = ceil100(base * 2);
    const nonDealerPay = ceil100(base);
    return {
      limit,
      base,
      tsumo: { dealerPay, nonDealerPay, total: dealerPay + nonDealerPay * 2 },
      ron: null,
    };
  }

  if (isDealer) {
    const ron = ceil100(base * 6);
    return { limit, base, ron, tsumo: null };
  }
  const ron = ceil100(base * 4);
  return { limit, base, ron, tsumo: null };
};
