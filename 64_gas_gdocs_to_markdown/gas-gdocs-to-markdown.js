/**
 * スクリプト プロパティから設定を読み込む
 */
function getConfig_() {
  const props = PropertiesService.getScriptProperties();

  // ROUTING_RULES: "プロジェクトA:project_a,プロジェクトB:project_b" 形式
  const routingRaw = props.getProperty('ROUTING_RULES') || '';
  const routingRules = routingRaw
    ? routingRaw.split(',').map((rule) => {
        const [keyword, folder] = rule.split(':').map((s) => s.trim());
        return { keyword, folder };
      })
    : [];

  return {
    watchFolderId: props.getProperty('WATCH_FOLDER_ID'),
    outputFolderId: props.getProperty('OUTPUT_FOLDER_ID'),
    triggerDailyHour: Number(props.getProperty('TRIGGER_DAILY_HOUR')) || 18,
    routingRules,
  };
}

/**
 * ファイル名からルーティング先サブフォルダ名を決定
 * マッチしなければ "others"
 */
function resolveFolder_(fileName, routingRules) {
  for (const rule of routingRules) {
    if (fileName.includes(rule.keyword)) {
      return rule.folder;
    }
  }
  return 'others';
}

// ============================================================
// メイン関数
// ============================================================

/**
 * メイン: 前回チェック以降に追加・更新された Docs を変換
 */
function exportChanged() {
  const config = getConfig_();
  const props = PropertiesService.getScriptProperties();
  const lastRun = props.getProperty('last_run_at');
  const watchFolder = DriveApp.getFolderById(config.watchFolderId);
  const outputRoot = DriveApp.getFolderById(config.outputFolderId);
  const query = buildQuery_(lastRun);
  const files = watchFolder.searchFiles(query);

  let count = 0;
  while (files.hasNext()) {
    const file = files.next();
    try {
      count += processFile_(file, outputRoot, config);
    } catch (e) {
      Logger.log(`Error: ${file.getName()}`);
    }
  }

  props.setProperty('last_run_at', new Date().toISOString());
  Logger.log(count > 0 ? `Done. ${count} file(s) exported.` : 'No changes detected.');
}

/**
 * 全ファイルを強制エクスポート（初回実行用）
 */
function exportAll() {
  const config = getConfig_();
  const props = PropertiesService.getScriptProperties();
  const watchFolder = DriveApp.getFolderById(config.watchFolderId);
  const outputRoot = DriveApp.getFolderById(config.outputFolderId);
  const query = 'mimeType = "application/vnd.google-apps.document"';
  const files = watchFolder.searchFiles(query);

  let count = 0;
  while (files.hasNext()) {
    const file = files.next();
    try {
      count += processFile_(file, outputRoot, config);
    } catch (e) {
      Logger.log(`Error: ${file.getName()}`);
    }
  }

  props.setProperty('last_run_at', new Date().toISOString());
  Logger.log(`Done. ${count} file(s) exported.`);
}

/**
 * 1ファイルを処理: MD変換 → 振り分け保存 → 元ファイル削除
 * @return {number} 1=成功, 0=失敗
 */
function processFile_(file, outputRoot, config) {
  const docName = file.getName();
  const subName = resolveFolder_(docName, config.routingRules);
  const outputSub = getOrCreateSubFolder_(outputRoot, subName);
  const md = exportAsMarkdown_(file.getId());
  const fileName = `${sanitizeFileName_(docName)}.md`;

  saveToFolder_(outputSub, fileName, md);
  Logger.log(`${docName} → ${subName}/${fileName}`);

  file.setTrashed(true);
  Logger.log(`Deleted: ${docName}`);

  return 1;
}

// ============================================================
// 検索・エクスポート
// ============================================================

/**
 * 検索クエリを構築（Google Docs かつ更新日時でフィルタ）
 */
function buildQuery_(lastRunIso) {
  let q = 'mimeType = "application/vnd.google-apps.document"';
  if (lastRunIso) {
    q += ` and modifiedDate > "${lastRunIso}"`;
  }
  return q;
}

/**
 * Google Docs → Markdown テキスト取得（Drive API v3 REST）
 */
function exportAsMarkdown_(docId) {
  const url = `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=${encodeURIComponent('text/markdown')}`;
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
  });
  return response.getContentText('UTF-8');
}

// ============================================================
// ユーティリティ
// ============================================================

/**
 * 出力先のサブフォルダを取得（なければ作成）
 */
function getOrCreateSubFolder_(parentFolder, subName) {
  const folders = parentFolder.getFoldersByName(subName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(subName);
}

/**
 * フォルダ内に .md ファイルを保存（既存なら上書き）
 */
function saveToFolder_(folder, fileName, content) {
  const existing = folder.getFilesByName(fileName);

  if (existing.hasNext()) {
    const file = existing.next();
    file.setContent(content);
  } else {
    folder.createFile(fileName, content, 'text/markdown');
  }
}

/**
 * ファイル名に使えない文字を除去
 */
function sanitizeFileName_(name) {
  return name.replace(/[\/\\?%*:|"<>\s]/g, '_').trim();
}

// ============================================================
// トリガー管理
// ============================================================

/**
 * 定期実行トリガーを設定（一度だけ実行すればOK）
 */
function setupTrigger() {
  const config = getConfig_();
  removeTriggers_();

  ScriptApp.newTrigger('exportChanged')
    .timeBased()
    .atHour(config.triggerDailyHour)
    .everyDays(1)
    .create();
  Logger.log(`Trigger set: daily at ${config.triggerDailyHour}:00`);
}

/**
 * トリガーを全削除
 */
function removeTriggers_() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    ScriptApp.deleteTrigger(trigger);
  }
}
