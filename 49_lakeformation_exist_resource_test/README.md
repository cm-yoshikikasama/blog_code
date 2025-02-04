# HR Data Access System Setup Guide

## 前提条件

- AWSマネジメントコンソールにアクセス可能なこと
- 必要なIAM権限があること

## 1. CloudFormationスタックの作成

1. AWSマネジメントコンソールにログイン
2. サービス一覧から「CloudFormation」を選択
3. 「スタックの作成」をクリック
   - 「新しいリソースを使用」を選択
4. テンプレートの準備
   - 「テンプレートファイルのアップロード」を選択
   - ダウンロードしたiam.yamlをアップロード
5. パラメータの入力
   - UserArn: 自分のIAMユーザーARNを入力
   - AthenaQueryBucketName: 任意のバケット名を入力
   - LakeformationBucketName: 任意のバケット名を入力
   - EnvironmentName: 環境名を入力（例：dev）
6. スタックの設定
   - スタック名を入力
   - タグは任意
7. 確認と作成
   - 内容を確認
   - 「スタックの作成」をクリック

## 2. S3バケットの作成とデータ配置

1. AWSコンソールで「S3」を選択
2. 「バケットを作成」をクリック
   - バケット名: CloudFormationで指定したLakeformationBucketNameと同じ名前
   - リージョン: 利用するリージョンを選択
   - その他はデフォルト設定で作成
3. 作成したバケット内に以下のフォルダ構造を作成：

   ```txt
   /cm_kasama_hr_employee/personal_info/
   ```

4. サンプルデータの作成とアップロード
   - ローカルでCSVファイルを作成（employee_data.csv）：

   ```csv
   employee_id,first_name,last_name,department,salary,hire_date
   1,John,Doe,Engineering,80000,2020-01-15
   2,Jane,Smith,Marketing,75000,2019-11-20
   3,Bob,Johnson,Sales,85000,2021-03-01
   ```
  
   - 作成したCSVファイルをS3の `/cm_kasama_hr_employee/personal_info/` にアップロード

## 3. Athenaの設定

1. AWSコンソールで「Athena」を選択
2. クエリエディタで以下のSQLを実行：

   ```sql
   CREATE DATABASE IF NOT EXISTS cm_kasama_hr_employee;

   CREATE EXTERNAL TABLE cm_kasama_hr_employee.personal_info ( 
       employee_id INT, 
       first_name STRING, 
       last_name STRING, 
       department STRING, 
       salary INT, 
       hire_date DATE
   )
   ROW FORMAT DELIMITED
   FIELDS TERMINATED BY ','
   STORED AS TEXTFILE
   LOCATION 's3://[あなたのバケット名]/cm_kasama_hr_employee/personal_info/'
   TBLPROPERTIES ('skip.header.line.count'='1');
   ```

※ [あなたのバケット名] は実際に作成したバケット名に置き換えてください

## 4. 動作確認

1. Athenaクエリエディタで以下のクエリを実行：

   ```sql
   SELECT * FROM cm_kasama_hr_employee.personal_info LIMIT 10;
   ```
