import json
import boto3
import traceback

# 変数
s3_bucket = "cm-kasama-test"
s3_key = "transcribe_src/json/cm-kasama-transcribe-test.json"
region = "ap-northeast-1"
encode = "utf-8"
# client
s3_client = boto3.client("s3", region_name=region)
bedrock_client = boto3.client("bedrock-runtime", region_name=region)


def split_into_chunks(text, max_chars):
    return [text[i : i + max_chars] for i in range(0, len(text), max_chars)]


def invoke_bedrock_model(prompt):
    body = json.dumps(
        {
            "inputText": prompt,
            "textGenerationConfig": {
                "maxTokenCount": 1000,
                "temperature": 0.7,
                "topP": 0.9,
            },
        }
    )
    response = bedrock_client.invoke_model(
        body=body,
        contentType="application/json",
        accept="application/json",
        modelId="amazon.titan-text-express-v1",
    )
    response_body = json.loads(response.get("body").read())
    return response_body["results"][0]["outputText"]


def summarize_chunk(chunk):
    prompt = f"以下の会議の一部を要約してください：\n\n{chunk}"
    response = invoke_bedrock_model(prompt)
    return response


def create_final_minutes(combined_summary):
    prompt = f"""
    会議の記録です:{combined_summary}
    上記の記録から以下の項目を含む議事録をMarkdown記法で作成してください。
    各項目には具体的な内容を箇条書きで記載してください。内容が不明確な場合は「明確な記載なし」と書いてください。

    1. 参加者
    2. 会議テーマ
    3. 決定事項
    4. 懸念事項
    5. その他の重要ポイント

    各項目の内容が空の場合は「なし」と記載してください。
    """

    response = invoke_bedrock_model(prompt)
    return response


def minutes_function(transcript):
    try:
        # およそ2000トークンに相当する8000文字ごとに分割
        chunks = split_into_chunks(transcript, 8000)

        # 分割した単位ごとに要約
        summaries = []
        for chunk in chunks:
            summary = summarize_chunk(chunk)
            summaries.append(summary)
        # 結合した要約を作成
        combined_summary = "\n\n".join(summaries)

        print("combined_summary:", combined_summary)
        # 結合した要約から議事録を作成
        minutes = create_final_minutes(combined_summary)

        return minutes

    except Exception as e:
        return {"statusCode": 500, "body": str(e)}


def create_minutes_function(date_and_time, contents):
    print("contents:", contents)
    # 文章整形
    content = f"""
# 議事録
        
## 日時:
{date_and_time}

{contents}
    """

    # ファイルの作成とアップロード
    file_name = "minutes/minutes-test.md"
    markdown_encode = content.encode(encode)
    s3_client.put_object(Bucket=s3_bucket, Key=file_name, Body=markdown_encode)


def lambda_handler(event, context):
    try:
        # S3からファイルを読み取る
        response = s3_client.get_object(Bucket=s3_bucket, Key=s3_key)
        file_content = response["Body"].read().decode("utf-8")
        minutes_job = json.loads(file_content)

        # 議事内容の取得
        transcript = minutes_job["results"]["transcripts"][0]["transcript"]

        # 日付の処理
        meeting_date = s3_client.head_object(Bucket=s3_bucket, Key=s3_key)
        date_and_time = meeting_date["LastModified"]

        # 議事をbedrockで処理する
        minutes_ja = minutes_function(transcript)

        # 議事録作成
        create_minutes_function(date_and_time, minutes_ja)

        return {"statusCode": 200, "body": "議事録を作成しました。"}
    except Exception as e:
        error_message = f"エラーが発生しました: {str(e)}\n"
        error_message += f"詳細なスタックトレース:\n{traceback.format_exc()}"
        print(error_message)  # CloudWatch Logsにエラー詳細を出力
        return {"statusCode": 500, "body": error_message}
