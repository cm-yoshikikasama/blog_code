import os
import ffmpeg
import shutil
import logging
import vertexai
from vertexai.generative_models import GenerativeModel, Part
from dotenv import load_dotenv


# .envファイルの読み込み
load_dotenv()

# ロギングの設定
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger(__name__)
TMP_DIR = "tmp"

# --- 環境変数の設定 ---
PROJECT_ID = os.getenv("PROJECT_ID")
REGION = os.getenv("REGION")
FILE_NAME = os.getenv("FILE_NAME")
INPUT_MP4_FILE_PATH = os.path.join("input", f"{FILE_NAME}.mp4")
PROMPT_TEMPLATE_FILE = os.getenv("PROMPT_TEMPLATE_FILE")
AI_MODEL = "gemini-1.5-pro-001"

# Vertex AI の初期化
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS
vertexai.init(project=PROJECT_ID, location=REGION)


def setup_tmp_directory():
    """一時ディレクトリのセットアップ（クリアと作成）"""
    logger.info("一時ディレクトリをセットアップします...")
    if os.path.exists(TMP_DIR):
        shutil.rmtree(TMP_DIR)
    os.makedirs(TMP_DIR)
    logger.info("一時ディレクトリのセットアップが完了しました")


def convert_mp4_to_mp3(mp4_file, mp3_file):
    logger.info("MP4からMP3への変換を開始します...")
    try:
        (ffmpeg.input(mp4_file).output(mp3_file).run())
        logger.info(f"MP3への変換が完了しました: {mp3_file}")
    except Exception as e:
        logger.error(f"MP3変換中にエラーが発生しました: {e}")
        raise


def transcribe_audio(mp3_file):
    logger.info("音声の文字起こしを開始します...")
    try:
        # Gemini Proモデルの初期化
        model = GenerativeModel(AI_MODEL)

        # 音声ファイルを読み込んでPartとして準備
        with open(mp3_file, "rb") as f:
            audio_data = f.read()
            audio_part = Part.from_data(data=audio_data, mime_type="audio/mp3")

        # プロンプトの準備
        prompt = """
        音声を書き起こしてください。
        読みやすいように句読点や改行を追加し読みやすくしてください。
        """

        # コンテンツの準備とAPIリクエスト
        contents = [audio_part, prompt]

        logger.info("Gemini Pro APIにリクエストを送信中...")
        response = model.generate_content(contents)
        logger.info("文字起こしが完了しました")
        return response.text

    except Exception as e:
        logger.error(f"文字起こし中にエラーが発生しました: {e}")
        raise


def create_minutes(text):
    logger.info("議事録の作成を開始します...")
    try:
        # プロンプトファイルを読み込む
        with open(f"input/{PROMPT_TEMPLATE_FILE}", "r", encoding="utf-8") as f:
            prompt_template = f.read()
        # テキストをプロンプトに組み込む
        prompt = f"会議の記録です:{text}\n{prompt_template}"

        model = GenerativeModel(AI_MODEL)
        response = model.generate_content(
            prompt, generation_config={"temperature": 0.1}
        )
        logger.info("議事録の作成が完了しました")
        return response.text

    except Exception as e:
        logger.error(f"議事録作成中にエラーが発生しました: {e}")
        raise


if __name__ == "__main__":
    try:
        logger.info("処理を開始します...")
        # 入力ファイルの存在確認
        if not os.path.exists(INPUT_MP4_FILE_PATH):
            raise FileNotFoundError(
                f"入力ファイルが見つかりません: {INPUT_MP4_FILE_PATH}"
            )

        # 一時ディレクトリのセットアップ
        setup_tmp_directory()

        # 出力ディレクトリの作成
        os.makedirs("output", exist_ok=True)
        # 一時ファイルのパス設定
        tmp_mp3_file = os.path.join(TMP_DIR, f"{FILE_NAME}.mp3")
        tmp_transcript_file = os.path.join(TMP_DIR, f"{FILE_NAME}.txt")

        # mp4をmp3に変換（一時ファイルとして）
        convert_mp4_to_mp3(INPUT_MP4_FILE_PATH, tmp_mp3_file)

        # mp3をテキストに書き起こし
        transcript = transcribe_audio(tmp_mp3_file)
        logger.info("書き起こしテキストを一時ファイルに保存します...")
        with open(tmp_transcript_file, "w", encoding="utf-8") as f:
            f.write(transcript)
        logger.info(f"テキストファイルを保存しました: {tmp_transcript_file}")

        # 議事録を作成
        minutes = create_minutes(transcript)
        # 議事録をMDファイルとして保存
        minutes_file = os.path.join("output", f"{FILE_NAME}_minutes.md")
        logger.info("議事録をMDファイルとして保存します...")
        with open(minutes_file, "w", encoding="utf-8") as f:
            f.write(minutes)
        logger.info(f"議事録を保存しました: {minutes_file}")

        logger.info("すべての処理が完了しました")

    except Exception as e:
        logger.error(f"処理中にエラーが発生しました: {e}")
        raise
