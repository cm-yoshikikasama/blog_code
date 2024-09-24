# syntax=docker/dockerfile:1
FROM debian:bookworm-slim

# バージョンの指定
ARG PYTHON_VERSION=3.12.0
ARG NODE_VERSION=20.17.0
ARG TARGETARCH


# 環境変数の設定
ENV VIRTUAL_ENV=/opt/venv
ENV DEBIAN_FRONTEND=noninteractive
ENV PATH="/usr/local/bin:$VIRTUAL_ENV/bin:$PATH"

# APTキャッシュの設定
RUN rm -f /etc/apt/apt.conf.d/docker-clean; \
    echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache

# 基本的なシステムパッケージのインストール
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    zlib1g-dev \
    libncurses5-dev \
    libgdbm-dev \
    libnss3-dev \
    libssl-dev \
    libsqlite3-dev \
    libreadline-dev \
    libffi-dev \
    libbz2-dev \
    bash \
    jq \
    unzip \
    tree \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Pythonのインストール
RUN --mount=type=cache,target=/root/.cache/pip \
    curl -O https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tar.xz \
    && tar -xf Python-${PYTHON_VERSION}.tar.xz -C /tmp \
    && cd /tmp/Python-${PYTHON_VERSION} \
    && ./configure --enable-optimizations \
    && make -j $(nproc) \
    && make altinstall \
    && cd / \
    && rm -f Python-${PYTHON_VERSION}.tar.xz \
    && rm -rf /tmp/Python-${PYTHON_VERSION} 
    
# 仮想環境の作成とpipのアップグレード
RUN --mount=type=cache,target=/root/.cache/pip \
    python${PYTHON_VERSION%.*} -m venv $VIRTUAL_ENV \
    && . $VIRTUAL_ENV/bin/activate \
    && pip install --upgrade pip

# Node.jsのインストール
RUN case ${TARGETARCH} in \
        "amd64") NODE_ARCH="x64" ;; \
        "arm64") NODE_ARCH="arm64" ;; \
        *) echo "Unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac && \
    curl -fsSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz | tar -xJ -C /usr/local --strip-components=1 \
    && npm install -g npm@latest

# 環境変数の設定
ENV PATH="/usr/local/bin:$VIRTUAL_ENV/bin:$PATH"


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

# 作業ディレクトリの設定
WORKDIR /workspace

# デフォルトのシェルをbashに設定
SHELL ["/bin/bash", "-c"]


# コンテナ起動時のデフォルトコマンド
CMD ["/bin/bash"]
