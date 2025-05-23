# 54_dms_serverless

## 事前準備

sns topic は事前に作成しておく

## デプロイ手順

1. VPC・サブネット・RDS 用セキュリティグループ・RDS サブネットグループの作成
   - `cloudformation/vpc.yaml` をデプロイ
2. RDS インスタンスの作成
   - `cloudformation/rds.yaml` をデプロイ
3. DMS 用 IAM ロールの作成
   - `cloudformation/IAM.yaml` をデプロイ
4. CDK による DMS Serverless リソースのデプロイ
   - `cdk` ディレクトリで `npm install` 実行
   - `cdk deploy` を実行

※ 事前に SNS トピック（例: cm-kasama-dms-error-topic）を作成しておくこと。

## sample データ挿入

```txt
mysql -h <RDS インスタンスのエンドポイント> -u admin -p
```

```sql

CALL mysql.rds_set_configuration('binlog retention hours', 48);
CREATE DATABASE sample_db;

CREATE TABLE sample_db.products (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int NOT NULL DEFAULT '0',
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

INSERT INTO sample_db.products (name, category, price, stock, description) VALUES
('MacBook Pro', 'Electronics', 1999.99, 50, 'Apple MacBook Pro with M2 chip'),
('iPhone 15', 'Mobile', 999.99, 100, 'Latest iPhone model with 128GB storage'),
('AirPods Pro', 'Audio', 249.99, 200, 'Wireless noise-cancelling earbuds'),
('iPad Air', 'Tablet', 599.99, 75, '10.9-inch display with 64GB storage'),
('Apple Watch', 'Wearable', 399.99, 120, 'Series 8 with health monitoring features'),
('Magic Mouse', 'Accessories', 79.99, 150, 'Wireless mouse for Mac'),
('Magic Keyboard', 'Accessories', 99.99, 100, 'Wireless keyboard with numeric keypad'),
('HomePod Mini', 'Smart Home', 99.99, 80, 'Smart speaker with Siri'),
('AirTag', 'Accessories', 29.99, 300, 'Item tracker'),
('Apple TV 4K', 'Entertainment', 179.99, 60, 'Streaming device with 4K HDR support'),
('MacBook Air M3', 'Electronics', 1299.99, 75, 'Apple MacBook Air with M3 chip and 13-inch display'),
('MacBook Air M4', 'Electronics', 1299.99, 75, 'Apple MacBook Air with M4 chip and 13-inch display'),
('MacBook air 2028', 'Electronics', 2499.99, 30, 'Latest generation MacBook Pro with enhanced performance and display.');

```
