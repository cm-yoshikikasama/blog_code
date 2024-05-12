#!/bin/bash
# Move S3 Objects and put them tags.

err() {
  echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')]: $*" >&2
}

function tag_object() {
  local bucket_name="$1"
  local object_key="$2"
  local tag_key="$3"
  local tag_value="$4"
  aws s3api put-object-tagging --bucket "$bucket_name" --key "$object_key" --profile "$PROFILE" \
    --tagging "{\"TagSet\": [{\"Key\": \"$tag_key\", \"Value\": \"$tag_value\"}]}" || {
    err "Error: failed to put tag to $bucket_name/$object_key"
    return 1
  }
}

echo "**********START $0 **********"
if [ $# -ne 3 ]; then
  echo "引数が不正です。実行するには3個の引数が必要です。" >&2
  echo "ex) sh move_put_tagging.sh s3://cm-kasama-life-cycle-test/src flight_date_header.csv iam-role" >&2
  err "スクリプトの実行に失敗しました。"
  exit 1
fi

target=$1
DEST_DIR="done/"
EXCLUDE_FILE="test.csv"
EXCLUDE_FILE_HEADER=$2
OBJECT_DELETE_TAG_KEY="delete_marker_tag"
OBJECT_DELETE_TAG_VALUE=true
OBJECT_DONE_TAG_KEY="done_tag"
OBJECT_DONE_TAG_VALUE=true
PROFILE=$3

# 移動するファイルのURIリストを取得
TARGET_OBJECT_URIS="$(aws s3 mv "$target"/ "$target"/"$DEST_DIR" --profile "$PROFILE" --recursive --exclude "$EXCLUDE_FILE" \
  --exclude "$EXCLUDE_FILE_HEADER" --exclude "${DEST_DIR}*" --dryrun | awk '{print $3}')"

for uri in $TARGET_OBJECT_URIS; do
  bucket_name="$(echo "$uri" | cut -d '/' -f 3)"
  object_key="$(echo "$uri" | cut -d '/' -f 4-)"
  tag_object "$bucket_name" "$object_key" "$OBJECT_DELETE_TAG_KEY" "$OBJECT_DELETE_TAG_VALUE"
done

MOVED_OBJECT_URIS="$(aws s3 mv "$target"/ "$target"/"$DEST_DIR" \
  --profile "$PROFILE" --recursive --exclude "$EXCLUDE_FILE" --exclude "$EXCLUDE_FILE_HEADER" \
  --exclude "${DEST_DIR}*" --no-progress --output text | cut -d ' ' -f 4)"
if [ $? -ne 0 ]; then
  # 警告（戻り値：2）の場合も通知する
  echo "エラー通知します。" 1>&2
  err "次のファイル移動に失敗しました。 | ${target}"
  exit 1
fi

echo "S3 objects have been successfully moved to: $target/$DEST_DIR"

for uri in $MOVED_OBJECT_URIS; do
  bucket_name="$(echo "$uri" | cut -d '/' -f 3)"
  object_key="$(echo "$uri" | cut -d '/' -f 4-)"
  tag_object "$bucket_name" "$object_key" "$OBJECT_DONE_TAG_KEY" "$OBJECT_DONE_TAG_VALUE"
done

echo "**********SUCCESS $0 **********"
exit 0
