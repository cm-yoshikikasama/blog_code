# 48_glue_python_shell_with_cdk_l2

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

## TEST Command

jest.config.jsがあるディレクトリで実行

```txt
npx jest
```
