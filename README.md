# Mahjong Analyzer (React + TypeScript)

Riichi mahjong analyzer for:
- Shanten calculation
- Yaku detection (common yaku + yakuman)
- Improving tiles (which draws reduce shanten)
- score

## Local dev

```bash
yarn
yarn dev
```

## Tests

```bash
yarn test
```

## Input format

- Tiles: compact notation like `123m456p789s12344z`
- Melds: `123m` (chi), `111p` (pon), `1111s` (kan)
- Honors (z): `1-7` = east, south, west, north, white, green, red

## Vercel deploy

1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Framework preset: `Vite`
4. Build command: `yarn build`
5. Output directory: `dist`

That’s it. Vercel will handle the rest.
