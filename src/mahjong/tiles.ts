export type TileIndex = number;

export type MeldType = "chi" | "pon" | "kan";

export type CalledFrom = "left" | "opposite" | "right";

export type Meld = {
  tiles: TileIndex[];
  type: MeldType;
  open: boolean;
};

/** The visual position of the discarded tile in an open meld. */
export const calledTilePosition = (
  type: MeldType,
  calledFrom: CalledFrom = "left"
): number => {
  if (type === "chi" || calledFrom === "left") return 0;
  if (calledFrom === "opposite") return 1;
  // A tile called from the player on the right is placed at the far right.
  return type === "kan" ? 3 : 2;
};

const SUIT_OFFSETS = {
  m: 0,
  p: 9,
  s: 18,
  z: 27,
} as const;

export const HONOR_NAMES = ["east", "south", "west", "north", "white", "green", "red"] as const;

export const ALL_TILES = Array.from({ length: 34 }, (_, i) => i);

export const isHonor = (i: TileIndex) => i >= 27;
export const isTerminal = (i: TileIndex) => !isHonor(i) && (i % 9 === 0 || i % 9 === 8);
export const isSimple = (i: TileIndex) => !isHonor(i) && i % 9 !== 0 && i % 9 !== 8;

export const tileToString = (i: TileIndex) => {
  if (i < 0 || i >= 34) return "?";
  if (i < 27) {
    const suit = i < 9 ? "m" : i < 18 ? "p" : "s";
    const num = (i % 9) + 1;
    return `${num}${suit}`;
  }
  return `${i - 26}z`;
};

export const tilesToDisplay = (indices: TileIndex[]) =>
  indices.map(tileToString).join(" ");

export const emptyCounts = () => Array(34).fill(0) as number[];

export const cloneCounts = (counts: number[]) => counts.slice(0, 34);

const parseSuitGroup = (digits: string, suit: "m" | "p" | "s" | "z", counts: number[]) => {
  const offset = SUIT_OFFSETS[suit];
  for (const ch of digits) {
    if (ch === "0") {
      // Red fives are treated as normal 5.
      const idx = offset + 4;
      counts[idx] += 1;
      continue;
    }
    const num = ch.charCodeAt(0) - 48;
    if (num < 1 || num > 9) continue;
    const idx = offset + (num - 1);
    if (idx >= 27 && num > 7) continue;
    counts[idx] += 1;
  }
};

export const parseTiles = (input: string) => {
  const counts = emptyCounts();
  const compact = input.replace(/\s+/g, "").toLowerCase();
  let digits = "";
  for (const ch of compact) {
    if (ch >= "0" && ch <= "9") {
      digits += ch;
      continue;
    }
    if (ch === "m" || ch === "p" || ch === "s" || ch === "z") {
      if (digits.length > 0) {
        parseSuitGroup(digits, ch, counts);
        digits = "";
      }
      continue;
    }
  }
  return counts;
};

export const countRedFives = (input: string) => {
  const compact = input.replace(/\s+/g, "").toLowerCase();
  let digits = "";
  let total = 0;
  for (const ch of compact) {
    if (ch >= "0" && ch <= "9") {
      digits += ch;
      continue;
    }
    if (ch === "m" || ch === "p" || ch === "s" || ch === "z") {
      if (digits.length > 0) {
        for (const d of digits) {
          if (d === "0") total += 1;
        }
        digits = "";
      }
      continue;
    }
  }
  return total;
};

// Normalize "1m2m3m" style input to "123m" style for parseMeld.
// If tiles span multiple suits, returns the input unchanged (will fail validation).
const normalizeToSingleSuit = (input: string): string => {
  const compact = input.replace(/\s+/g, "").toLowerCase();
  type Suit = "m" | "p" | "s" | "z";
  const tiles: { digit: string; suit: Suit }[] = [];
  let digits = "";
  for (const ch of compact) {
    if (ch >= "0" && ch <= "9") {
      digits += ch;
    } else if (ch === "m" || ch === "p" || ch === "s" || ch === "z") {
      for (const d of digits) tiles.push({ digit: d, suit: ch as Suit });
      digits = "";
    }
  }
  if (tiles.length === 0) return compact;
  const suits = new Set(tiles.map((t) => t.suit));
  if (suits.size !== 1) return compact;
  return tiles.map((t) => t.digit).join("") + tiles[0].suit;
};

export const parseMeld = (input: string, open = true): Meld | null => {
  const compact = normalizeToSingleSuit(input);
  if (compact.length < 3) return null;
  const suit = compact[compact.length - 1] as "m" | "p" | "s" | "z";
  if (!["m", "p", "s", "z"].includes(suit)) return null;
  const digits = compact.slice(0, -1);
  if (digits.length < 3) return null;
  const tiles: TileIndex[] = [];
  const offset = SUIT_OFFSETS[suit];
  for (const ch of digits) {
    const num = ch === "0" ? 5 : ch.charCodeAt(0) - 48;
    if (num < 1 || num > 9) return null;
    if (suit === "z" && num > 7) return null;
    tiles.push(offset + (num - 1));
  }
  tiles.sort((a, b) => a - b);
  const len = tiles.length;
  let type: MeldType | null = null;
  if (len === 3) {
    const [a, b, c] = tiles;
    if (a === b && b === c) type = "pon";
    if (a + 1 === b && b + 1 === c && !isHonor(a)) type = "chi";
  } else if (len === 4) {
    const [a, b, c, d] = tiles;
    if (a === b && b === c && c === d) type = "kan";
  }
  if (!type) return null;
  return { tiles, type, open };
};

export const parseSingleTile = (input: string): TileIndex | null => {
  const compact = input.replace(/\s+/g, "").toLowerCase();
  if (compact.length !== 2) return null;
  const numChar = compact[0];
  const suit = compact[1] as "m" | "p" | "s" | "z";
  if (!["m", "p", "s", "z"].includes(suit)) return null;
  const num = numChar === "0" ? 5 : numChar.charCodeAt(0) - 48;
  if (num < 1 || num > 9) return null;
  if (suit === "z" && num > 7) return null;
  const offset = SUIT_OFFSETS[suit];
  return offset + (num - 1);
};

export const countsFromMelds = (melds: Meld[]) => {
  const counts = emptyCounts();
  for (const meld of melds) {
    for (const t of meld.tiles) counts[t] += 1;
  }
  return counts;
};

export const totalCount = (counts: number[]) => counts.reduce((a, b) => a + b, 0);

export const hasTooManyTiles = (counts: number[]) => counts.some((c) => c > 4);

export const suitOf = (i: TileIndex) => {
  if (i < 9) return 0;
  if (i < 18) return 1;
  if (i < 27) return 2;
  return 3;
};

export const tileNumber = (i: TileIndex) => (i % 9) + 1;
