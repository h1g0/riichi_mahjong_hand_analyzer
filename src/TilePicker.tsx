import { Box } from "@mui/material";
import type { CalledFrom, MeldType } from "./mahjong/tiles";
import { calledTilePosition } from "./mahjong/tiles";

const tileImages = import.meta.glob<{ default: string }>("./images/tiles/*.png", { eager: true });

const getTileImageUrl = (filename: string): string => {
  const key = `./images/tiles/${filename}.png`;
  return tileImages[key]?.default ?? "";
};

const TILE_HEIGHT = 48;
const TILE_WIDTH = TILE_HEIGHT * (111 / 150);
const SIDEWAYS_TILE_OFFSET = (TILE_HEIGHT - TILE_WIDTH) / 2;

export function parseHandDisplay(input: string): string[] {
  const compact = input.replace(/\s+/g, "").toLowerCase();
  const tiles: string[] = [];
  let digits = "";

  for (const ch of compact) {
    if (ch >= "0" && ch <= "9") {
      digits += ch;
    } else if (ch === "m" || ch === "p" || ch === "s" || ch === "z") {
      for (const d of digits) {
        if (d === "0") {
          if (ch !== "z") tiles.push(`r5${ch}`);
        } else {
          tiles.push(`${d}${ch}`);
        }
      }
      digits = "";
    }
  }
  return tiles;
}

const SUIT_ROWS = [
  {
    suit: "m",
    tiles: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ filename: `${n}m`, str: `${n}m` })),
    red: { filename: "r5m", str: "0m" },
  },
  {
    suit: "p",
    tiles: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ filename: `${n}p`, str: `${n}p` })),
    red: { filename: "r5p", str: "0p" },
  },
  {
    suit: "s",
    tiles: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ filename: `${n}s`, str: `${n}s` })),
    red: { filename: "r5s", str: "0s" },
  },
];

const HONOR_TILES = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ filename: `${n}z`, str: `${n}z` }));

type TilePickerProps = {
  onTileClick: (tileStr: string) => void;
  redDoraEnabled: boolean;
};

export function TilePicker({ onTileClick, redDoraEnabled }: TilePickerProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      {SUIT_ROWS.map(({ suit, tiles, red }) => (
        <Box key={suit} sx={{ display: "flex", flexWrap: "wrap", gap: 0.25 }}>
          {tiles.map((tile) => (
            <TileButton key={tile.filename} filename={tile.filename} onClick={() => onTileClick(tile.str)} />
          ))}
          {redDoraEnabled && (
            <TileButton key={red.filename} filename={red.filename} onClick={() => onTileClick(red.str)} />
          )}
        </Box>
      ))}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.25 }}>
        {HONOR_TILES.map((tile) => (
          <TileButton key={tile.filename} filename={tile.filename} onClick={() => onTileClick(tile.str)} />
        ))}
      </Box>
    </Box>
  );
}

function TileButton({ filename, onClick }: { filename: string; onClick: () => void }) {
  return (
    <Box
      component="img"
      src={getTileImageUrl(filename)}
      alt={filename}
      sx={{
        height: TILE_HEIGHT,
        cursor: "pointer",
        borderRadius: "4px",
        userSelect: "none",
        "&:hover": { opacity: 0.75, transform: "translateY(-3px)" },
        transition: "transform 0.1s, opacity 0.1s",
      }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    />
  );
}

export function TileDisplay({ input }: { input: string }) {
  const tiles = parseHandDisplay(input);
  if (tiles.length === 0) return null;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.25, minHeight: TILE_HEIGHT, mb: 1 }}>
      {tiles.map((filename, i) => (
        <Box
          key={i}
          component="img"
          src={getTileImageUrl(filename)}
          alt={filename}
          sx={{ height: TILE_HEIGHT }}
        />
      ))}
    </Box>
  );
}

type MeldDisplayProps = {
  input: string;
  type: MeldType;
  open: boolean;
  calledFrom?: CalledFrom;
};

export function MeldDisplay({ input, type, open, calledFrom = "left" }: MeldDisplayProps) {
  const tiles = parseHandDisplay(input);
  if (tiles.length === 0) return null;
  const sidewaysIndex = open ? calledTilePosition(type, calledFrom) : -1;

  return (
    <Box
      aria-label={`${type} meld`}
      sx={{ display: "flex", alignItems: "flex-end", gap: 0.25, minHeight: TILE_HEIGHT + 14, mb: 1 }}
    >
      {tiles.map((filename, i) => {
        const sideways = i === sidewaysIndex;
        const displayedFilename = type === "kan" && !open && (i === 0 || i === 3) ? "back" : filename;
        return (
          <Box
            key={i}
            component="img"
            src={getTileImageUrl(displayedFilename)}
            alt={displayedFilename}
            data-sideways={sideways || undefined}
            sx={{
              height: TILE_HEIGHT,
              transform: sideways
                ? `translateY(${SIDEWAYS_TILE_OFFSET}px) rotate(-90deg)`
                : undefined,
              mx: sideways ? `${SIDEWAYS_TILE_OFFSET}px` : 0,
            }}
          />
        );
      })}
    </Box>
  );
}
