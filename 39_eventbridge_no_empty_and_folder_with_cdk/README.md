# 39_eventbridge_no_empty_and_folder_with_cdk

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
npx cdk deploy --all --require-approval never -c environment=dev --profile <YOUR_AWS_PROFILE>
```

## TEST Command

jest.config.jsがあるディレクトリで実行

```txt
npx jest
```
