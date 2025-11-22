# ビルドステージ
FROM golang:1.24-bookworm AS builder

WORKDIR /build

# Go環境変数の設定
ENV CGO_ENABLED=1
ENV GOOS=linux
ENV GOARCH=arm64

# 依存関係のキャッシュ
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# ソースコードのコピー
COPY . .

RUN go build \
    -tags="lambda.norpc duckdb_arrow" \
    -ldflags="-s -w" \
    -trimpath \
    -o bootstrap \
    main.go

# 実行ステージ
FROM public.ecr.aws/lambda/provided:al2023

# バイナリのコピー
COPY --from=builder /build/bootstrap ${LAMBDA_RUNTIME_DIR}/bootstrap

CMD ["bootstrap"]
