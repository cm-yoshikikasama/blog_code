# syntax=docker/dockerfile:1
FROM debian:bookworm-slim

ARG PYTHON_VERSION=3.12.0

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
    gnupg \
    dirmngr \
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
# dbt, dbt-duckdb, duckdb-cli
RUN --mount=type=cache,target=/root/.cache/pip \
    python${PYTHON_VERSION%.*} -m venv $VIRTUAL_ENV \
    && . $VIRTUAL_ENV/bin/activate \
    && pip install --upgrade pip \
    && pip install dbt-core dbt-duckdb \
    && curl https://install.duckdb.org | sh \
    && chmod +x /root/.duckdb/cli/latest/duckdb \
    && ln -sf /root/.duckdb/cli/latest/duckdb /usr/local/bin/duckdb


# デフォルトのシェルをbashに設定
SHELL ["/bin/bash", "-c"]

# コンテナ起動時のデフォルトコマンド
CMD ["/bin/bash"]

# 作業ディレクトリの設定
WORKDIR /workspaces

# git safe.directory の設定も修正
RUN git config --global --add safe.directory /workspaces
