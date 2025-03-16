import streamlit as st
import json
import _snowflake
from snowflake.snowpark.context import get_active_session
import pandas as pd
import altair as alt

session = get_active_session()

API_ENDPOINT = "/api/v2/cortex/agent:run"
API_TIMEOUT = 10000  # in milliseconds

CORTEX_SEARCH_SERVICES = "travel_intelligence.data.travel_review_search"
SEMANTIC_MODELS = "@travel_intelligence.data.models/booking_metrics_model.yaml"
SQL_MODEL = "llama3.1-70b"
ANSWER_MODEL = "llama3.1-70b"

st.set_page_config(page_title="旅行データアシスタント", page_icon="✈️")


def run_snowflake_query(query):
    """
    Snowflakeにクエリを実行し、結果を返す関数

    引数:
        query (str): 実行するSQLクエリ

    戻り値:
        DataFrame: クエリ結果のデータフレーム、エラー時はNone
    """
    try:
        return session.sql(query.replace(";", ""))
    except Exception as e:
        st.error(f"SQLエラー: {str(e)}")
        return None


def snowflake_api_call(query: str, model, limit: int = 5):
    """
    Cortex Agent APIを呼び出し、自然言語クエリを処理する関数

    引数:
        query (str): ユーザーからの自然言語クエリ
        limit (int): 検索結果の最大件数

    戻り値:
        dict: APIレスポンス、エラー時はNone
    """
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": [{"type": "text", "text": query}]}],
        "tools": [
            # SQL生成ツール
            {"tool_spec": {"type": "cortex_analyst_text_to_sql", "name": "analyst1"}},
            # 検索ツール
            {"tool_spec": {"type": "cortex_search", "name": "search1"}},
        ],
        "tool_resources": {
            "analyst1": {"semantic_model_file": SEMANTIC_MODELS},
            "search1": {
                "name": CORTEX_SEARCH_SERVICES,
                "max_results": limit,
                "id_column": "review_id",
            },
        },
    }

    try:
        resp = _snowflake.send_snow_api_request(
            "POST", API_ENDPOINT, {}, {}, payload, None, API_TIMEOUT
        )

        if resp["status"] != 200:
            st.error(f"❌ HTTPエラー: {resp['status']}")
            st.error(f"エラー詳細: {resp.get('reason', 'なし')}")
            st.error(f"レスポンス内容: {resp.get('content', 'なし')}")
            return None

        return json.loads(resp["content"])

    except Exception as e:
        st.error(f"リクエストエラー: {str(e)}")
        return None


def process_sse_response(response):
    """
    APIからのレスポンスを処理し、テキスト、SQL、引用情報を抽出する関数

    引数:
        response (dict): APIレスポンス

    戻り値:
        tuple: (テキスト回答, 生成されたSQL, 引用情報のリスト)
    """
    text, sql, citations = "", "", []

    if not response or isinstance(response, str):
        return text, sql, citations

    try:
        for event in response:
            if event.get("event") == "message.delta":
                data = event.get("data", {})
                delta = data.get("delta", {})

                for content_item in delta.get("content", []):
                    content_type = content_item.get("type")
                    if content_type == "tool_results":
                        tool_results = content_item.get("tool_results", {})
                        if "content" in tool_results:
                            for result in tool_results["content"]:
                                if result.get("type") == "json":
                                    text += result.get("json", {}).get("text", "")
                                    search_results = result.get("json", {}).get(
                                        "searchResults", []
                                    )
                                    for search_result in search_results:
                                        citations.append(
                                            {
                                                "source_id": search_result.get(
                                                    "source_id", ""
                                                ),
                                                "doc_id": search_result.get(
                                                    "doc_id", ""
                                                ),
                                            }
                                        )
                                    sql = result.get("json", {}).get("sql", "")
                    if content_type == "text":
                        text += content_item.get("text", "")
    except Exception as e:
        st.error(f"処理エラー: {str(e)}")

    return text, sql, citations


def main():
    """
    main：Streamlitアプリケーションのユーザーインターフェースと処理フローを定義
    """
    st.title("✈️ 旅行データ分析アシスタント")

    # サイドバー
    with st.sidebar:
        if st.button("新しい会話"):
            st.session_state.messages = []
            st.rerun()

        st.markdown("### 質問例")
        st.markdown("""
        - 沖縄のホテルで最も評価の高いところはどこ？
        - 富士山が見える高級旅館のレビューを教えてください。
        - 家族旅行とビジネス旅行の予約金額を比較してください。
        - キャンセル率が高い旅行タイプを比較してください。
        """)

    # セッション状態の初期化
    if "messages" not in st.session_state:
        st.session_state.messages = []

    # 過去のメッセージを表示
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # ユーザー入力
    if query := st.chat_input("旅行データについて質問してください"):
        # ユーザーメッセージをチャットに追加
        with st.chat_message("user"):
            st.markdown(query)
        st.session_state.messages.append({"role": "user", "content": query})

        # APIからレスポンスを取得
        with st.spinner("処理中..."):
            response = snowflake_api_call(query, SQL_MODEL)
            text, sql, citations = process_sse_response(response)

            # アシスタントの応答をチャットに追加
            if text:
                text = text.replace("【†", "[").replace("†】", "]")
                st.session_state.messages.append({"role": "assistant", "content": text})

                with st.chat_message("assistant"):
                    st.markdown(text)

                    # 引用がある場合は表示
                    if citations:
                        with st.expander("参照レビュー"):
                            for i, citation in enumerate(citations):
                                doc_id = citation.get("doc_id", "")
                                if doc_id:
                                    query = f"""
                                    SELECT * FROM travel_intelligence.data.travel_reviews 
                                    WHERE review_id = '{doc_id}'
                                    """
                                    result = run_snowflake_query(query)
                                    if result is not None:
                                        st.dataframe(result.to_pandas())

            # SQLが存在する場合は実行
            if sql:
                with st.expander("生成されたSQL"):
                    st.code(sql, language="sql")

                results = run_snowflake_query(sql)
                if results is not None:
                    df = results.to_pandas()

                    # 数値カラムを適切に変換
                    for col in df.columns:
                        if col in ["rating", "booking_value"]:
                            df[col] = pd.to_numeric(df[col], errors="coerce")

                    st.dataframe(df)

                    # データの可視化（シンプルな棒グラフ）
                    if len(df) > 0 and len(df.columns) >= 2:
                        numeric_cols = df.select_dtypes(
                            include=["number"]
                        ).columns.tolist()
                        if numeric_cols:
                            category_cols = [
                                col for col in df.columns if col not in numeric_cols
                            ]
                            if category_cols:
                                chart = (
                                    alt.Chart(df)
                                    .mark_bar()
                                    .encode(
                                        x=category_cols[0],
                                        y=numeric_cols[0],
                                        color=category_cols[0]
                                        if len(category_cols) > 0
                                        else None,
                                    )
                                    .properties(height=400)
                                )
                                st.altair_chart(chart, use_container_width=True)


if __name__ == "__main__":
    main()
