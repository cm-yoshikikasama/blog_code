import os
import openai
import streamlit as st


openai.api_key = os.getenv("OPENAI_API_KEY")


def main():
    st.title("ChatGPT by Streamlit")  # タイトルの設定
    selected_model = st.selectbox("chatgpt model", ["gpt-3.5-turbo", "gpt-4"])
    if selected_model:
        st.session_state["openai_model"] = selected_model

    # セッション内のメッセージが指定されていない場合のデフォルト値
    if "messages" not in st.session_state:
        st.session_state.messages = []

    # セッション内でチャット履歴をクリアするかどうかの状態変数
    if "Clear" not in st.session_state:
        st.session_state.Clear = False

    # 以前のメッセージを表示
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # ":="はPythonの代入式（代入と比較を一緒に行う）を利用していて、「st.chat_input("What is up?")」
    # という関数の結果が存在すればそれをプロンプトに代入し、
    # その後のif文でそのプロンプトの値がTrueか（つまり何かしら存在する値か）をチェック
    if prompt := st.chat_input("What is up?"):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            message_placeholder = st.empty()  # 一時的なプレースホルダーを作成
            full_response = ""
            # ChatGPTからのストリーミング応答を処理
            for response in openai.chat.completions.create(
                model=st.session_state["openai_model"],
                messages=[{"role": m["role"], "content": m["content"]} for m in st.session_state.messages],
                stream=True,
            ):
                if response.choices[0].delta.content:
                    full_response += response.choices[0].delta.content
                message_placeholder.markdown(full_response + "▌")  # レスポンスの途中結果を表示
            message_placeholder.markdown(full_response)  # 最終レスポンスを表示
        st.session_state.messages.append({"role": "assistant", "content": full_response})
        st.session_state.Clear = True  # チャット履歴のクリアボタンを有効にする

    # チャット履歴をクリアするボタンが押されたら、メッセージをリセット
    if st.session_state.Clear:
        if st.button("clear chat history"):
            st.session_state.messages = []  # メッセージのリセット
            full_response = ""
            st.session_state.Clear = False  # クリア状態をリセット
            st.experimental_rerun()  # 画面を更新


if __name__ == "__main__":
    main()
