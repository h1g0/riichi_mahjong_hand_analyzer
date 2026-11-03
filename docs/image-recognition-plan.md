# 画像認識機能 実装計画（牌の写真から手牌を読み取る）

調査日: 2026-11-03

## 1. 結論：実装可能

ブラウザ内で完結する画像認識は**実装可能**と判断します。条件と注意点は次のとおりです。

| 観点 | 判断 |
| --- | --- |
| 推論（認識の実行） | **ブラウザ内で完結できる。** `onnxruntime-web`（WebGPU、使えない環境では WASM）で ONNX モデルを実行する。画像はサーバーに送らない。同じ構成の先行例として、ブラウザ内で YOLO を動かして麻雀牌を検出する PWA がある（WebGPU で約 100ms/フレーム、WASM で数百 ms）。 |
| 学習 | ブラウザでは行わない。**ローカル PC または Google Colab（GPU）で事前に学習**し、出来上がった ONNX ファイルをアプリに同梱する。利用者の操作はすべてローカルで完結する。 |
| 精度 | **100% は期待できない。** 先行例の「手牌が全牌正解した割合」は 66〜88% 程度。そのため「認識 → 確認・修正 → 手牌に反映」の流れを UI の前提にする。 |
| アプリ側の改修量 | 小さい。手牌は文字列（例: `123m406p789s11z`）で管理されているため、**認識結果を文字列に変換して `handInput` に入れれば既存の解析ロジックをそのまま使える。**赤5（`0m/0p/0s`）にも対応済み。 |
| 主なリスク | (1) 実際の牌セットや撮影環境での精度、(2) モデルとデータのライセンス（後述。Ultralytics YOLO は AGPL）、(3) iOS Safari の WebGPU 対応が限定的なこと。 |

> 例示いただいた Roboflow のデータセット `riichimahjongdetection/mahjong_huge` は、作業環境のネットワーク制限で中身（画像数・クラス名・ライセンス）を確認できていません。Phase 0 で確認します（§2.3）。

---

## 2. 調査結果

### 2.1 現在のアプリ構成と組み込み先

- Vite + React 19 + MUI。すべてクライアント側で動き、Vercel の静的ホスティングで配信している。
- 手牌と副露は文字列の state（`handInput`, `melds[].text`, `winTileInput`, `doraIndicatorsInput`）で持ち、`parseTiles` / `parseMeld`（`src/mahjong/tiles.ts`）で解析している。
- 牌画像の表示には `TileDisplay` / `MeldDisplay`、牌の選択には `TilePicker`（`src/TilePicker.tsx`）があり、認識結果の確認・修正 UI に流用できる。

### 2.2 ブラウザで推論を動かす仕組み

| 項目 | 内容 |
| --- | --- |
| ライブラリ | `onnxruntime-web`（調査時点の最新は 1.31.1） |
| WASM 版バイナリ | `ort-wasm-simd-threaded.wasm`：14.8MB（gzip 後 3.8MB）※実測 |
| WebGPU 版バイナリ | `ort-wasm-simd-threaded.asyncify.wasm`：28.7MB（gzip 後 7.1MB）※実測 |
| WebGPU の対応状況 | Chrome / Edge は対応。Safari は iOS 18 以降で限定的な対応。使えない環境では WASM に切り替える。 |
| マルチスレッド WASM | cross-origin isolation（COOP/COEP ヘッダ）が必要。`vercel.json` で付与する。付与しない場合はシングルスレッドで動く。 |

TensorFlow.js や MediaPipe も選択肢ですが、PyTorch で学習したモデルの書き出し先として最も一般的で、WebGPU と WASM の両方に対応している ONNX Runtime Web を採用します。

### 2.3 学習データの候補

