# syntax=docker/dockerfile:1
FROM debian:bookworm-slim

# バージョンの指定
ARG PYTHON_VERSION=3.11
ARG NODEJS_VERSION=20.16.0
ARG AWS_CDK_VERSION=2.150.0
ARG SERVERLESS_VERSION=3.38.0
ARG AWS_SAM_VERSION=1.120.0

# ターゲットのアーキテクチャ
ARG TARGETARCH

# 環境変数の設定
ENV DEBIAN_FRONTEND=noninteractive
ENV PATH="/root/.local/bin:${PATH}"

# APTキャッシュの設定
RUN rm -f /etc/apt/apt.conf.d/docker-clean; \
    echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache

# 基本的なシステムパッケージのインストール
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install --no-install-recommends -y \
    curl \
    gnupg \
    lsb-release \
    software-properties-common \
    bash \
    jq \
    unzip \
    git

# Pythonのインストール
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install --no-install-recommends -y \
    python${PYTHON_VERSION} \
    python3-pip \
    python3-venv \
    && python3 -m venv /opt/venv

# 仮想環境を有効化
ENV PATH="/opt/venv/bin:$PATH"

# Node.jsのインストール
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    curl -fsSL https://deb.nodesource.com/setup_${NODEJS_VERSION%%.*}.x | bash - \
    && apt-get update \
    && apt-get install --no-install-recommends -y nodejs=${NODEJS_VERSION}-1nodesource1 \
    && npm install -g npm@latest

# AWS CLIのインストール
RUN case ${TARGETARCH} in \
        "amd64") \
            AWS_CLI_URL="https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" ;; \
        "arm64") \
            AWS_CLI_URL="https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" ;; \
        *) \
            echo "Unsupported architecture: ${TARGETARCH}" >&2; \
            exit 1 ;; \
    esac && \
    curl "${AWS_CLI_URL}" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf aws awscliv2.zip

# AWS CDK, Typescript, AWS SAM, Serverless Frameworkのインストール
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    --mount=type=cache,target=/root/.cache/pip,sharing=locked \
    npm install -g typescript aws-cdk@${AWS_CDK_VERSION} serverless@${SERVERLESS_VERSION} \
    && pip3 install aws-sam-cli==${AWS_SAM_VERSION}

# 作業ディレクトリの設定
WORKDIR /workspace

# デフォルトのシェルをbashに設定
SHELL ["/bin/bash", "-c"]

# Git の安全性設定を追加
RUN git config --system --add safe.directory /workspace


# コンテナ起動時のデフォルトコマンド
CMD ["/bin/bash"]
