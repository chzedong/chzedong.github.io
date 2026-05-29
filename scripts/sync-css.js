/**
 * sync-css.js
 * 从 template.html 中提取最新的 CSS，批量更新所有已生成的 HTML 文件。
 *
 * 用法：node scripts/sync-css.js  （工作目录为 chzedong.github.io/）
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEMPLATE_PATH = path.join(
  ROOT, '..', 'skills', 'deconstruct-oss', 'template.html'
);

// 目标目录 (一级子目录，排除 .git / scripts / node_modules)
const SKIP_DIRS = new Set(['.git', 'scripts', 'node_modules']);

// ── 提取 template 的 <style> 块 ────────────────
function extractStyleBlock(html) {
  const match = html.match(/<style>([\s\S]*?)<\/style>/);
  if (!match) throw new Error('template.html 中未找到 <style> 块');
  return match[0];  // 含 <style>...</style> 标签
}

// ── 替换目标文件的 <style> 块 ────────────────
function replaceStyleBlock(targetHtml, newStyleBlock) {
  if (!/<style>[\s\S]*?<\/style>/.test(targetHtml)) {
    return null;  // 没有 style 块，跳过
  }
  return targetHtml.replace(/<style>[\s\S]*?<\/style>/, newStyleBlock);
}

// ── 扫描所有 HTML 文件 ─────────────────────────
function collectTargetFiles() {
  const files = [];
  const entries = fs.readdirSync(ROOT, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;

    // 递归搜索该目录下的所有 .html 文件
    walkDir(path.join(ROOT, entry.name), files);
  }

  return files;
}

function walkDir(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, files);
    } else if (entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
}

// ── 主逻辑 ─────────────────────────────────────
function sync() {
  // 读取 template
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error('ERROR: 找不到 template.html: ' + TEMPLATE_PATH);
    process.exit(1);
  }
  const templateHtml = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const newStyleBlock = extractStyleBlock(templateHtml);

  // 扫描目标文件
  const targets = collectTargetFiles();

  if (targets.length === 0) {
    console.log('没有找到需要更新的 HTML 文件。');
    return;
  }

  console.log('将从 template.html 同步 CSS 到以下文件：');
  let updated = 0;

  for (const filePath of targets) {
    const relative = path.relative(ROOT, filePath);
    const original = fs.readFileSync(filePath, 'utf-8');
    const updatedHtml = replaceStyleBlock(original, newStyleBlock);

    if (updatedHtml === null) {
      console.log('  SKIP: ' + relative + ' (无 <style> 块)');
      continue;
    }

    if (updatedHtml === original) {
      console.log('  SAME: ' + relative);
      continue;
    }

    fs.writeFileSync(filePath, updatedHtml, 'utf-8');
    console.log('  DONE: ' + relative);
    updated++;
  }

  console.log('\n同步完成：' + updated + ' 个文件已更新。');
}

sync();
