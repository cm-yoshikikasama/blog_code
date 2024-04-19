import os
import base64
import openai
import requests
import streamlit as st
from PIL import Image

# OpenAI API Key
api_key = os.getenv("OPENAI_API_KEY")


def encode_image(uploaded_file):
    return base64.b64encode(uploaded_file.read()).decode("utf-8")


def get_image_size(image_path):
    # 画像を読み込む
    img = Image.open(image_path)
    # 画像のサイズ（解像度）を取得する
    width, height = img.size
    # 画像のサイズを表示する
    print(f"画像サイズ= {width}px * {height}px")


def post_request(session_state):
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
    if session_state.images:
        image_urls = [
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encode_image(image)}"}}
            for image in session_state.images
        ]

    messages = ([{"role": m["role"], "content": m["content"]} for m in st.session_state.messages],)
    payload = {
        "model": session_state.openai_model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": session_state.user_input,
                    },
                ]
                + image_urls,
            }
        ],
        "max_tokens": 400,
    }

    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
    print("response:", response)
    print(response.json())  # Print the full API response for debugging

    session_state.messages.append({"role": "assistant", "content": response.json()["choices"][0]["message"]["content"]})

    return response.json()["choices"][0]["message"]["content"]


def main():
    st.title("Image upload and API interaction demo")
    selected_model = st.selectbox("chatgpt model", ["gpt-4-vision-preview", "gpt-3.5-turbo", "gpt-4"])
    print("START")
    # 初期化
    if selected_model:
        st.session_state.openai_model = selected_model
    if "messages" not in st.session_state:
        st.session_state.messages = []  # メッセージのリセット
    if "images" not in st.session_state:
        st.session_state.images = []
    # セッション内でチャット履歴をクリアするかどうかの状態変数
    if "Clear" not in st.session_state:
        st.session_state.Clear = False

    # Image upload
    uploaded_files = st.file_uploader(
        "画像をアップロードしてください（複数選択可能）：", type=["png", "jpg", "jpeg", "webp", "gif"], accept_multiple_files=True
    )
    if uploaded_files:
        for uploaded_file in uploaded_files:
            get_image_size(uploaded_file)
            st.session_state.images.append(uploaded_file)
            print("DDdddddd")
            for img in st.session_state.images:
                st.image(img)
    # 以前のメッセージを表示
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    if prompt := st.chat_input("What is up?"):
        st.session_state.messages.append(prompt)

        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            message_placeholder = st.empty()  # 一時的なプレースホルダーを作成
            # ChatGPTからのストリーミング応答を処理
            full_message = post_request(st.session_state)

            message_placeholder.markdown(full_message)  # 最終レスポンスを表示

        st.session_state.messages.append({"role": "assistant", "content": full_message})
        st.session_state.Clear = True  # チャット履歴のクリアボタンを有効にする
    # チャット履歴をクリアするボタンが押されたら、メッセージをリセット
    if st.session_state.Clear:
        print("st.session_state.Clear:", st.session_state.Clear)
        if st.button("clear chat history"):
            st.session_state.messages = []  # メッセージのリセット
            full_message = ""
            uploaded_files = ""
            st.session_state.images = []
            st.session_state.Clear = False  # クリア状態をリセット
            st.experimental_rerun()  # 画面を更新

    print("END")


if __name__ == "__main__":
    main()
