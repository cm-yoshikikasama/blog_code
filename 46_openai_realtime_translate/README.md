# リアルタイム音声翻訳アプリケーション

このアプリケーションは、OpenAI APIを使用してリアルタイムの音声翻訳を行います。ユーザーの日本語音声入力を英語にリアルタイムで翻訳します。

## 機能

- リアルタイム音声入力
- 日本語から英語へのリアルタイム翻訳
- テキスト形式での会話履歴表示

## 必要要件

- Python 3.10以上
- Poetry（パッケージ管理ツール）
- OpenAI APIキー

## 依存パッケージ

- textual
- numpy (>=1.26.0)
- pyaudio
- pydub
- sounddevice
- openai[realtime]
- python-dotenv (>=1.0.1,<2.0.0)

## セットアップ

1. リポジトリをクローン
```bash
git clone [リポジトリURL]
cd 46-create-minutes-realtime
```

2. Poetry環境のセットアップ
```bash
poetry install
```

3. 環境変数の設定
`.env`ファイルをプロジェクトルートに作成し、以下の内容を追加：
```
OPENAI_API_KEY=your_api_key_here
```

## 使用方法

1. アプリケーションの起動
```bash
poetry run python main.py
```

2. 音声入力
- アプリケーション起動後、マイクに向かって日本語で話しかけてください
- 自動的に音声を検知し、英語に翻訳します

3. 終了
- Ctrl+C で終了

## 出力例

```
接続確立: 音声入力を開始します
録音中... Ctrl+Cで終了
User: こんにちは
Assistant: Hello.
User: お元気ですか?
Assistant: How are you?
```

## 注意事項

- 適切なマイク設定が必要です
- OpenAI APIの利用料金が発生します
- 安定したインターネット接続が必要です

## 参考

https://zenn.dev/asap/articles/4368fd306b592a
https://qiita.com/akeyhero/items/fe5bdd02d9a1cd7782d7
https://github.com/openai/openai-python/blob/main/examples/realtime/audio_util.py
