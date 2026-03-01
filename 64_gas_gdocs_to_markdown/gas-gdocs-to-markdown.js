/**
 * Load configuration from Script Properties.
 */
function getConfig_() {
  const props = PropertiesService.getScriptProperties();

  // ROUTING_RULES format: "keywordA:folder_a,keywordB:folder_b"
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
    routingRules,
  };
}

/**
 * Determine the routing subfolder name from a file name.
 * Returns "others" if no rule matches.
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
// Main functions
// ============================================================

/**
 * Main: convert Docs that have been added or updated since the last run.
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
 * Force-export all files (for initial run).
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
 * Process a single file: convert to Markdown, route to subfolder, delete original.
 * @return {number} 1 on success, 0 on failure
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
// Search and export
// ============================================================

/**
 * Build a search query (Google Docs filtered by modified date).
 */
function buildQuery_(lastRunIso) {
  let q = 'mimeType = "application/vnd.google-apps.document"';
  if (lastRunIso) {
    q += ` and modifiedDate > "${lastRunIso}"`;
  }
  return q;
}

/**
 * Fetch Markdown text from a Google Doc via Drive API v3 REST export.
 */
function exportAsMarkdown_(docId) {
  const url = `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=${encodeURIComponent('text/markdown')}`;
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
  });
  return response.getContentText('UTF-8');
}

// ============================================================
// Utilities
// ============================================================

/**
 * Get an existing subfolder by name, or create one if it doesn't exist.
 */
function getOrCreateSubFolder_(parentFolder, subName) {
  const folders = parentFolder.getFoldersByName(subName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(subName);
}

/**
 * Save a .md file to a folder (overwrite if it already exists).
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
 * Remove characters that are invalid in file names.
 */
function sanitizeFileName_(name) {
  return name.replace(/[\/\\?%*:|"<>\s]/g, '_').trim();
}
