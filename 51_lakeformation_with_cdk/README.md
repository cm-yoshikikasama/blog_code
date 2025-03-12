# 51_lakeformation_with_cdk

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
npx cdk deploy --all --require-approval never --profile <YOUR_AWS_PROFILE>
```
