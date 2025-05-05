# 55_rds_to_duckdb

## システム構築・データ検証手順

### 1. mysql_account_vpc のデプロイ

- `mysql_account_vpc` の CloudFormation テンプレート等を用いて VPC を作成します。

### 2. RDS のデプロイ（mysql_account）

- 上記 VPC 内に RDS（MySQL）インスタンスをデプロイします。
- 必要に応じてサブネットグループやセキュリティグループも作成します。

### 3. bastion_vpc のデプロイ（bastion_account）

- `bastion_vpc` の CloudFormation テンプレート等を用いて、別アカウントまたは同アカウントに VPC を作成します。
- Bastion 用 EC2 や CloudShell を利用する場合は、パブリックサブネットも用意します。

### 4. VPC Peering の設定

- `mysql_account_vpc` と `bastion_vpc` 間で VPC Peering 接続を作成します。
- 片方からリクエスト、もう片方で承認します。

### 5. ルートテーブルの変更

- 両 VPC のルートテーブルに、相手 VPC の CIDR 宛のルートを VPC Peering 経由で追加します。

### 6. RDS のセキュリティグループに Bastion SG を追加

- RDS のセキュリティグループのインバウンドルールに、Bastion 側の SG からの MySQL(3306)アクセスを許可します。

---

### 7. 【mysql_account】CloudShell から RDS へテーブル作成・データ挿入

```sh
mysql -h <RDSエンドポイント> -u <ユーザー名> -p
```

```sql
CREATE DATABASE sample_db;

CREATE TABLE sample_db.products (
  id INT,
  name VARCHAR(255),
  category VARCHAR(255),
  price INT,
  stock INT,
  description TEXT,
  created_at VARCHAR(32)
);

INSERT INTO sample_db.products (id, name, category, price, stock, description, created_at) VALUES
(1, 'MacBook Pro', 'Electronics', 1999, 50, 'Apple MacBook Pro with M2 chip', '2025-05-04 12:21:11'),
(2, 'iPhone 15', 'Mobile', 999, 100, 'Latest iPhone model with 128GB storage', '2025-05-04 12:21:11'),
(3, 'AirPods Pro', 'Audio', 249, 200, 'Wireless noise-cancelling earbuds', '2025-05-04 12:21:11'),
(4, 'iPad Air', 'Tablet', 599, 75, '10.9-inch display with 64GB storage', '2025-05-04 12:21:11'),
(5, 'Apple Watch', 'Wearable', 399, 120, 'Series 8 with health monitoring features', '2025-05-04 12:21:11'),
(6, 'Magic Mouse', 'Accessories', 79, 150, 'Wireless mouse for Mac', '2025-05-04 12:21:11'),
(7, 'Magic Keyboard', 'Accessories', 99, 100, 'Wireless keyboard with numeric keypad', '2025-05-04 12:21:11'),
(8, 'HomePod Mini', 'Smart Home', 99, 80, 'Smart speaker with Siri', '2025-05-04 12:21:11'),
(9, 'AirTag', 'Accessories', 29, 300, 'Item tracker', '2025-05-04 12:21:11'),
(10, 'Apple TV 4K', 'Entertainment', 179, 60, 'Streaming device with 4K HDR support', '2025-05-04 12:21:11'),
(11, 'MacBook Air M3', 'Electronics', 1299, 75, 'Apple MacBook Air with M3 chip and 13-inch display', '2025-05-04 12:21:11'),
(12, 'MacBook Air M4', 'Electronics', 1299, 75, 'Apple MacBook Air with M4 chip and 13-inch display', '2025-05-04 12:21:11'),
(13, 'MacBook air 2028', 'Electronics', 2499, 30, 'Latest generation MacBook Pro with enhanced performance and display.', '2025-05-04 12:21:11');
```

### 8. 【bastion_account】S3 に CSV 配置 & CloudShell から DuckDB で RDS/S3 参照・比較

#### 8-1. S3 に CSV ファイル（例: products.csv）を配置

- bastion_account の S3 バケットに `products.csv` をアップロードします。

#### 8-2. CloudShell から DuckDB で RDS/S3 に接続し比較

```sql
-- DuckDBを起動
duckdb

-- MySQL拡張をインストール
INSTALL mysql;
LOAD mysql;

CREATE SECRET my_mysql_secret (
    TYPE mysql,
    HOST '<RDSエンドポイント>',
    PORT 3306,
    DATABASE 'sample_db',
    USER '<ユーザー名>',
    PASSWORD '<パスワード>'
);
ATTACH '' AS rdsdb (TYPE mysql, SECRET my_mysql_secret);

-- テーブル一覧を確認
SHOW ALL TABLES;

-- データをSELECT
SELECT * FROM rdsdb.products;

INSTALL httpfs;
LOAD httpfs;
CREATE SECRET(
    TYPE S3,
    PROVIDER CREDENTIAL_CHAIN
);

SELECT * FROM read_csv('s3://<bucket名>/products.csv', header=true);

-- 差分確認
SELECT * FROM rdsdb.products
EXCEPT
SELECT * FROM read_csv('s3://<bucket名>/products.csv', header=true);

SELECT * FROM read_csv('s3://<bucket名>/products.csv', header=true)
EXCEPT
SELECT * FROM rdsdb.products;
```
