/**
 * update-nav.js
 * 扫描 chzedong.github.io 下的一级子目录，提取每个 index.html 的 <title>，
 * 自动生成导航卡片，替换 index.html 中的 <!-- NAV_PLACEHOLDER --> 占位符。
 *
 * 用法：node scripts/update-nav.js  （工作目录为 chzedong.github.io/）
 */

const fs = require('fs');
const path = require('path');

// ── 配置 ──────────────────────────────────────────
const ROOT = path.join(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'index.html');
const PLACEHOLDER = '<!-- NAV_PLACEHOLDER -->';
const SKIP_DIRS = new Set(['.git', 'scripts', 'node_modules']);

// ── 图标映射（按目录名匹配） ──────────────────────
const ICON_MAP = {
  git:    { icon: 'fab fa-git-alt',  css: 'git' },
  immer:  { icon: 'fas fa-tree',      css: 'immer' },
  jotai:  { icon: 'fas fa-atom',      css: 'jotai' },
  pdfjs:  { icon: 'fas fa-file-pdf',  css: 'pdfjs' },
  tiptap: { icon: 'fas fa-paragraph', css: 'default' },
};

function getIconInfo(dirname) {
  return ICON_MAP[dirname] || { icon: 'fas fa-book', css: 'default' };
}

// ── 提取 <title> ─────────────────────────────────
function extractTitle(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (match) return match[1].trim();
  // 回退：用目录名
  return path.basename(path.dirname(htmlPath));
}

// ── 提取 tech-type ───────────────────────────────
function extractTechType(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const match = html.match(/<meta[^>]+name=["']tech-type["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']tech-type["']/i);
  if (match) return match[1].trim();
  return 'library';
}

const TYPE_LABELS = {
  library: 'Library',
  framework: 'Framework',
  concept: 'Concept',
  practice: 'Practice',
  paradigm: 'Paradigm',
  protocol: 'Protocol',
};

// ── 扫描项目目录 ─────────────────────────────────
function scanProjects() {
  const entries = fs.readdirSync(ROOT, { withFileTypes: true });
  const projects = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;

    const indexPath = path.join(ROOT, entry.name, 'index.html');
    if (!fs.existsSync(indexPath)) continue;

    const title = extractTitle(indexPath);
    const techType = extractTechType(indexPath);
    const { icon, css } = getIconInfo(entry.name);

    projects.push({ dir: entry.name, title, icon, css, techType });
  }

  projects.sort((a, b) => a.dir.localeCompare(b.dir));
  return projects;
}

// ── 生成导航 HTML ────────────────────────────────
function generateNavHtml(projects) {
  if (projects.length === 0) {
    return '<p style="color: rgba(255,255,255,0.55); padding: 16px 0; font-size: 0.95rem;">\n'
      + '  <i class="fas fa-info-circle"></i> 暂无文档，等 skill 解构后自动出现。\n'
      + '</p>\n';
  }

  let html = '<div class="nav-grid">\n';
  for (const p of projects) {
    const typeLabel = TYPE_LABELS[p.techType] || 'Tech';
    html += `  <a href="./${p.dir}/" class="nav-card">\n`;
    html += `    <div class="nav-icon ${p.css}"><i class="${p.icon}"></i></div>\n`;
    html += `    <div class="nav-text">\n`;
    html += `      <h3>${escapeHtml(p.title)}</h3>\n`;
    html += `      <span>${escapeHtml(p.dir)}/ · ${escapeHtml(typeLabel)}</span>\n`;
    html += `    </div>\n`;
    html += `  </a>\n`;
  }
  html += '</div>\n';
  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── 主逻辑 ───────────────────────────────────────
function updateIndex() {
  let indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');

  if (!indexHtml.includes(PLACEHOLDER)) {
    console.error('ERROR: 未在 index.html 中找到 ' + PLACEHOLDER + ' 占位符，请确认占位符存在。');
    process.exit(1);
  }

  const projects = scanProjects();
  console.log('检测到 ' + projects.length + ' 个项目：');
  for (const p of projects) {
    console.log('  ' + p.dir + ' → "' + p.title + '"');
  }

  const navHtml = generateNavHtml(projects);
  indexHtml = indexHtml.replace(PLACEHOLDER, navHtml);

  fs.writeFileSync(INDEX_PATH, indexHtml, 'utf-8');
  console.log('\nindex.html 导航区域已更新。');
}

updateIndex();
