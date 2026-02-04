import { useMemo, useState } from "react";
import "./App.css";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Menu,
  Paper,
  Switch,
  TextField,
  Toolbar,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Stack,
  Divider,
  ThemeProvider,
  createTheme,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import MenuIcon from "@mui/icons-material/Menu";
import { useTranslation } from "react-i18next";
import type { Meld } from "./mahjong/tiles";
import {
  countsFromMelds,
  emptyCounts,
  hasTooManyTiles,
  parseMeld,
  parseSingleTile,
  parseTiles,
  tilesToDisplay,
  totalCount,
} from "./mahjong/tiles";
import { shantenAll } from "./mahjong/shanten";
import { improvingTiles } from "./mahjong/waits";
import { evaluateYaku } from "./mahjong/yaku";

type MeldInput = { id: number; text: string; open: boolean };

const defaultHand = "123m456p789s12344z";

function App() {
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState<"ja" | "en">("ja");
  const [handInput, setHandInput] = useState(defaultHand);
  const [melds, setMelds] = useState<MeldInput[]>([]);
  const [seatWind, setSeatWind] = useState("east");
  const [roundWind, setRoundWind] = useState("east");
  const [winTileInput, setWinTileInput] = useState("");
  const [isTsumo, setIsTsumo] = useState(false);
  const [isRiichi, setIsRiichi] = useState(false);
  const [isDoubleRiichi, setIsDoubleRiichi] = useState(false);
  const [isIppatsu, setIsIppatsu] = useState(false);
  const [isRinshan, setIsRinshan] = useState(false);
  const [isHaitei, setIsHaitei] = useState(false);
  const [isHoutei, setIsHoutei] = useState(false);
  const [isChankan, setIsChankan] = useState(false);
  const [isTenhou, setIsTenhou] = useState(false);
  const [isChiihou, setIsChiihou] = useState(false);
  const [allowChiitoiWithQuads, setAllowChiitoiWithQuads] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [allowOpenTanyao, setAllowOpenTanyao] = useState(true);
  const [applyKuisagari, setApplyKuisagari] = useState(true);
  const [allowIppatsuUra, setAllowIppatsuUra] = useState(true);
  const [redDoraEnabled, setRedDoraEnabled] = useState(true);
  const [doubleYakumanRule, setDoubleYakumanRule] = useState<"single" | "double" | "triple">("single");
  const [paoEnabled, setPaoEnabled] = useState(false);
  const [tsumoFu2, setTsumoFu2] = useState(true);
  const [roundTo10Fu, setRoundTo10Fu] = useState(true);
  const [pinfuTsumo20, setPinfuTsumo20] = useState(true);
  const [kuipinfu30, setKuipinfu30] = useState(true);
  const [kiriageMangan, setKiriageMangan] = useState(true);
  const [honbaCount, setHonbaCount] = useState(0);
  const [riichiSticks, setRiichiSticks] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [doraIndicatorsInput, setDoraIndicatorsInput] = useState("");
  const [uraIndicatorsInput, setUraIndicatorsInput] = useState("");

  const setLanguage = (next: "ja" | "en") => {
    setLang(next);
    void i18n.changeLanguage(next);
  };

  const openMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
  };

  const displayYakuName = (name: string) => t(`yakuNames.${name}`, name);
  const yakumanLabel = (count: number) =>
    t(
      count === 1
        ? "yakumanLabel"
        : count === 2
          ? "doubleYakumanLabel"
          : "tripleYakumanLabel"
    );

  const parsed = useMemo(() => {
    const handCounts = parseTiles(handInput);
    const meldList: Meld[] = [];
    const errors: string[] = [];
    for (const m of melds) {
      const meld = parseMeld(m.text, m.open);
      if (!meld) {
        errors.push(`${t("invalidMeld")}${m.text}`);
        continue;
      }
      if (meld.type !== "kan") {
        meld.open = true;
      }
      meldList.push(meld);
    }

    const meldCounts = countsFromMelds(meldList);
    const totalCounts = emptyCounts();
    for (let i = 0; i < 34; i += 1) {
      totalCounts[i] = handCounts[i] + meldCounts[i];
    }
    if (hasTooManyTiles(totalCounts)) {
      errors.push(t("tooManyTiles"));
    }
    const total = totalCount(totalCounts);
    const kanCount = meldList.filter((m) => m.type === "kan").length;
    const maxTotal = 14 + kanCount;
    if (total > maxTotal) {
      errors.push(t("tooManyTotalTiles"));
    }
    if (total < 14) {
      errors.push(t("tooFewTotalTiles"));
    }

    return { handCounts, meldList, totalCounts, errors, kanCount };
  }, [handInput, melds, t]);

  const doraIndicators = useMemo(() => {
    const counts = parseTiles(doraIndicatorsInput);
    const list: number[] = [];
    counts.forEach((c, i) => {
      for (let k = 0; k < c; k += 1) list.push(i);
    });
    return list;
  }, [doraIndicatorsInput]);

  const uraIndicators = useMemo(() => {
    const counts = parseTiles(uraIndicatorsInput);
    const list: number[] = [];
    counts.forEach((c, i) => {
      for (let k = 0; k < c; k += 1) list.push(i);
    });
    return list;
  }, [uraIndicatorsInput]);

  const redDoraCount = useMemo(() => {
    if (!redDoraEnabled) return 0;
    const countRed = (s: string) => (s.match(/0[mpzs]/gi) ?? []).length;
    let total = countRed(handInput);
    for (const m of melds) total += countRed(m.text);
    return total;
  }, [handInput, melds, redDoraEnabled]);

  const shanten = useMemo(() => {
    const openMelds = parsed.meldList.length;
    return shantenAll(parsed.handCounts, openMelds);
  }, [parsed.handCounts, parsed.meldList.length]);

  const improvements = useMemo(() => {
    const openMelds = parsed.meldList.length;
    return improvingTiles(parsed.handCounts, openMelds);
  }, [parsed.handCounts, parsed.meldList.length]);

  const yakuResult = useMemo(() => {
    const total = totalCount(parsed.totalCounts);
    const maxTotal = 14 + parsed.kanCount;
    const winTile = winTileInput ? parseSingleTile(winTileInput) : null;
    let countsForYaku = parsed.totalCounts;
    if (total === maxTotal - 1 && winTile !== null) {
      const next = parsed.totalCounts.slice();
      next[winTile] += 1;
      countsForYaku = next;
    } else if (total !== maxTotal) {
      return null;
    }
    return evaluateYaku({
      counts: countsForYaku,
      melds: parsed.meldList,
      winTile,
      seatWind,
      roundWind,
      allowChiitoiWithQuads,
      allowOpenTanyao,
      applyKuisagari,
      allowIppatsuUra,
      redDoraEnabled,
      redDoraCount,
      doraIndicators,
      uraIndicators,
      doubleYakumanRule,
      paoEnabled,
      tsumoFu2,
      roundTo10Fu,
      pinfuTsumo20,
      kuipinfu30,
      kiriageMangan,
      isTsumo,
      isRiichi,
      isDoubleRiichi,
      isIppatsu,
      isRinshan,
      isHaitei,
      isHoutei,
      isChankan,
      isTenhou,
      isChiihou,
    });
  }, [
    parsed.totalCounts,
    parsed.meldList,
    parsed.kanCount,
    seatWind,
    roundWind,
    winTileInput,
    allowChiitoiWithQuads,
    allowOpenTanyao,
    applyKuisagari,
    allowIppatsuUra,
    redDoraEnabled,
    redDoraCount,
    doraIndicators,
    uraIndicators,
    doubleYakumanRule,
    paoEnabled,
    tsumoFu2,
    roundTo10Fu,
    pinfuTsumo20,
    kuipinfu30,
    kiriageMangan,
    isTsumo,
    isRiichi,
    isDoubleRiichi,
    isIppatsu,
    isRinshan,
    isHaitei,
    isHoutei,
    isChankan,
    isTenhou,
    isChiihou,
  ]);

  const addMeld = () => {
    setMelds((prev) => [...prev, { id: Date.now(), text: "", open: true }]);
  };

  const updateMeld = (id: number, patch: Partial<MeldInput>) => {
    setMelds((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeMeld = (id: number) => {
    setMelds((prev) => prev.filter((m) => m.id !== id));
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "light",
        },
      }),
    []
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky" color="primary">
        <Toolbar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">{t("title")}</Typography>
          </Box>
          <IconButton color="inherit" onClick={openMenu}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            setSettingsOpen(true);
            closeMenu();
          }}
        >
          {t("settings")}
        </MenuItem>
        <MenuItem disabled>{t("lang")}</MenuItem>
        <MenuItem
          selected={lang === "ja"}
          onClick={() => {
            setLanguage("ja");
            closeMenu();
          }}
        >
          日本語
        </MenuItem>
        <MenuItem
          selected={lang === "en"}
          onClick={() => {
            setLanguage("en");
            closeMenu();
          }}
        >
          English
        </MenuItem>
      </Menu>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Stack spacing={1}>
              <Typography variant="h5">{t("table")}</Typography>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
              }}
            >
              <FormControl fullWidth>
                <InputLabel>{t("roundWind")}</InputLabel>
                <Select
                  value={roundWind}
                  label={t("roundWind")}
                  onChange={(e) => setRoundWind(e.target.value)}
                >
                  {["east", "south", "west", "north"].map((w) => (
                    <MenuItem key={w} value={w}>
                      {t(`wind${w[0].toUpperCase()}${w.slice(1)}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                type="number"
                label={t("honba")}
                value={honbaCount}
                onChange={(e) => setHonbaCount(Math.max(0, Number(e.target.value) || 0))}
                inputProps={{ min: 0 }}
              />
              <TextField
                type="number"
                label={t("riichiSticks")}
                value={riichiSticks}
                onChange={(e) => setRiichiSticks(Math.max(0, Number(e.target.value) || 0))}
                inputProps={{ min: 0 }}
              />
              <TextField
                fullWidth
                label={t("dora")}
                value={doraIndicatorsInput}
                onChange={(e) => setDoraIndicatorsInput(e.target.value)}
                placeholder="3m7p1z"
                helperText={t("doraHelp")}
              />
              <TextField
                fullWidth
                label={t("uraDora")}
                value={uraIndicatorsInput}
                onChange={(e) => setUraIndicatorsInput(e.target.value)}
                placeholder="4m2p3z"
                helperText={t("doraHelp")}
              />
            </Box>
          </Paper>

          <Paper elevation={2} sx={{ p: 3 }}>
            <Stack spacing={1}>
              <Typography variant="h5">{t("handInput")}</Typography>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
              }}
            >
              <Box>
                <TextField
                  fullWidth
                  label={t("handInput")}
                  value={handInput}
                  onChange={(e) => setHandInput(e.target.value)}
                  placeholder="123m456p789s12344z"
                  helperText={t("handHelp")}
                />
              </Box>
              <Box>
                <Stack spacing={1}>
                  <Typography variant="subtitle1">{t("melds")}</Typography>
                  {melds.map((m) => (
                    <Paper key={m.id} variant="outlined" sx={{ p: 1.5 }}>
                      <Box
                        sx={{
                          display: "grid",
                          gap: 2,
                          alignItems: "center",
                          gridTemplateColumns: { xs: "1fr", md: "repeat(12, 1fr)" },
                        }}
                      >
                        <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 6" } }}>
                          <TextField
                            fullWidth
                            value={m.text}
                            onChange={(e) => updateMeld(m.id, { text: e.target.value })}
                            placeholder={t("meldPlaceholder")}
                          />
                        </Box>
                        <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 3" } }}>
                          {(() => {
                            const parsedMeld = parseMeld(m.text, m.open);
                            if (!parsedMeld || parsedMeld.type !== "kan") {
                              return null;
                            }
                            return (
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={m.open}
                                    onChange={(e) => updateMeld(m.id, { open: e.target.checked })}
                                  />
                                }
                                label={t("kanOpen")}
                              />
                            );
                          })()}
                        </Box>
                        <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 3" } }}>
                          <Button variant="outlined" color="secondary" onClick={() => removeMeld(m.id)}>
                            {t("remove")}
                          </Button>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                  <Button variant="contained" onClick={addMeld}>
                    {t("addMeld")}
                  </Button>
                </Stack>
              </Box>
              <Box>
                <FormControl fullWidth>
                  <InputLabel>{t("seatWind")}</InputLabel>
                  <Select
                    value={seatWind}
                    label={t("seatWind")}
                    onChange={(e) => setSeatWind(e.target.value)}
                  >
                    {["east", "south", "west", "north"].map((w) => (
                      <MenuItem key={w} value={w}>
                        {t(`wind${w[0].toUpperCase()}${w.slice(1)}`)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label={t("winTile")}
                  value={winTileInput}
                  onChange={(e) => setWinTileInput(e.target.value)}
                  placeholder="5m"
                  helperText={t("winTileHelp")}
                />
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                display: "grid",
                gap: 1,
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
              }}
            >
              {[
                { label: t("tsumo"), value: isTsumo, set: setIsTsumo },
                {
                  label: t("riichi"),
                  value: isRiichi,
                  set: (v: boolean) => {
                    setIsRiichi(v);
                    if (v) setIsDoubleRiichi(false);
                  },
                },
                {
                  label: t("doubleRiichi"),
                  value: isDoubleRiichi,
                  set: (v: boolean) => {
                    setIsDoubleRiichi(v);
                    if (v) setIsRiichi(false);
                  },
                },
                { label: t("ippatsu"), value: isIppatsu, set: setIsIppatsu },
                { label: t("rinshan"), value: isRinshan, set: setIsRinshan },
                { label: t("haitei"), value: isHaitei, set: setIsHaitei },
                { label: t("houtei"), value: isHoutei, set: setIsHoutei },
                { label: t("chankan"), value: isChankan, set: setIsChankan },
                { label: t("tenhou"), value: isTenhou, set: setIsTenhou },
                { label: t("chiihou"), value: isChiihou, set: setIsChiihou },
              ].map((opt) => (
                <Box key={opt.label}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={opt.value}
                        onChange={(e) => opt.set(e.target.checked)}
                      />
                    }
                    label={opt.label}
                  />
                </Box>
              ))}
            </Box>
            {parsed.errors.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {parsed.errors.map((e) => (
                  <Typography key={e} color="error">
                    {e}
                  </Typography>
                ))}
              </Box>
            )}
          </Paper>

          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h5">{t("shanten")}</Typography>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
              }}
            >
              {[
                { label: t("standard"), value: shanten.standard },
                { label: t("chiitoi"), value: shanten.chiitoi ?? "N/A" },
                { label: t("kokushi"), value: shanten.kokushi ?? "N/A" },
                { label: t("min"), value: shanten.min },
              ].map((stat) => (
                <Box key={stat.label}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {stat.label}
                    </Typography>
                    <Typography variant="h5">{stat.value}</Typography>
                  </Paper>
                </Box>
              ))}
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">{t("improving")}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {improvements.length === 0
                ? t("noImprove")
                : tilesToDisplay(improvements.map((i) => i.tile))}
            </Typography>
          </Paper>

          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h5">{t("yakuCheck")}</Typography>
            <Divider sx={{ my: 2 }} />
            {yakuResult ? (
              yakuResult.isAgari ? (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle1">{t("yaku")}</Typography>
                    {yakuResult.yakuman.length === 0 && yakuResult.yaku.length === 0 ? (
                      <Typography>{t("noYaku")}</Typography>
                    ) : (
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {yakuResult.yakuman.map((y) => (
                          <Chip
                            key={y.name}
                            label={`${displayYakuName(y.name)} (${yakumanLabel(y.yakuman)})`}
                            color="error"
                          />
                        ))}
                        {yakuResult.yaku.map((y) => (
                          <Chip key={y.name} label={`${displayYakuName(y.name)} (${y.han} ${t("han")})`} />
                        ))}
                        {yakuResult.yakuman.length === 0 && (yakuResult.doraHan ?? 0) > 0 && (
                          <Chip label={`${t("doraChip")} (+${yakuResult.doraHan})`} color="primary" />
                        )}
                      </Stack>
                    )}
                  </Box>
                  <Box>
                    <Typography variant="h5">
                      {yakuResult.yakuman.length > 0
                        ? yakumanLabel(
                          yakuResult.yakuman.reduce((max, y) => Math.max(max, y.yakuman), 1)
                        )
                        : `${yakuResult.yaku.reduce((sum, y) => sum + y.han, 0) + (yakuResult.doraHan ?? 0)} ${t(
                          "han"
                        )}`}{" "}
                      {yakuResult.yakuman.length === 0 && yakuResult.fuRounded !== null
                        ? ` / ${yakuResult.fuRounded} ${t("fu")}${yakuResult.score?.limit ? ` (${t(`limit.${yakuResult.score.limit}`)})` : ""
                        }`
                        : ""}
                    </Typography>
                  </Box>
                  {yakuResult.score && (
                    <Box>
                      <Typography variant="subtitle1">{t("score")}</Typography>
                      {yakuResult.score.tsumo ? (
                        <Typography variant="body2">
                          {lang === "ja"
                            ? yakuResult.score.tsumo.dealerPay === yakuResult.score.tsumo.nonDealerPay
                              ? t("tsumoAll", {
                                points: yakuResult.score.tsumo.dealerPay,
                              })
                              : t("tsumoSplit", {
                                dealer: yakuResult.score.tsumo.dealerPay,
                                nonDealer: yakuResult.score.tsumo.nonDealerPay,
                              })
                            : yakuResult.score.tsumo.dealerPay === yakuResult.score.tsumo.nonDealerPay
                              ? `${t("tsumoEach")} ${yakuResult.score.tsumo.dealerPay} ${t("points")}`
                              : `${t("dealerPay")} ${yakuResult.score.tsumo.dealerPay} / ${t("nonDealerPay")} ${yakuResult.score.tsumo.nonDealerPay}`}
                          {lang === "ja"
                            ? ` / ${t("total")} ${yakuResult.score.tsumo.total + honbaCount * 300 + riichiSticks * 1000}${t("points")}`
                            : ` ${t("total")}: ${yakuResult.score.tsumo.total + honbaCount * 300 + riichiSticks * 1000} ${t("points")}`}
                        </Typography>
                      ) : (
                        <Typography variant="body2">
                          {lang === "ja"
                            ? t("ronPoints", {
                              points: yakuResult.score.ron + honbaCount * 300 + riichiSticks * 1000,
                            })
                            : `${t("ron")}: ${yakuResult.score.ron + honbaCount * 300 + riichiSticks * 1000} ${t(
                              "points"
                            )}`}
                        </Typography>
                      )}
                    </Box>
                  )}
                  {yakuResult.notes.length > 0 && (
                    <Box>
                      {yakuResult.notes.map((n) => (
                        <Typography key={n} color="text.secondary">
                          {n}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Stack>
              ) : (
                <Typography>
                  {t("notComplete")} ({t("totalTiles")}: {totalCount(parsed.totalCounts)})
                </Typography>
              )
            ) : (
              <Typography>
                {parsed.kanCount > 0
                  ? t("enter14WithKan", { count: 14 + parsed.kanCount })
                  : t("enter14")}
              </Typography>
            )}
          </Paper>

          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6">{t("tips")}</Typography>
            <List dense sx={{ mt: 1 }}>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 24 }}>
                  <FiberManualRecordIcon sx={{ fontSize: 8 }} />
                </ListItemIcon>
                <ListItemText primary={t("tip1")} />
              </ListItem>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 24 }}>
                  <FiberManualRecordIcon sx={{ fontSize: 8 }} />
                </ListItemIcon>
                <ListItemText primary={t("tip2")} />
              </ListItem>
            </List>
          </Paper>
        </Stack>
      </Container>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("settingsTitle")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={allowOpenTanyao}
                  onChange={(e) => setAllowOpenTanyao(e.target.checked)}
                />
              }
              label={t("openTanyao")}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={applyKuisagari}
                  onChange={(e) => setApplyKuisagari(e.target.checked)}
                />
              }
              label={t("kuisagari")}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={allowIppatsuUra}
                  onChange={(e) => setAllowIppatsuUra(e.target.checked)}
                />
              }
              label={t("ippatsuUra")}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={redDoraEnabled}
                  onChange={(e) => setRedDoraEnabled(e.target.checked)}
                />
              }
              label={t("redDora")}
            />
            <FormControlLabel
              control={<Switch checked={tsumoFu2} onChange={(e) => setTsumoFu2(e.target.checked)} />}
              label={t("tsumoFu2")}
            />
            <FormControlLabel
              control={<Switch checked={roundTo10Fu} onChange={(e) => setRoundTo10Fu(e.target.checked)} />}
              label={t("roundTo10Fu")}
            />
            <FormControlLabel
              control={<Switch checked={pinfuTsumo20} onChange={(e) => setPinfuTsumo20(e.target.checked)} />}
              label={t("pinfuTsumo20")}
            />
            <FormControlLabel
              control={<Switch checked={kuipinfu30} onChange={(e) => setKuipinfu30(e.target.checked)} />}
              label={t("kuipinfu30")}
            />
            <FormControlLabel
              control={<Switch checked={kiriageMangan} onChange={(e) => setKiriageMangan(e.target.checked)} />}
              label={t("kiriageMangan")}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={allowChiitoiWithQuads}
                  onChange={(e) => setAllowChiitoiWithQuads(e.target.checked)}
                />
              }
              label={t("chiitoiQuads")}
            />
            <FormControl fullWidth>
              <InputLabel>{t("doubleYakuman")}</InputLabel>
              <Select
                value={doubleYakumanRule}
                label={t("doubleYakuman")}
                onChange={(e) => setDoubleYakumanRule(e.target.value as "single" | "double" | "triple")}
              >
                <MenuItem value="single">{t("single")}</MenuItem>
                <MenuItem value="double">{t("double")}</MenuItem>
                <MenuItem value="triple">{t("triple")}</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={paoEnabled}
                  onChange={(e) => setPaoEnabled(e.target.checked)}
                />
              }
              label={t("pao")}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>{t("close")}</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}

export default App;