| データセット | 規模 / クラス | ライセンス | 用途・備考 |
| --- | --- | --- | --- |
| Roboflow `riichimahjongdetection/mahjong_huge`（例示いただいたもの） | 未確認 | 未確認 | Phase 0 で画像数・クラス体系・ライセンスを確認する |
| Roboflow HUST「Riichi Mahjong」 | 256枚 / 34クラス | CC BY 4.0 | 日本式（リーチ麻雀）の34種 |
| Roboflow project-xv49e「mahjong」 | 6,810枚 / 34クラス | CC BY 4.0（検索結果による。要確認） | 規模が大きい。クラス名の確認が必要 |
| Roboflow computervision-cvfl2「RiichiMahjong」 | 786枚 | 要確認 | 日本式 |
| Roboflow mobile-project「mahjong」 | 328枚（`1m/1p/1s` 形式のクラス名） | 要確認 | |
| Roboflow「Mahjong v2」 | 11,921枚（生データ）/ 42クラス | CC BY 4.0 | 中国式（花牌あり、赤5なし）。牌の位置検出と、34種への読み替え後の分類に使える |
| Roboflow「Mahjong Vision」/「Chinese Mahjong Detection」 | 43 / 42クラス | パブリックドメイン / CC BY 4.0 | 中国式。用途は上と同じ |
| [FluffyStuff/riichi-mahjong-tiles](https://github.com/FluffyStuff/riichi-mahjong-tiles) | 牌のベクター画像 | **CC0** | **合成データの素材**（特に赤5のように実データが少ない牌の補強） |
| HaseLab/mahjong-models（学習済みモデル） | 領域分割 YOLO + 牌検出 YOLO + ResNet-50 分類（39クラス） | 確認できず（YOLO26 は Ultralytics 製のため AGPL の可能性あり） | 構成の参考にとどめ、モデル自体は使わない |
| lonlonago の 42クラスデータセット | 7,643枚 | 全データの入手は有償スポンサー向け | 使わない |

補足:
- Roboflow Universe からデータを書き出すには、無料アカウントと API キーが必要です。
- CC BY 4.0 のデータを使う場合は、README とアプリ内にクレジット表記が必要です。
- 中国式の牌も、数牌と字牌の図柄は日本の牌とおおむね同じです。そのため牌の位置検出（「牌」1クラス）には全面的に使え、分類にも34種に読み替えて使えます（花牌は除外）。
- この計画では、**ライセンスが確認できないデータは使いません。**
- 既存の牌画像（`src/images/tiles`）は出所とライセンスが不明なので、合成データの素材にはしません。

### 2.4 モデルの選定とライセンス

本リポジトリは MIT ライセンスです。モデルとそのライセンスは次のとおりです。

| モデル | ライセンス | 判断 |
| --- | --- | --- |
| Ultralytics YOLOv8 / YOLO11 / YOLO26 | AGPL-3.0（Ultralytics は学習済みの重みにも AGPL が及ぶと説明している） | **原則として使わない。**同梱すると、配布物全体に AGPL の条件がかかる可能性がある |
| YOLOv9（MIT ライセンスの再実装。[LibreYOLO](https://github.com/roboflow/libreyolo) 経由） | MIT | **検出器の第一候補。**畳み込み主体の構成なので onnxruntime-web で動かすうえでの互換性リスクが低い。ONNX への書き出しにも対応 |
| YOLOX | Apache-2.0 | 検出器の代替候補 |
| RF-DETR | Apache-2.0 | 精度は高いが重い（Small を fp16 にして約 57MB）。ブラウザ向けには大きすぎる |
| D-FINE / DEIMv2 | Apache-2.0 | 軽量だが、GridSample 演算が WebGPU で動くか未確認。Phase 0 の比較対象にとどめる |
| MobileNetV3 / EfficientNet-Lite（torchvision または timm） | BSD-3 / Apache-2.0 | **分類器に使う** |

事前学習済みの重み（COCO や ImageNet で学習したもの）のライセンスも、採用時に個別に確認します。

---

## 3. 方式の設計

### 3.1 2段構成（推奨）

```
撮影画像 ──▶ [段階1] 牌の位置検出（1クラス "tile"）──▶ 牌ごとに切り出し ──▶ [段階2] 牌の種類を分類 ──▶ 並びを解析 ──▶ 手牌文字列
              YOLOv9-t, 入力 640px                                         MobileNetV3, 入力 96×128 程度
                                                                           出力 38クラス:
                                                                           1m–9m, 1p–9p, 1s–9s, 1z–7z,
                                                                           0m, 0p, 0s（赤5）, back（裏向き）
```

1つのモデルで位置と種類を同時に判定する方式（37クラス検出）ではなく、2段構成を推奨する理由は次のとおりです。

1. **データを再利用しやすい。** クラス名の付け方がバラバラな各データセットも、位置検出用には「牌」1クラスにまとめれば全部使える。
2. **分類器の学習データを増やしやすい。** 分類器は切り出した画像で学習するので、合成データ（CC0 の牌画像）や自分で撮った写真を簡単に追加できる。
3. **赤5を見分けやすい。** 細かい色の違いは、高解像度で切り出した画像のほうが判別しやすい。
4. **修正 UI に活かせる。** 牌ごとに信頼度と候補（上位3つ）が出るので、修正 UI で「候補から選ぶ」操作ができる。

代償としてモデルが2つになりますが、1枚あたりの処理時間は十分短い見込みです。1段構成は Phase 0 で比較対象として試しても構いません。

### 3.2 ブラウザ側の処理の流れ

1. **画像の入力**: `<input type="file" accept="image/*" capture="environment">`（スマホではカメラが起動する）、ドラッグ&ドロップ、クリップボードからの貼り付け。MVP ではカメラのライブ映像は使わない（カメラ使用許可の扱いが面倒なため）。
2. `createImageBitmap` で写真の向き（EXIF 情報）を補正し、Web Worker に渡す（メインスレッドを止めない）。
3. Worker 内で OffscreenCanvas を使い、余白を付けて 640px の正方形に縮小（letterbox）、モデルの入力形式に正規化する。
4. **段階1**: 位置検出を実行し、JS で出力を読み解いて重複する枠を除去する（NMS）。
5. **段階2**: 元の高解像度画像から各枠を少し余白付きで切り出す。横長の枠は縦向きに回転してから、まとめて分類する。
6. **後処理**: 同じ牌が5枚以上になっていないか、赤5が各色1枚以内かを確認し、信頼度の低い牌に印を付ける。
7. **並びの解析**:
   - y 座標で行に分け、x 座標で左から並べる。
   - 間隔の大きいところで塊に分ける。
   - 横向きの牌（枠が横長）を含む塊を副露とみなす。
   - 右端で離れている1枚を和了牌の候補とする。
8. **文字列に変換**: 例 `["1m","2m","3m","0p",...]` → `123m0p...`。

### 3.3 UI

- 「手牌入力」カードに「画像から読み取る」ボタン（カメラアイコン）を追加する。
- ダイアログは「画像を選ぶ → 進行状況（初回はモデルのダウンロード、その後認識中）→ 結果の確認」の流れにする。
  - 写真の上に枠とラベルを重ねて表示する。
  - 認識した牌の並びは `TileDisplay` で表示し、信頼度の低い牌は枠の色で目立たせる。
  - 牌をタップすると候補（上位3つ）と `TilePicker` で修正できる。牌の削除・追加もできる。
- 反映先:
  - MVP: 読み取った牌をすべて手牌に入れる。
  - Phase 3: 副露・和了牌・ドラ表示牌への振り分けを自動で推定し、手動でも変えられるようにする。
- 「画像はサーバーに送信されません」と明記する。
- 文言は日本語・英語の両方を `src/locales/{ja,en}.json` に追加する。

### 3.4 ファイルの配信と読み込み

- **最初の読み込みを重くしない**: `onnxruntime-web` は動的 `import()` で、機能を使うときに初めて読み込む。
- **外部 CDN に頼らない**: wasm と `.onnx` は同じサイトから配信する。モデルは `public/models/` に置き、wasm はビルド時にアセットとして出力して `ort.env.wasm.wasmPaths` で場所を指定する。
- **ダウンロード量の目安**（初回のみ、gzip 後）:

  | ファイル | サイズ |
  | --- | --- |
  | ORT の wasm | 3.8〜7.1MB |
  | 検出モデル（fp16） | 約 4〜8MB |
  | 分類モデル（fp16） | 約 2〜5MB |

- **キャッシュ**: ファイル名にバージョンを入れ、ブラウザの HTTP キャッシュを使う。オフラインで動くようにする（PWA 化）のは Phase 3。
- **`vercel.json`**: COOP/COEP ヘッダ（マルチスレッド WASM 用）と、`/models/*` の長期キャッシュ設定を追加する。

---

## 4. 学習パイプライン（新設する `ml/` ディレクトリ、Python）

```
ml/
├── README.md                 # 環境構築と再現手順
├── requirements.txt          # libreyolo, torch, timm, onnx, onnxruntime, roboflow, albumentations 等
├── configs/
│   └── class_map.yaml        # 各データセットのクラス名 → 共通38クラスの対応表
├── scripts/
│   ├── download_roboflow.py  # API キーは環境変数 ROBOFLOW_API_KEY から読む
│   ├── build_det_dataset.py  # 全データを1クラス(tile)に変換し、統合・重複除去・分割
│   ├── build_cls_dataset.py  # 枠から切り出し、クラス名を読み替え
│   ├── gen_synthetic.py      # CC0 の牌画像で合成（背景・透視変換・照明・ぼかし・影）
│   ├── label_from_hand.py    # 手牌写真と正解文字列から自動でラベル付け（後述）
│   ├── train_detector.py
│   ├── train_classifier.py
│   ├── export_onnx.py        # ONNX 書き出し → fp16 変換 → PyTorch と出力が一致するか検証
│   └── evaluate.py           # 牌ごとの正解率・手牌の完全一致率・混同行列
└── data/                     # .gitignore 対象
```

- **学習環境**: CUDA が使える GPU 付き PC、または Google Colab（無料の T4 でも足りる規模）。この作業環境には GPU がないため、学習の実行はユーザー側の環境で行う。
- **データの分け方**: 撮影元（データセットや撮影日）単位で学習用と評価用に分け、似た画像が両方に入らないようにする。先行例でも、分け方が甘いと評価が甘くなることが指摘されている。
- **評価用データ**: 学習に使っていない牌セット・撮影環境で撮った手牌写真 50〜100 枚に、正解の手牌文字列を付けたもの。
- **ラベル付けを楽にする工夫**: 手牌を撮影して正解の文字列を入力しておけば、検出した枠を x 座標順に並べることで自動的にラベルが付く（検出した枚数と文字列の枚数が一致した場合のみ）。自分の牌で追加データを作る手間が大幅に減る。
- **赤5**: 実データが少ないので、合成データと多めのサンプリングで補う。必要なら「赤い画素の割合」による簡単なルールで確認する仕組みを併用する。

---

## 5. 進め方（フェーズ分け）

### Phase 0：技術検証（PoC）

- 公開されている COCO 学習済みの YOLOv9-t を ONNX にして、`onnxruntime-web` を遅延読み込みで組み込み、次の環境で速度と動作を確認する。
  - PC の Chrome
  - Android の Chrome
  - iOS の Safari
- 例示のデータセットを含む候補データのライセンスとクラス体系を確認し、使うデータを確定する。
- **完了条件**: 3環境すべてで推論が動き、1枚あたり 2 秒以内に終わる。

### Phase 1：学習パイプラインと最初のモデル

- `ml/` の各スクリプトを作り、検出器（1クラス）と分類器（38クラス）を学習する。
- ONNX に書き出し、評価する。
- **完了条件（暫定目標）**: 評価用データで、牌ごとの正解率 95% 以上、手牌の完全一致率 60% 以上。

### Phase 2：アプリへの組み込み（MVP）

- §6 のファイルを実装し、単体テストを書き、`vercel.json` を追加する。
- **完了条件**: スマホで「撮影 → 修正 → 手牌に反映」まで一通り動く。

### Phase 3：精度の改善と機能拡張

- 自分の牌でデータを追加して再学習する（`label_from_hand.py` を使う）。
- 副露・和了牌・ドラ表示牌への自動振り分けと、暗槓（裏向き2枚）の判定。
- カメラのライブ映像での読み取り（`getUserMedia`）。
- PWA 化してオフラインでも動くようにする。
- （任意）ネット麻雀のスクリーンショットへの対応。写真とは性質が違うので、合成データかテンプレートマッチングで別途対応する。

---

## 6. アプリ側の変更ファイル一覧（Phase 2）

| ファイル | 内容 |
| --- | --- |
| `package.json` | `onnxruntime-web` を追加 |
| `src/vision/labels.ts` | クラス ID と牌文字列（`1m`〜`7z`, `0m/0p/0s`, `back`）の対応 |
| `src/vision/preprocess.ts` | 正方形への縮小（letterbox）、切り出し、正規化 |
| `src/vision/postprocess.ts` | YOLO 出力の読み解き、重複枠の除去（NMS）、softmax と上位候補の抽出 |
| `src/vision/layout.ts` | 行への分割、x 座標での整列、塊への分割、横向き判定、和了牌の推定 |
| `src/vision/toHandString.ts` | 認識結果を手牌文字列に変換し、枚数の整合性を確認 |
| `src/vision/recognizer.worker.ts` | ORT のセッション管理と推論（Web Worker） |
| `src/vision/useTileRecognizer.ts` | Worker を呼ぶ React フック（状態: idle / loading-model / running / done / error） |
| `src/vision/models.json` | モデルのバージョン、入力サイズ、クラス一覧、しきい値 |
| `src/ScanDialog.tsx` | 読み取りダイアログの UI |
| `src/App.tsx` | ボタンの追加と結果の反映 |
| `src/locales/{ja,en}.json` | 文言の追加 |
| `src/vision/__tests__/*.test.ts` | postprocess / layout / toHandString の単体テスト（vitest） |
| `public/models/*.onnx` | 学習済みモデル（合計 20MB 未満を目安。超える場合は Git LFS を検討） |
| `vite.config.ts` | Worker を ES モジュール形式にする、`onnxruntime-web` を事前バンドルから除外する等 |
| `vercel.json` | COOP/COEP ヘッダとキャッシュ設定 |
| `README.md` | 機能の説明と、データセット・素材のクレジット（CC BY 4.0 等） |

---

## 7. 評価の指標と参考値

- **指標**: 検出の再現率と適合率、牌ごとの正解率、**手牌の完全一致率**、端末ごとの処理時間。
- **先行例の参考値**:

  | 先行例 | 構成 | 結果 |
  | --- | --- | --- |
  | mahjong-ar | ブラウザ内で YOLO11n、中国式42クラス | 実写1枚で 127/144 枚正解（88%） |
  | mahjong-recognizer | サーバー側で2段構成、中国式42クラス | 手牌の完全一致率：検証用データで 87.8%、未使用のテスト用データで 66.0% |

---

## 8. リスクと対策

| リスク | 対策 |
| --- | --- |
| 実際の環境（牌セット・照明・角度）で精度が足りない | 修正 UI を必須にし、信頼度を表示する。自分の牌の写真を追加して再学習する |
| 牌セットごとの図柄の違い（一索・字牌の書体など） | 複数のデータセットを混ぜ、合成データで図柄のバリエーションを増やす |
| 赤5の見分け | 合成データで補い、色のルールで確認する |
| iOS Safari で WebGPU が使えない・遅い | WASM に切り替える。許容できる速度かを Phase 0 で確認する |
| ダウンロード量が大きい | 遅延読み込み、fp16 化。必要なら int8 量子化する |
| ライセンス（AGPL・CC BY・ライセンス不明データ） | MIT / Apache 系のモデルを使う。クレジットを表記する。ライセンス不明のデータは使わない |
| 評価用データに学習用と似た画像が混ざり、評価が甘くなる | 撮影元単位でデータを分ける |
| ONNX の演算が WebGPU で動かない | 畳み込み主体の検出器を選び、Phase 0 で確認する |

---

## 9. 決めていただきたい事項

1. **対象の画像**: 実物の牌の写真（この計画の前提）だけか、ネット麻雀のスクリーンショットも対象にするか。
2. **MVP で読み取る範囲**: 手牌だけ（推奨）か、副露・ドラ表示牌まで含めるか。
3. **ライセンスの方針**: Ultralytics YOLO（AGPL）は使わない方針でよいか（推奨）。
4. **学習環境**: ローカルの GPU か Google Colab か。Roboflow のアカウントを用意できるか。
5. **自分の牌の写真**: 用意できるか。精度を上げるのに最も効果がある。

---

## 参考にした情報

- 先行例（ブラウザ内 YOLO の PWA）: https://github.com/mikemazzetti/mahjong-ar
- 先行例（2段構成、精度の数値）: https://github.com/XTTTZ/mahjong-recognizer
- 先行例（Android、37クラス体系）: https://github.com/letri6202-arch/tile-master
- HaseLab mahjong-models: https://huggingface.co/HaseLab/mahjong-models
- データセット: https://universe.roboflow.com/riichimahjongdetection/mahjong_huge / https://universe.roboflow.com/hust-xq5rx/riichi-mahjong / https://universe.roboflow.com/project-xv49e/mahjong-x5dzz / https://universe.roboflow.com/computervision-cvfl2/riichimahjong / https://universe.roboflow.com/mobile-project/mahjong-akvjo
- CC0 の牌画像: https://github.com/FluffyStuff/riichi-mahjong-tiles
- LibreYOLO（MIT）: https://github.com/roboflow/libreyolo
- Ultralytics のライセンスに関する説明: https://community.ultralytics.com/t/yolov11-agpl-license-for-on-premises-use/1529
- ONNX Runtime Web の WebGPU: https://onnxruntime.ai/docs/execution-providers/WebGPU-ExecutionProvider.html
- ONNX Runtime Web の性能に関する議論: https://github.com/microsoft/onnxruntime/discussions/33453
