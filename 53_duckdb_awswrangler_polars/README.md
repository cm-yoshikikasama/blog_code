# 53_duckdb_awswrangler_polars

## Test Data Preparetion

```txt
pip install pandas
```

```txt
cd make_test_data
# 100MBのファイル
python create_test_csv.py small_sample.csv 922000
aws s3 mv small_sample.csv s3://<YOUR_S3_BUCKET>/src/ --profile <YOUR_AWS_PROFILE>
# 1GBのファイル
python test.py 1gb_sample.csv 9443000
aws s3 mv 1gb_sample.csv s3://<YOUR_S3_BUCKET>/src/ --profile <YOUR_AWS_PROFILE>

# 3GBのファイル
python create_test_csv.py medium_sample.csv 28300000
aws s3 mv medium_sample.csv s3://<YOUR_S3_BUCKET>/src/ --profile <YOUR_AWS_PROFILE>

# 6GBのファイル
python create_test_csv.py large_sample.csv 56600000
aws s3 mv large_sample.csv s3://<YOUR_S3_BUCKET>/src/ --profile <YOUR_AWS_PROFILE>
```

## Install

package.jsonがあるディレクトリでinstall

```txt
npm install
```

## Deploy Command

cdk.jsonがあるディレクトリで実行

```txt
npx cdk synth --profile <YOUR_AWS_PROFILE>
```

```txt
npx cdk deploy --all --require-approval --profile <YOUR_AWS_PROFILE>
```
