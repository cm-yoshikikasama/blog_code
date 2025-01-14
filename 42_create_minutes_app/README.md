# 議事録作成ツール

会議の録画（MP4）から自動で議事録を作成するPythonツールです。Google Cloud VertexAI の Gemini Pro を利用して、音声の文字起こしと議事録の作成を行います。

## 機能

- MP4動画からMP3音声への変換
- 音声からテキストへの文字起こし（Gemini Pro使用）
- 文字起こしテキストから構造化された議事録の作成（Gemini Pro使用）

## 前提条件

- Python 3.12
- Google Cloudアカウント

## セットアップ手順

### 1. Google Cloud Consoleでの初期設定

1. **Google Cloud Console**にアクセス

   ```text
   https://console.cloud.google.com/
   ```

2. **プロジェクトの作成**
   - 画面上部の「プロジェクトの選択」→「新しいプロジェクト」
   - プロジェクト名を入力して「作成」

### 2. Vertex AI APIの有効化

1. 左側メニュー→「APIとサービス」→「APIライブラリ」を選択
2. 検索バーに "Vertex AI API" と入力
3. Vertex AI APIを選択し、「有効にする」をクリック

### 3. サービスアカウントの設定

1. 左側メニュー→「IAMと管理」→「サービスアカウント」を選択
2. 「サービスアカウントを作成」をクリック
3. 基本情報の入力：
   - サービスアカウント名: `vertex-ai-account`
   - 説明: 「Vertex AI用のサービスアカウント」
4. 権限の付与：
   - `Vertex AI User`
   - `Vertex AI Service Agent`

### 4. 認証キーの作成

1. 作成したサービスアカウントを選択
2. 「キー」タブ→「鍵を追加」→「新しい鍵を作成」
3. JSONを選択して作成
4. ダウンロードされたJSONファイルを`vertex-ai-key.json`として保存

### 5. 環境構築

```bash
# Python 3.12のインストール
pyenv install 3.12
pyenv local 3.12

# Poetry環境のセットアップ
poetry env use python3.12
poetry install
poetry shell
```


必要なPython バージョン：
- Python 3.12以上が必要

### 6. 環境変数の設定

`.env`ファイルをプロジェクトルートに作成：

```env
PROJECT_ID=your-project-id
REGION=us-central1
FILE_NAME=your-file-name
GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json
```

## 使用方法

1. **入力ファイルの準備**
   - MP4ファイルを`input`ディレクトリに配置
   - ファイル名は環境変数`FILE_NAME`と一致させる

2. **プロンプトの設定**
   - `input/prompt.md`に議事録作成用のプロンプトを記述

3. **実行**
   ```bash
   python main.py
   ```

4. **出力**
   - 議事録は`output`ディレクトリに`{FILE_NAME}_minutes.md`として保存

## ディレクトリ構造

```
.
├── input/
│   ├── prompt.md
│   └── meeting.mp4
├── output/
│   └── meeting_minutes.md
├── tmp/
├── main.py
├── vertex-ai-key.json
├── .env
└── README.md
```

## 参考リンク

- https://zenn.dev/ubie_dev/articles/34a12124564cb2
- https://zenn.dev/ubie_dev/articles/26a97f8cddbf80?redirected=1
- https://techblog.enechain.com/entry/designing-a-multi-llm-workflow-for-efficient-meeting-summarization
- https://techblog.enechain.com/entry/transcription-using-gemini-and-cloud-speech-to-text
- https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/audio-understanding?hl=ja
- https://ai.google.dev/pricing?hl=ja#1_0pro
- https://cloud.google.com/blog/ja/products/ai-machine-learning/gemini-support-on-vertex-ai
  - データは学習しない
