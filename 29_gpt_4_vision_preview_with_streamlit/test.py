import os
import base64
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


def post_request(user_input, images):
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
    image_urls = [
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encode_image(image)}"}} for image in images
    ]
    payload = {
        "model": "gpt-4-vision-preview",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": user_input,
                    },
                ]
                + image_urls,
            }
        ],
        "max_tokens": 300,
    }

    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)

    print(response.json())  # Print the full API response for debugging

    st.session_state.messages.append(
        {"role": "assistant", "content": response.json()["choices"][0]["message"]["content"]}
    )

    return response.json()["choices"][0]["message"]["content"]


def main():
    st.title("Image upload and API interaction demo")
    print("START")
    # 初期化
    if "run" not in st.session_state:
        st.session_state.run = False
    if "user_input" not in st.session_state:
        st.session_state.user_input = ""
    if "messages" not in st.session_state:
        system_prompt = "Chatbotです。何でも聞いてください。"
        st.session_state.messages = [{"role": "system", "content": system_prompt}]
    if "images" not in st.session_state:
        st.session_state.images = []

    if st.session_state.run:
        response = post_request(st.session_state.user_input, st.session_state.images)
        st.session_state.messages.append({"role": "assistant", "content": response})
        st.session_state.run = False

    # User text input
    user_input = st.text_input("ここにメッセージを入力してください：")
    st.session_state.user_input = user_input

    # Image upload
    uploaded_files = st.file_uploader(
        "画像をアップロードしてください（複数選択可能）：", type=["png", "jpg", "jpeg", "webp", "gif"], accept_multiple_files=True
    )
    for uploaded_file in uploaded_files:
        get_image_size(uploaded_file)
        st.session_state.images.append(uploaded_file)

    if st.button("入力"):
        st.session_state.run = True

    for message in st.session_state.messages[1:]:
        if message["role"] == "assistant":
            speaker = "Chatbot"
        else:
            speaker = "User"

        st.write(speaker + ": " + message["content"])

    for img in st.session_state.images:
        st.image(img)
    print("END")


if __name__ == "__main__":
    main()
