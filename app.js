// ========================================
// 全局变量和配置
// ========================================
const BOOK_CONFIGS = {
    book1: {
        name: 'Book 1 (原版)',
        totalGroups: 100,
        directory: 'reading_materials',
        filePrefix: 'group',
        fileSuffix: '_reading.md',
        wordsPerGroup: 50,
        format: 'classic'
    },
    book2: {
        name: 'Book 2 (重排版)',
        totalGroups: 200,
        directory: 'reading_materials_shuffled',
        filePrefix: 'g',
        fileSuffix: '_reading.md',
        wordsPerGroup: 25,
        format: 'modular'
    }
};

let currentBook = 'book1';
const GROUPS_PER_BATCH = 10;

// LocalStorage 键名
const STORAGE_KEYS = {
    COMPLETED_GROUPS: 'coca_completed_groups_',
    USER_NOTES: 'coca_user_notes_',
    FONT_SIZE: 'coca_font_size',
    BOLD_VISIBLE: 'coca_bold_visible',
    CURRENT_BOOK: 'coca_current_book',
    FOCUS_MODE: 'coca_focus_mode',
    THEME: 'coca_theme',
    VOCABULARY_BOOK: 'coca_vocabulary_book',
    SEARCH_CACHE: 'coca_search_cache',
    SEARCH_HISTORY: 'coca_search_history',
    LEARNING_STATS: 'coca_learning_stats',
    STUDY_SESSIONS: 'coca_study_sessions'
};

const TAB_ORDER = ['summary', 'translation', 'vocabulary', 'sentences', 'memory', 'practice', 'notes'];

const TAB_EMPTY_MESSAGES = {
    summary: '本组暂无文章概要，请先阅读原文理解大意。',
    translation: '本组暂未提供翻译，先专注阅读原文。',
    vocabulary: '暂无词汇讲解，尝试自己总结关键词。',
    sentences: '本组以整体理解为主，没有额外句子分析。',
    memory: '暂无记忆或语法提示，可以添加到笔记中。',
    practice: '暂无练习建议，试着复述故事巩固记忆。'
};

const BASE_SECTION_ALIASES = {
    reading: ['reading passage', 'english reading', '📖 reading passage', 'story'],
    summary: ['文章概要', 'story summary', '概要'],
    translation: ['中文翻译', 'chinese translation'],
    vocabulary: ['重点词汇注释', 'key vocabulary', '词汇详解', '词汇讲解'],
    sentences: ['重点句子', 'key sentence', '句子分析'],
    memory: ['记忆技巧', 'memory techniques'],
    practice: ['练习建议', 'practice suggestions', 'practice']
};

const BOOK_SECTION_ALIASES = {
    book2: {
        reading: ['part 1', '英文原文'],
        translation: ['part 2', '故事翻译'],
        vocabulary: ['part 3', '词汇详解表', 'vocabulary table'],
        sentences: ['part 4', '重点句讲解', '句子讲解'],
        memory: ['part 5', '语法聚焦', 'grammar focus']
    }
};

const AVAILABLE_THEMES = ['light', 'dark', 'paper'];
const DEFAULT_THEME = 'light';
let currentTheme = DEFAULT_THEME;

if (typeof document !== 'undefined') {
    currentTheme = getStoredTheme();
    applyTheme(currentTheme);
    document.addEventListener('DOMContentLoaded', () => {
        syncThemeButtons();
    });
}

// ========================================
// 工具函数
// ========================================

function getStoredTheme() {
    if (typeof localStorage === 'undefined') return DEFAULT_THEME;
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    return AVAILABLE_THEMES.includes(stored) ? stored : DEFAULT_THEME;
}

function setTheme(theme) {
    if (!AVAILABLE_THEMES.includes(theme)) {
        theme = DEFAULT_THEME;
    }
    currentTheme = theme;
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.THEME, theme);
    }
    applyTheme(theme);
    syncThemeButtons();
}

function applyTheme(theme) {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (!body) {
        document.addEventListener('DOMContentLoaded', () => applyTheme(theme), { once: true });
        return;
    }
    AVAILABLE_THEMES.forEach(t => body.classList.remove(`theme-${t}`));
    body.classList.add(`theme-${theme}`);
}

function syncThemeButtons() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.theme-btn').forEach(btn => {
        const btnTheme = btn.getAttribute('data-theme');
        btn.classList.toggle('active', btnTheme === currentTheme);
    });
}

// 获取当前book
function getCurrentBook() {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_BOOK);
    return stored || 'book1';
}

// 保存当前book
function saveCurrentBook(book) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_BOOK, book);
    currentBook = book;
}

// 获取已完成的组
function getCompletedGroups() {
    const key = STORAGE_KEYS.COMPLETED_GROUPS + currentBook;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
}

// 保存已完成的组
function saveCompletedGroups(groups) {
    const key = STORAGE_KEYS.COMPLETED_GROUPS + currentBook;
    localStorage.setItem(key, JSON.stringify(groups));
}

// 检查组是否完成
function isGroupCompleted(groupNum) {
    const completed = getCompletedGroups();
    return completed.includes(groupNum);
}

// 切换组的完成状态
function toggleGroupComplete(groupNum) {
    let completed = getCompletedGroups();
    const index = completed.indexOf(groupNum);

    if (index > -1) {
        completed.splice(index, 1);
    } else {
        completed.push(groupNum);
    }

    saveCompletedGroups(completed);
    return completed.includes(groupNum);
}

// 获取URL参数
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 验证组号参数
function validateGroupNumber(value, totalGroups) {
    const num = parseInt(value);
    if (isNaN(num) || num < 1) return 1;
    if (num > totalGroups) return totalGroups;
    return num;
}

// 验证书籍参数
function validateBookParameter(value) {
    return BOOK_CONFIGS.hasOwnProperty(value) ? value : 'book1';
}

// 工具函数:延迟
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 显示错误消息
function showErrorMessage(message, type = 'error') {
    showToast(message, type);
}

// 加载Markdown文件（带重试机制）
async function loadMarkdown(groupNum, book = null, retryCount = 3) {
    const bookConfig = BOOK_CONFIGS[book || currentBook];
    const filePath = `${bookConfig.directory}/${bookConfig.filePrefix}${groupNum}${bookConfig.fileSuffix}`;

    for (let i = 0; i < retryCount; i++) {
        try {
            const response = await fetch(filePath);

            if (!response.ok) {
                if (response.status === 404) {
                    showErrorMessage('文件不存在，该组内容可能尚未准备');
                    return null;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.text();
        } catch (error) {
            console.error(`加载失败 (尝试 ${i + 1}/${retryCount}):`, error);

            if (i === retryCount - 1) {
                showErrorMessage('加载失败，请检查网络连接或刷新页面重试');
                return null;
            }

            // 指数退避
            await sleep(1000 * Math.pow(2, i));
        }
    }

    return null;
}

// Markdown 解析缓存
const markdownCache = new Map();
const MAX_CACHE_SIZE = 50;

// 解析Markdown内容为不同区块（带缓存）
function parseMarkdownSections(markdown, bookKey = currentBook) {
    if (!markdown) return getEmptySections();

    // 生成缓存键
    const cacheKey = `${bookKey}_${markdown.substring(0, 100)}`;

    // 检查缓存
    if (markdownCache.has(cacheKey)) {
        return markdownCache.get(cacheKey);
    }

    // 解析内容
    const sections = parseMarkdownContent(markdown, bookKey);

    // 保存到缓存
    markdownCache.set(cacheKey, sections);

    // 限制缓存大小
    if (markdownCache.size > MAX_CACHE_SIZE) {
        const firstKey = markdownCache.keys().next().value;
        markdownCache.delete(firstKey);
    }

    return sections;
}

// 获取空的sections对象
function getEmptySections() {
    return {
        title: '',
        reading: '',
        readingTitle: '',
        summary: '',
        summaryTitle: '',
        translation: '',
        translationTitle: '',
        vocabulary: '',
        vocabularyTitle: '',
        sentences: '',
        sentencesTitle: '',
        memory: '',
        memoryTitle: '',
        practice: '',
        practiceTitle: ''
    };
}

// 实际的Markdown解析逻辑
function parseMarkdownContent(markdown, bookKey = currentBook) {
    const sections = getEmptySections();

    if (!markdown) return sections;

    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    if (titleMatch) {
        sections.title = titleMatch[1];
    }

    const headingRegex = /^##\s+(.+)$/gm;
    const matches = [];
    let match;
    while ((match = headingRegex.exec(markdown)) !== null) {
        matches.push({
            heading: match[1].trim(),
            normalized: normalizeHeadingText(match[1]),
            contentStart: headingRegex.lastIndex,
            headingStart: match.index
        });
    }

    matches.forEach((item, index) => {
        const sectionKey = resolveSectionKey(item.normalized, bookKey);
        if (!sectionKey) return;

        const nextHeadingStart = index + 1 < matches.length
            ? matches[index + 1].headingStart
            : markdown.length;
        const content = markdown.slice(item.contentStart, nextHeadingStart).trim();
        if (!content) return;

        if (!sections[sectionKey]) {
            sections[sectionKey] = content;
            const titleKey = `${sectionKey}Title`;
            if (sections.hasOwnProperty(titleKey)) {
                sections[titleKey] = item.heading;
            }
        } else {
            sections[sectionKey] += '\n\n' + content;
        }
    });

    if (!sections.reading) {
        const firstHeadingStart = matches.length ? matches[0].headingStart : markdown.length;
        const fallback = markdown.slice(0, firstHeadingStart).trim();
        sections.reading = fallback;
    }

    return sections;
}

function normalizeHeadingText(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5\s\.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function resolveSectionKey(normalizedHeading, bookKey) {
    const bookAlias = BOOK_SECTION_ALIASES[bookKey];
    const sectionFromBook = findSectionByAlias(normalizedHeading, bookAlias);
    if (sectionFromBook) return sectionFromBook;
    return findSectionByAlias(normalizedHeading, BASE_SECTION_ALIASES);
}

function findSectionByAlias(normalizedHeading, aliasMap = {}) {
    if (!aliasMap) return null;
    return Object.keys(aliasMap).find(section =>
        aliasMap[section].some(pattern => normalizedHeading.includes(pattern))
    ) || null;
}

// ========================================
// 首页功能
// ========================================

function switchBook(book) {
    currentBook = book;
    saveCurrentBook(book);
    
    // 更新按钮状态
    document.querySelectorAll('.book-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(book + 'Btn').classList.add('active');
    
    // 更新UI
    updateStats();
    renderGroupBatches();
    updateBookInfo();
}

function updateBookInfo() {
    const bookConfig = BOOK_CONFIGS[currentBook];
    const searchHint = document.getElementById('searchHint');
    const footerText = document.getElementById('footerText');
    const searchInput = document.getElementById('groupSearch');
    const totalWords = bookConfig.totalGroups * bookConfig.wordsPerGroup;
    
    if (searchHint) {
        searchHint.textContent = `当前选择：${bookConfig.name} · 1-${bookConfig.totalGroups} 组 · 每组 ${bookConfig.wordsPerGroup} 词`;
    }
    if (footerText) {
        footerText.textContent = `每组${bookConfig.wordsPerGroup}个高频词 | 共${bookConfig.totalGroups}组 | 约${totalWords}个核心词汇`;
    }
    if (searchInput) {
        searchInput.max = bookConfig.totalGroups;
        searchInput.placeholder = `输入组号 (1-${bookConfig.totalGroups}) 直接跳转`;
    }
    
    const totalGroupsEl = document.getElementById('totalGroups');
    const totalWordsEl = document.getElementById('totalWords');
    if (totalGroupsEl) totalGroupsEl.textContent = bookConfig.totalGroups;
    if (totalWordsEl) totalWordsEl.textContent = totalWords;
}

function initHomepage() {
    // 加载保存的book设置
    currentBook = getCurrentBook();
    
    // 更新book选择按钮状态
    document.querySelectorAll('.book-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(currentBook + 'Btn').classList.add('active');
    
    updateStats();
    renderGroupBatches();
    updateBookInfo();

    // 添加键盘事件
    document.getElementById('groupSearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            jumpToGroup();
        }
    });

    syncThemeButtons();
}

function updateStats() {
    const completed = getCompletedGroups();
    const completedCount = completed.length;
    const bookConfig = BOOK_CONFIGS[currentBook];
    const totalGroups = bookConfig.totalGroups;
    const progress = Math.round((completedCount / totalGroups) * 100);
    const totalWords = totalGroups * bookConfig.wordsPerGroup;

    const completedGroupsEl = document.getElementById('completedGroups');
    const progressPercentEl = document.getElementById('progressPercent');
    const totalWordsEl = document.getElementById('totalWords');

    if (completedGroupsEl) completedGroupsEl.textContent = completedCount;
    if (progressPercentEl) progressPercentEl.textContent = progress + '%';
    if (totalWordsEl) totalWordsEl.textContent = totalWords;
}

function renderGroupBatches() {
    const container = document.getElementById('groupsContainer');
    const completed = getCompletedGroups();
    const bookConfig = BOOK_CONFIGS[currentBook];
    const totalGroups = bookConfig.totalGroups;

    container.innerHTML = '';

    for (let i = 0; i < totalGroups; i += GROUPS_PER_BATCH) {
        const startGroup = i + 1;
        const endGroup = Math.min(i + GROUPS_PER_BATCH, totalGroups);
        const actualGroupsInBatch = endGroup - startGroup + 1;

        // 计算这个批次的完成进度
        let batchCompleted = 0;
        for (let g = startGroup; g <= endGroup; g++) {
            if (completed.includes(g)) {
                batchCompleted++;
            }
        }

        const batchDiv = document.createElement('div');
        batchDiv.className = 'group-batch';
        batchDiv.style.animationDelay = `${Math.min(i / totalGroups, 0.5)}s`;
        if (batchCompleted === actualGroupsInBatch) {
            batchDiv.classList.add('completed');
        }

        const progressPercent = Math.round((batchCompleted / actualGroupsInBatch) * 100);
        const totalWordsInBatch = actualGroupsInBatch * bookConfig.wordsPerGroup;
        const estimatedMinutes = Math.max(5, Math.round(totalWordsInBatch / 20));

        batchDiv.innerHTML = `
            <h3>Group ${startGroup} - ${endGroup}</h3>
            <div class="group-range">每组 ${bookConfig.wordsPerGroup} 词 · 共 ${actualGroupsInBatch} 组</div>
            <div class="batch-meta">
                <span class="meta-chip">${totalWordsInBatch} 词汇</span>
                <span class="meta-chip alt">≈ ${estimatedMinutes} 分钟</span>
            </div>
            <div class="group-progress">
                完成进度: ${batchCompleted}/${actualGroupsInBatch}
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
        `;

        batchDiv.addEventListener('click', () => {
            window.location.href = `viewer.html?group=${startGroup}&book=${currentBook}`;
        });

        container.appendChild(batchDiv);
    }
}

function jumpToGroup() {
    const input = document.getElementById('groupSearch');
    const groupNum = parseInt(input.value);
    const bookConfig = BOOK_CONFIGS[currentBook];
    const totalGroups = bookConfig.totalGroups;

    if (groupNum >= 1 && groupNum <= totalGroups) {
        window.location.href = `viewer.html?group=${groupNum}&book=${currentBook}`;
    } else {
        alert(`请输入 1 到 ${totalGroups} 之间的数字`);
    }
}

// ========================================
// 学习页面功能
// ========================================

let currentGroup = 1;
let currentFontSize = 16;
let boldVisible = true;
let focusMode = false;

// 语音合成相关
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let isSpeaking = false;
let speechRate = 1.0;

async function initViewer() {
    // 获取当前组号和book，并验证参数
    const bookParam = getUrlParameter('book');
    currentBook = validateBookParameter(bookParam || getCurrentBook());

    const bookConfig = BOOK_CONFIGS[currentBook];
    const totalGroups = bookConfig.totalGroups;

    const groupParam = getUrlParameter('group');
    currentGroup = validateGroupNumber(groupParam, totalGroups);

    // 加载保存的设置
    loadViewerSettings();

    // 更新UI
    updateViewerUI();

    // 加载内容
    await loadGroupContent(currentGroup);

    // 加载用户笔记
    loadUserNotes();

    // 设置笔记自动保存
    setupAutoSaveNotes();

    // 设置生词本功能
    setupVocabularyBookFeature();

    // 高亮搜索词（如果是从搜索结果跳转过来）
    highlightSearchTermInViewer();

    // 添加键盘快捷键
    setupKeyboardShortcuts();

    syncThemeButtons();
}

function loadViewerSettings() {
    // 加载字体大小
    const savedFontSize = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
    if (savedFontSize) {
        currentFontSize = parseInt(savedFontSize);
        document.getElementById('readingContent').style.fontSize = currentFontSize + 'px';
    }

    // 加载加粗显示设置
    const savedBoldVisible = localStorage.getItem(STORAGE_KEYS.BOLD_VISIBLE);
    if (savedBoldVisible !== null) {
        boldVisible = savedBoldVisible === 'true';
        if (!boldVisible) {
            document.getElementById('readingContent').classList.add('hide-bold');
        }
    }

    const savedFocusMode = localStorage.getItem(STORAGE_KEYS.FOCUS_MODE);
    if (savedFocusMode !== null) {
        focusMode = savedFocusMode === 'true';
        applyFocusMode();
    }
}

function updateViewerUI() {
    const bookConfig = BOOK_CONFIGS[currentBook];
    const totalGroups = bookConfig.totalGroups;
    
    // 更新标题
    document.getElementById('groupTitle').textContent = `${bookConfig.name} - Group ${currentGroup}`;
    document.getElementById('currentProgress').textContent = `Group ${currentGroup} / ${totalGroups}`;
    const readingMeta = document.getElementById('readingMeta');
    if (readingMeta) {
        const estimatedMinutes = Math.max(5, Math.round(bookConfig.wordsPerGroup / 10));
        readingMeta.textContent = `${bookConfig.name} · 第 ${currentGroup} 组 · ${bookConfig.wordsPerGroup} 词 · ≈ ${estimatedMinutes} 分钟`;
    }

    // 更新完成状态按钮
    const isCompleted = isGroupCompleted(currentGroup);
    const completeBtn = document.getElementById('completeBtn');
    const completeIcon = document.getElementById('completeIcon');

    if (isCompleted) {
        completeBtn.classList.add('completed');
        completeIcon.textContent = '☑';
    } else {
        completeBtn.classList.remove('completed');
        completeIcon.textContent = '☐';
    }

    // 更新导航按钮
    document.getElementById('prevBtn').disabled = currentGroup <= 1;
    document.getElementById('nextBtn').disabled = currentGroup >= totalGroups;
}

async function loadGroupContent(groupNum) {
    // 显示加载状态
    const readingContent = document.getElementById('readingContent');
    setReadingLoading(true);
    readingContent.innerHTML = '<p>正在加载内容...</p>';

    // 加载Markdown文件
    const markdown = await loadMarkdown(groupNum);

    if (!markdown) {
        readingContent.innerHTML = '<p>加载失败，请检查文件是否存在。</p>';
        setReadingLoading(false);
        return;
    }

    // 解析内容
    const sections = parseMarkdownSections(markdown, currentBook);

    // 渲染各个部分
    renderReading(sections.reading, sections.readingTitle);
    renderSummary(sections.summary, sections.summaryTitle);
    renderTranslation(sections.translation, sections.translationTitle);
    renderVocabulary(sections.vocabulary, sections.vocabularyTitle);
    renderSentences(sections.sentences, sections.sentencesTitle);
    renderMemory(sections.memory, sections.memoryTitle);
    renderPractice(sections.practice, sections.practiceTitle);
    ensureActiveTab();
    setReadingLoading(false);
}

function renderReading(content, heading = '') {
    const readingContent = document.getElementById('readingContent');
    let bodyHtml = '';

    if (typeof marked !== 'undefined') {
        bodyHtml = content ? marked.parse(content) : '<p>暂无阅读内容。</p>';
    } else {
        const fallback = (content || '暂无阅读内容。')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
        bodyHtml = fallback;
    }

    bodyHtml = addInlineTooltips(bodyHtml);
    readingContent.innerHTML = `${heading ? `<div class="reading-heading">${heading}</div>` : ''}${bodyHtml}`;
}

function renderSummary(content, heading = '') {
    renderSection('summary', content, heading);
}

function renderTranslation(content, heading = '') {
    renderSection('translation', content, heading);
}

function renderVocabulary(content, heading = '') {
    renderSection('vocabulary', content, heading);
}

function renderSentences(content, heading = '') {
    renderSection('sentences', content, heading);
}

function renderMemory(content, heading = '') {
    renderSection('memory', content, heading);
}

function renderPractice(content, heading = '') {
    renderSection('practice', content, heading);
}

function renderSection(sectionId, content, heading = '') {
    const element = document.getElementById(sectionId);
    const trimmed = (content || '').trim();

    if (!trimmed) {
        element.innerHTML = `<div class="empty-state">${TAB_EMPTY_MESSAGES[sectionId] || '本节暂无内容'}</div>`;
        setTabAvailability(sectionId, false);
        return;
    }

    setTabAvailability(sectionId, true);

    if (typeof marked !== 'undefined') {
        const html = marked.parse(trimmed);
        element.innerHTML = `${heading ? `<div class="section-heading">${heading}</div>` : ''}${html}`;
    } else {
        element.innerHTML = `${heading ? `<div class="section-heading">${heading}</div>` : ''}<pre>${trimmed}</pre>`;
    }
}

function setReadingLoading(isLoading) {
    const readingContent = document.getElementById('readingContent');
    if (!readingContent) return;
    readingContent.classList.toggle('loading', isLoading);
}

function setTabAvailability(sectionId, isAvailable) {
    const button = document.querySelector(`.tab-btn[data-tab="${sectionId}"]`);
    if (!button) return;
    button.classList.toggle('disabled', !isAvailable);
    if (!isAvailable) {
        if (button.classList.contains('active')) {
            button.classList.remove('active');
            document.getElementById(sectionId).classList.remove('active');
            ensureActiveTab();
        }
    }
}

function ensureActiveTab() {
    const activeBtn = document.querySelector('.tab-btn.active');
    if (activeBtn && !activeBtn.classList.contains('disabled')) {
        return;
    }

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    const available = TAB_ORDER.map(tab => document.querySelector(`.tab-btn[data-tab="${tab}"]`))
        .find(btn => btn && !btn.classList.contains('disabled'));

    if (available) {
        const tabName = available.getAttribute('data-tab');
        available.classList.add('active');
        document.getElementById(tabName).classList.add('active');
    }
}

function addInlineTooltips(html) {
    if (!html) return html;
    const annotationRegex = /(<strong>[^<]+<\/strong>|[A-Za-z][A-Za-z'\-]*)\s*\/([^\/<]+?)\/\s*\(([^)]+)\)(\s*)/g;
    return html.replace(annotationRegex, (match, wordHtml, ipa, meaning, space) => {
        const tooltip = `${ipa.trim()} · ${meaning.trim()}`;
        const escaped = escapeAttribute(tooltip);
        return `<span class="word-tooltip" data-tooltip="${escaped}">${wordHtml}</span>${space || ' '}`;
    });
}

function escapeAttribute(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ========================================
// 交互功能
// ========================================

function switchTab(tabName, triggerElement = null) {
    const targetBtn = triggerElement || document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (!targetBtn || targetBtn.classList.contains('disabled')) {
        return;
    }

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    targetBtn.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

function toggleBoldWords() {
    const readingContent = document.getElementById('readingContent');
    const icon = document.getElementById('boldToggleIcon');

    boldVisible = !boldVisible;

    if (boldVisible) {
        readingContent.classList.remove('hide-bold');
        icon.textContent = '👁️';
    } else {
        readingContent.classList.add('hide-bold');
        icon.textContent = '👁️‍🗨️';
    }

    localStorage.setItem(STORAGE_KEYS.BOLD_VISIBLE, boldVisible);
}

function toggleFocusMode() {
    focusMode = !focusMode;
    applyFocusMode();
    localStorage.setItem(STORAGE_KEYS.FOCUS_MODE, focusMode);
    showToast(focusMode ? '已开启专注模式' : '已关闭专注模式');
}

function applyFocusMode() {
    const container = document.querySelector('.viewer-container');
    const focusButton = document.getElementById('focusBtn');
    const icon = document.getElementById('focusIcon');

    if (container) {
        container.classList.toggle('focus-mode', focusMode);
    }

    if (focusButton) {
        focusButton.classList.toggle('active', focusMode);
    }

    if (icon) {
        icon.textContent = focusMode ? '✨' : '🎯';
    }
}

function adjustFontSize(delta) {
    const readingContent = document.getElementById('readingContent');
    currentFontSize += delta;

    // 限制字体大小范围
    if (currentFontSize < 12) currentFontSize = 12;
    if (currentFontSize > 24) currentFontSize = 24;

    readingContent.style.fontSize = currentFontSize + 'px';
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, currentFontSize);
}

function toggleComplete() {
    const isNowCompleted = toggleGroupComplete(currentGroup);
    updateViewerUI();

    // 显示提示
    const status = isNowCompleted ? '已标记为完成' : '已取消完成标记';
    showToast(status);
}

function navigateGroup(delta) {
    const newGroup = currentGroup + delta;
    const bookConfig = BOOK_CONFIGS[currentBook];
    const totalGroups = bookConfig.totalGroups;

    if (newGroup >= 1 && newGroup <= totalGroups) {
        window.location.href = `viewer.html?group=${newGroup}&book=${currentBook}`;
    }
}

function loadUserNotes() {
    const key = STORAGE_KEYS.USER_NOTES + currentBook + '_' + currentGroup;
    const notes = localStorage.getItem(key) || '';
    document.getElementById('userNotes').value = notes;
}

function saveNotes(silent = false) {
    const notes = document.getElementById('userNotes').value;
    const key = STORAGE_KEYS.USER_NOTES + currentBook + '_' + currentGroup;
    localStorage.setItem(key, notes);

    if (!silent) {
        const status = document.getElementById('notesSaveStatus');
        status.textContent = '笔记已保存 ✓';

        setTimeout(() => {
            status.textContent = '';
        }, 2000);
    }
}

// 自动保存笔记的定时器
let autoSaveTimer = null;

// 设置笔记自动保存
function setupAutoSaveNotes() {
    const notesTextarea = document.getElementById('userNotes');
    if (!notesTextarea) return;

    // 输入时自动保存（防抖）
    notesTextarea.addEventListener('input', () => {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            saveNotes(true); // 静默保存，不显示提示
        }, 2000);
    });

    // 页面卸载前保存
    window.addEventListener('beforeunload', () => {
        saveNotes(true);
    });
}

function showToast(message, type = 'success') {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.textContent = message;

    // 根据类型设置背景色
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };

    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${colors[type] || colors.success};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 2000);
}

// ========================================
// 语音朗读功能
// ========================================

// 切换朗读状态
function toggleSpeech() {
    if (!speechSynthesis) {
        showToast('您的浏览器不支持语音合成功能', 'warning');
        return;
    }

    if (isSpeaking) {
        stopSpeech();
    } else {
        startSpeech();
    }
}

// 开始朗读
function startSpeech() {
    const readingContent = document.getElementById('readingContent');
    if (!readingContent) return;

    // 获取纯文本内容
    let text = readingContent.innerText;

    // 移除标题等非正文内容
    text = text.replace(/^.*Reading.*\n/i, '');
    text = text.trim();

    if (!text) {
        showToast('没有可朗读的内容', 'warning');
        return;
    }

    // 创建语音合成对象
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = 'en-US';
    currentUtterance.rate = speechRate;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;

    // 设置事件监听
    currentUtterance.onstart = () => {
        isSpeaking = true;
        updateSpeechButton();
    };

    currentUtterance.onend = () => {
        isSpeaking = false;
        updateSpeechButton();
        showToast('朗读完成', 'success');
    };

    currentUtterance.onerror = (event) => {
        console.error('语音合成错误:', event);
        isSpeaking = false;
        updateSpeechButton();
        showToast('朗读出错，请重试', 'error');
    };

    // 开始朗读
    speechSynthesis.speak(currentUtterance);
    showToast('开始朗读...', 'info');
}

// 停止朗读
function stopSpeech() {
    if (speechSynthesis) {
        speechSynthesis.cancel();
        isSpeaking = false;
        updateSpeechButton();
        showToast('已停止朗读', 'info');
    }
}

// 更新朗读按钮状态
function updateSpeechButton() {
    const speechBtn = document.getElementById('speechBtn');
    const speechIcon = document.getElementById('speechIcon');

    if (speechBtn && speechIcon) {
        if (isSpeaking) {
            speechBtn.classList.add('active');
            speechIcon.textContent = '⏸️';
            speechBtn.title = '停止朗读';
        } else {
            speechBtn.classList.remove('active');
            speechIcon.textContent = '🔊';
            speechBtn.title = '朗读文章';
        }
    }
}

// 调整朗读速度
function adjustSpeechRate(delta) {
    speechRate += delta;
    speechRate = Math.max(0.5, Math.min(2.0, speechRate));

    if (isSpeaking) {
        stopSpeech();
        setTimeout(startSpeech, 100);
    }

    showToast(`朗读速度: ${speechRate.toFixed(1)}x`, 'info');
}

// ========================================
// 生词本功能
// ========================================

// 获取生词本
function getVocabularyBook() {
    const stored = localStorage.getItem(STORAGE_KEYS.VOCABULARY_BOOK);
    return stored ? JSON.parse(stored) : [];
}

// 保存生词本
function saveVocabularyBook(vocabulary) {
    localStorage.setItem(STORAGE_KEYS.VOCABULARY_BOOK, JSON.stringify(vocabulary));
}

// 添加单词到生词本
function addToVocabularyBook(word, groupNum, context = '') {
    const vocabulary = getVocabularyBook();

    // 检查是否已存在
    const exists = vocabulary.find(item => item.word.toLowerCase() === word.toLowerCase());
    if (exists) {
        showToast('该单词已在生词本中', 'warning');
        return false;
    }

    const newWord = {
        word: word,
        groupNum: groupNum,
        book: currentBook,
        context: context,
        addedDate: new Date().toISOString(),
        reviewCount: 0,
        mastered: false,
        lastReviewDate: null
    };

    vocabulary.push(newWord);
    saveVocabularyBook(vocabulary);
    showToast(`已添加"${word}"到生词本`, 'success');
    return true;
}

// 从生词本移除单词
function removeFromVocabularyBook(word) {
    let vocabulary = getVocabularyBook();
    const initialLength = vocabulary.length;

    vocabulary = vocabulary.filter(item => item.word.toLowerCase() !== word.toLowerCase());

    if (vocabulary.length < initialLength) {
        saveVocabularyBook(vocabulary);
        showToast(`已从生词本移除"${word}"`, 'info');
        return true;
    }

    return false;
}

// 检查单词是否在生词本中
function isInVocabularyBook(word) {
    const vocabulary = getVocabularyBook();
    return vocabulary.some(item => item.word.toLowerCase() === word.toLowerCase());
}

// 更新单词复习信息
function updateWordReview(word) {
    const vocabulary = getVocabularyBook();
    const wordItem = vocabulary.find(item => item.word.toLowerCase() === word.toLowerCase());

    if (wordItem) {
        wordItem.reviewCount++;
        wordItem.lastReviewDate = new Date().toISOString();
        saveVocabularyBook(vocabulary);
    }
}

// 标记单词为已掌握
function markWordMastered(word, mastered = true) {
    const vocabulary = getVocabularyBook();
    const wordItem = vocabulary.find(item => item.word.toLowerCase() === word.toLowerCase());

    if (wordItem) {
        wordItem.mastered = mastered;
        saveVocabularyBook(vocabulary);
        showToast(`"${word}" 已标记为${mastered ? '已掌握' : '未掌握'}`, 'success');
    }
}

// 为文章中的加粗单词添加生词本功能
function setupVocabularyBookFeature() {
    const readingContent = document.getElementById('readingContent');
    if (!readingContent) return;

    // 为所有加粗单词添加点击事件
    readingContent.addEventListener('click', (e) => {
        const target = e.target;
        if (target.tagName === 'STRONG') {
            const word = target.textContent.trim();
            toggleWordInVocabularyBook(word);
        }
    });

    // 更新已在生词本中的单词样式
    updateVocabularyHighlight();
}

// 切换单词在生词本中的状态
function toggleWordInVocabularyBook(word) {
    if (isInVocabularyBook(word)) {
        removeFromVocabularyBook(word);
    } else {
        addToVocabularyBook(word, currentGroup);
    }
    updateVocabularyHighlight();
}

// 更新生词本单词的高亮样式
function updateVocabularyHighlight() {
    const readingContent = document.getElementById('readingContent');
    if (!readingContent) return;

    const strongElements = readingContent.querySelectorAll('strong');
    strongElements.forEach(el => {
        const word = el.textContent.trim();
        if (isInVocabularyBook(word)) {
            el.classList.add('in-vocabulary-book');
            el.title = '点击从生词本移除';
        } else {
            el.classList.remove('in-vocabulary-book');
            el.title = '点击添加到生词本';
        }
    });
}

// 打开生词本界面
function openVocabularyBook() {
    const vocabulary = getVocabularyBook();

    if (vocabulary.length === 0) {
        showToast('生词本是空的，点击文章中的加粗单词来添加生词', 'info');
        return;
    }

    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'vocab-modal';
    modal.innerHTML = `
        <div class="vocab-modal-content">
            <div class="vocab-modal-header">
                <h2>📚 我的生词本</h2>
                <span class="vocab-close" onclick="closeVocabularyBook()">&times;</span>
            </div>
            <div class="vocab-stats">
                <span>总计: ${vocabulary.length} 个</span>
                <span>已掌握: ${vocabulary.filter(v => v.mastered).length} 个</span>
                <span>待复习: ${vocabulary.filter(v => !v.mastered).length} 个</span>
            </div>
            <div class="vocab-filters">
                <button onclick="filterVocabulary('all')" class="filter-btn active" data-filter="all">全部</button>
                <button onclick="filterVocabulary('unmastered')" class="filter-btn" data-filter="unmastered">待复习</button>
                <button onclick="filterVocabulary('mastered')" class="filter-btn" data-filter="mastered">已掌握</button>
            </div>
            <div class="vocab-list" id="vocabList">
                ${renderVocabularyList(vocabulary)}
            </div>
            <div class="vocab-actions">
                <button onclick="exportVocabulary()" class="action-btn">📥 导出</button>
                <button onclick="clearVocabularyBook()" class="action-btn danger">🗑️ 清空</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeVocabularyBook();
        }
    });
}

// 关闭生词本界面
function closeVocabularyBook() {
    const modal = document.querySelector('.vocab-modal');
    if (modal) {
        modal.remove();
    }
}

// 渲染生词列表
function renderVocabularyList(vocabulary, filter = 'all') {
    let filtered = vocabulary;

    if (filter === 'unmastered') {
        filtered = vocabulary.filter(v => !v.mastered);
    } else if (filter === 'mastered') {
        filtered = vocabulary.filter(v => v.mastered);
    }

    if (filtered.length === 0) {
        return '<div class="empty-vocab">暂无单词</div>';
    }

    return filtered.map(item => `
        <div class="vocab-item ${item.mastered ? 'mastered' : ''}">
            <div class="vocab-word">${item.word}</div>
            <div class="vocab-info">
                <span class="vocab-group">Group ${item.groupNum}</span>
                <span class="vocab-date">${new Date(item.addedDate).toLocaleDateString()}</span>
                <span class="vocab-review">复习 ${item.reviewCount} 次</span>
            </div>
            <div class="vocab-buttons">
                <button onclick="toggleMastered('${item.word}')" class="vocab-btn-sm">
                    ${item.mastered ? '✓' : '☆'}
                </button>
                <button onclick="removeVocabWord('${item.word}')" class="vocab-btn-sm danger">×</button>
            </div>
        </div>
    `).join('');
}

// 过滤生词
function filterVocabulary(filter) {
    const vocabulary = getVocabularyBook();
    const vocabList = document.getElementById('vocabList');

    if (vocabList) {
        vocabList.innerHTML = renderVocabularyList(vocabulary, filter);
    }

    // 更新按钮状态
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
    });
}

// 切换掌握状态
function toggleMastered(word) {
    const vocabulary = getVocabularyBook();
    const item = vocabulary.find(v => v.word.toLowerCase() === word.toLowerCase());

    if (item) {
        item.mastered = !item.mastered;
        saveVocabularyBook(vocabulary);

        // 重新渲染
        const activeFilter = document.querySelector('.filter-btn.active');
        const filter = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
        filterVocabulary(filter);

        showToast(`${word} 已标记为${item.mastered ? '已掌握' : '未掌握'}`, 'success');
    }
}

// 从生词本移除单词(在模态框中)
function removeVocabWord(word) {
    if (confirm(`确定要从生词本移除 "${word}" 吗？`)) {
        removeFromVocabularyBook(word);

        // 重新渲染
        const activeFilter = document.querySelector('.filter-btn.active');
        const filter = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
        const vocabulary = getVocabularyBook();

        const vocabList = document.getElementById('vocabList');
        if (vocabList) {
            vocabList.innerHTML = renderVocabularyList(vocabulary, filter);
        }

        // 更新统计
        const stats = document.querySelector('.vocab-stats');
        if (stats) {
            stats.innerHTML = `
                <span>总计: ${vocabulary.length} 个</span>
                <span>已掌握: ${vocabulary.filter(v => v.mastered).length} 个</span>
                <span>待复习: ${vocabulary.filter(v => !v.mastered).length} 个</span>
            `;
        }

        if (vocabulary.length === 0) {
            closeVocabularyBook();
        }
    }
}

// 导出生词本
function exportVocabulary() {
    const vocabulary = getVocabularyBook();

    if (vocabulary.length === 0) {
        showToast('生词本是空的', 'warning');
        return;
    }

    // 生成文本格式
    let text = '# COCA 5000 生词本\n\n';
    text += `导出时间: ${new Date().toLocaleString()}\n`;
    text += `总计: ${vocabulary.length} 个单词\n\n`;

    text += '---\n\n';

    vocabulary.forEach((item, index) => {
        text += `${index + 1}. **${item.word}**\n`;
        text += `   - 来源: Group ${item.groupNum} (${item.book})\n`;
        text += `   - 添加日期: ${new Date(item.addedDate).toLocaleDateString()}\n`;
        text += `   - 复习次数: ${item.reviewCount}\n`;
        text += `   - 状态: ${item.mastered ? '已掌握' : '待复习'}\n`;
        text += '\n';
    });

    // 下载文件
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `COCA生词本_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('生词本已导出', 'success');
}

// 清空生词本
function clearVocabularyBook() {
    if (confirm('确定要清空整个生词本吗？此操作不可恢复！')) {
        localStorage.removeItem(STORAGE_KEYS.VOCABULARY_BOOK);
        closeVocabularyBook();
        showToast('生词本已清空', 'info');
    }
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // 如果正在输入，不触发快捷键
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        const bookConfig = BOOK_CONFIGS[currentBook];
        const totalGroups = bookConfig.totalGroups;

        switch(e.key) {
            case 'ArrowLeft':
                if (currentGroup > 1) {
                    navigateGroup(-1);
                }
                break;
            case 'ArrowRight':
                if (currentGroup < totalGroups) {
                    navigateGroup(1);
                }
                break;
            case 'c':
            case 'C':
                toggleComplete();
                break;
            case 'h':
            case 'H':
                toggleBoldWords();
                break;
            case ' ':
                // 空格键控制朗读
                if (!e.target.matches('input, textarea')) {
                    e.preventDefault();
                    toggleSpeech();
                }
                break;
            case 's':
            case 'S':
                // S键开始/停止朗读
                toggleSpeech();
                break;
        }
    });
}

// ========================================
// 全局错误边界
// ========================================

// 全局错误处理
if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
        console.error('全局错误:', event.error);

        // 显示用户友好的错误消息
        showToast('发生了意外错误，请刷新页面重试', 'error');

        // 可选：发送错误到日志服务
        logError({
            message: event.error?.message || '未知错误',
            stack: event.error?.stack,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });

        // 阻止默认错误处理
        event.preventDefault();
    });

    // 处理未捕获的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
        console.error('未处理的 Promise 拒绝:', event.reason);

        showToast('数据加载失败，请重试', 'error');

        logError({
            message: event.reason?.message || '未处理的 Promise 拒绝',
            stack: event.reason?.stack,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            type: 'unhandledrejection'
        });

        // 阻止默认处理
        event.preventDefault();
    });
}

// 错误日志记录（可扩展到发送到服务器）
function logError(errorInfo) {
    // 保存到 localStorage 用于调试
    try {
        const errors = JSON.parse(localStorage.getItem('coca_error_logs') || '[]');
        errors.push(errorInfo);

        // 只保留最近 50 条错误日志
        if (errors.length > 50) {
            errors.shift();
        }

        localStorage.setItem('coca_error_logs', JSON.stringify(errors));
    } catch (e) {
        console.error('无法记录错误:', e);
    }

    // 在开发环境中打印详细信息
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.group('错误详情');
        console.log('消息:', errorInfo.message);
        console.log('堆栈:', errorInfo.stack);
        console.log('URL:', errorInfo.url);
        console.log('时间:', errorInfo.timestamp);
        console.groupEnd();
    }
}

// 获取错误日志
function getErrorLogs() {
    try {
        return JSON.parse(localStorage.getItem('coca_error_logs') || '[]');
    } catch (e) {
        return [];
    }
}

// 清除错误日志
function clearErrorLogs() {
    localStorage.removeItem('coca_error_logs');
    showToast('错误日志已清除', 'info');
}

// ========================================
// 全局搜索功能 (P2-1)
// ========================================

// 搜索缓存（用于存储已加载的文章内容）
let searchContentCache = new Map();
let isSearchCacheLoaded = false;

// 获取搜索历史
function getSearchHistory() {
    try {
        const history = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
        return history ? JSON.parse(history) : [];
    } catch (e) {
        console.error('获取搜索历史失败:', e);
        return [];
    }
}

// 保存搜索历史
function saveSearchHistory(query) {
    if (!query || query.trim().length === 0) return;

    try {
        let history = getSearchHistory();
        // 移除重复项
        history = history.filter(item => item.query !== query);
        // 添加到开头
        history.unshift({
            query: query,
            timestamp: new Date().toISOString()
        });
        // 只保留最近 20 条
        if (history.length > 20) {
            history = history.slice(0, 20);
        }
        localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(history));
    } catch (e) {
        console.error('保存搜索历史失败:', e);
    }
}

// 清除搜索历史
function clearSearchHistory() {
    localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
    showToast('搜索历史已清除', 'info');
    renderSearchHistory();
}

// 加载所有内容到搜索缓存
async function loadSearchCache(book = null) {
    const bookConfig = BOOK_CONFIGS[book || currentBook];
    const totalGroups = bookConfig.totalGroups;

    showToast('正在加载搜索索引...', 'info');

    let loadedCount = 0;
    const batchSize = 5; // 每次加载5个文件

    for (let i = 1; i <= totalGroups; i += batchSize) {
        const promises = [];
        for (let j = 0; j < batchSize && (i + j) <= totalGroups; j++) {
            const groupNum = i + j;
            const cacheKey = `${book || currentBook}_${groupNum}`;

            // 如果已经缓存，跳过
            if (searchContentCache.has(cacheKey)) {
                loadedCount++;
                continue;
            }

            promises.push(
                loadMarkdown(groupNum, book || currentBook, 1)
                    .then(content => {
                        if (content) {
                            searchContentCache.set(cacheKey, {
                                groupNum: groupNum,
                                content: content,
                                book: book || currentBook
                            });
                            loadedCount++;
                        }
                    })
                    .catch(err => {
                        console.error(`加载 Group ${groupNum} 失败:`, err);
                    })
            );
        }

        await Promise.all(promises);

        // 显示进度
        if (i % 20 === 1) {
            showToast(`已加载 ${loadedCount}/${totalGroups} 组...`, 'info');
        }
    }

    isSearchCacheLoaded = true;
    showToast(`搜索索引加载完成 (${loadedCount}/${totalGroups})`, 'success');
    return loadedCount;
}

// 执行搜索
function performSearch(query, options = {}) {
    if (!query || query.trim().length === 0) {
        showToast('请输入搜索内容', 'warning');
        return [];
    }

    const {
        caseSensitive = false,
        useRegex = false,
        fuzzy = false,
        book = currentBook
    } = options;

    const results = [];
    const bookConfig = BOOK_CONFIGS[book];

    try {
        // 创建搜索模式
        let pattern;
        if (useRegex) {
            try {
                pattern = new RegExp(query, caseSensitive ? 'g' : 'gi');
            } catch (e) {
                showToast('正则表达式格式错误', 'error');
                return [];
            }
        } else if (fuzzy) {
            // 模糊搜索：将查询词转换为正则
            const fuzzyPattern = query.split('').join('.*');
            pattern = new RegExp(fuzzyPattern, caseSensitive ? 'g' : 'gi');
        } else {
            // 普通搜索
            const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            pattern = new RegExp(escapedQuery, caseSensitive ? 'g' : 'gi');
        }

        // 搜索缓存中的内容
        for (const [cacheKey, data] of searchContentCache.entries()) {
            if (!cacheKey.startsWith(book + '_')) continue;

            const content = data.content;
            const matches = content.match(pattern);

            if (matches && matches.length > 0) {
                // 提取上下文
                const contexts = extractContexts(content, pattern, 3);

                results.push({
                    groupNum: data.groupNum,
                    book: data.book,
                    matchCount: matches.length,
                    contexts: contexts,
                    matches: [...new Set(matches)] // 去重
                });
            }
        }

        // 按匹配数量排序
        results.sort((a, b) => b.matchCount - a.matchCount);

        // 保存搜索历史
        saveSearchHistory(query);

        return results;

    } catch (error) {
        console.error('搜索出错:', error);
        showToast('搜索过程中发生错误', 'error');
        return [];
    }
}

// 提取上下文片段
function extractContexts(content, pattern, maxContexts = 3) {
    const contexts = [];
    const lines = content.split('\n');
    let foundCount = 0;

    for (let i = 0; i < lines.length && foundCount < maxContexts; i++) {
        const line = lines[i];
        if (pattern.test(line)) {
            // 重置 lastIndex（因为使用了全局匹配）
            pattern.lastIndex = 0;

            // 获取上下文（前后各一行）
            const start = Math.max(0, i - 1);
            const end = Math.min(lines.length, i + 2);
            const contextLines = lines.slice(start, end);

            contexts.push({
                lineNumber: i + 1,
                context: contextLines.join(' ').trim().substring(0, 200) // 限制长度
            });

            foundCount++;
        }
    }

    return contexts;
}

// 打开搜索模态框
function openSearchModal() {
    // 检查是否已存在模态框
    let modal = document.getElementById('searchModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('searchInput').focus();
        return;
    }

    // 创建搜索模态框
    modal = document.createElement('div');
    modal.id = 'searchModal';
    modal.className = 'search-modal';
    modal.innerHTML = `
        <div class="search-modal-content">
            <div class="search-modal-header">
                <h2>🔍 全局搜索</h2>
                <button class="close-btn" onclick="closeSearchModal()">&times;</button>
            </div>

            <div class="search-input-container">
                <input type="text"
                       id="searchInput"
                       class="search-input"
                       placeholder="输入单词或短语..."
                       autocomplete="off">
                <button class="search-btn" onclick="executeSearch()">搜索</button>
            </div>

            <div class="search-options">
                <label>
                    <input type="checkbox" id="searchCaseSensitive"> 区分大小写
                </label>
                <label>
                    <input type="checkbox" id="searchRegex"> 正则表达式
                </label>
                <label>
                    <input type="checkbox" id="searchFuzzy"> 模糊匹配
                </label>
                <label>
                    <select id="searchBook">
                        <option value="book1">Book 1 (原版)</option>
                        <option value="book2">Book 2 (重排版)</option>
                    </select>
                </label>
            </div>

            <div class="search-history-section">
                <div class="search-history-header">
                    <span>搜索历史</span>
                    <button class="clear-history-btn" onclick="clearSearchHistory()">清除</button>
                </div>
                <div id="searchHistoryList" class="search-history-list"></div>
            </div>

            <div class="search-stats" id="searchStats"></div>

            <div class="search-results" id="searchResults">
                <div class="search-placeholder">
                    输入关键词开始搜索，支持单词、短语和正则表达式
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 设置当前书籍
    document.getElementById('searchBook').value = currentBook;

    // 绑定回车键搜索
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            executeSearch();
        }
    });

    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeSearchModal();
        }
    });

    // 渲染搜索历史
    renderSearchHistory();

    // 聚焦输入框
    searchInput.focus();

    // 检查是否需要加载搜索缓存
    const selectedBook = document.getElementById('searchBook').value;
    const bookConfig = BOOK_CONFIGS[selectedBook];
    const cacheKey = `${selectedBook}_1`;

    if (!searchContentCache.has(cacheKey)) {
        const statsDiv = document.getElementById('searchStats');
        statsDiv.innerHTML = `
            <div class="search-info">
                <span>⚠️ 首次搜索需要加载索引，请稍候...</span>
                <button class="load-cache-btn" onclick="loadSearchCacheManually()">立即加载</button>
            </div>
        `;
    }
}

// 手动加载搜索缓存
async function loadSearchCacheManually() {
    const selectedBook = document.getElementById('searchBook').value;
    await loadSearchCache(selectedBook);

    const statsDiv = document.getElementById('searchStats');
    statsDiv.innerHTML = '<div class="search-info">✅ 索引已加载，可以开始搜索</div>';
}

// 关闭搜索模态框
function closeSearchModal() {
    const modal = document.getElementById('searchModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 渲染搜索历史
function renderSearchHistory() {
    const historyList = document.getElementById('searchHistoryList');
    if (!historyList) return;

    const history = getSearchHistory();

    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-history">暂无搜索历史</div>';
        return;
    }

    historyList.innerHTML = history.map(item => `
        <div class="history-item" onclick="searchFromHistory('${escapeHtml(item.query)}')">
            <span class="history-query">${escapeHtml(item.query)}</span>
            <span class="history-time">${formatSearchTime(item.timestamp)}</span>
        </div>
    `).join('');
}

// 从历史记录搜索
function searchFromHistory(query) {
    document.getElementById('searchInput').value = query;
    executeSearch();
}

// 执行搜索
async function executeSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) {
        showToast('请输入搜索内容', 'warning');
        return;
    }

    const caseSensitive = document.getElementById('searchCaseSensitive').checked;
    const useRegex = document.getElementById('searchRegex').checked;
    const fuzzy = document.getElementById('searchFuzzy').checked;
    const selectedBook = document.getElementById('searchBook').value;

    // 检查是否需要加载缓存
    const cacheKey = `${selectedBook}_1`;
    if (!searchContentCache.has(cacheKey)) {
        await loadSearchCache(selectedBook);
    }

    // 执行搜索
    showToast('正在搜索...', 'info');

    const results = performSearch(query, {
        caseSensitive,
        useRegex,
        fuzzy,
        book: selectedBook
    });

    // 显示结果
    displaySearchResults(results, query);

    // 更新搜索历史显示
    renderSearchHistory();
}

// 显示搜索结果
function displaySearchResults(results, query) {
    const resultsDiv = document.getElementById('searchResults');
    const statsDiv = document.getElementById('searchStats');

    if (!results || results.length === 0) {
        statsDiv.innerHTML = `<div class="search-info">未找到匹配结果</div>`;
        resultsDiv.innerHTML = `
            <div class="no-results">
                <p>😔 未找到 "${escapeHtml(query)}" 的相关内容</p>
                <p class="search-tip">提示：尝试使用模糊匹配或更改搜索词</p>
            </div>
        `;
        return;
    }

    // 统计信息
    const totalMatches = results.reduce((sum, r) => sum + r.matchCount, 0);
    statsDiv.innerHTML = `
        <div class="search-info">
            找到 <strong>${results.length}</strong> 个分组，共 <strong>${totalMatches}</strong> 处匹配
        </div>
    `;

    // 渲染结果
    resultsDiv.innerHTML = results.map((result, index) => {
        const bookConfig = BOOK_CONFIGS[result.book];
        return `
            <div class="search-result-item">
                <div class="result-header">
                    <span class="result-group">
                        📚 ${bookConfig.name} - Group ${result.groupNum}
                    </span>
                    <span class="result-count">${result.matchCount} 处匹配</span>
                    <button class="result-goto-btn" onclick="gotoSearchResult(${result.groupNum}, '${result.book}')">
                        前往 →
                    </button>
                </div>
                <div class="result-contexts">
                    ${result.contexts.map(ctx => `
                        <div class="result-context">
                            <span class="context-line">Line ${ctx.lineNumber}:</span>
                            <span class="context-text">${highlightSearchTerm(ctx.context, query)}</span>
                        </div>
                    `).join('')}
                </div>
                ${result.matches.length > 0 ? `
                    <div class="result-matches">
                        匹配词: ${result.matches.slice(0, 5).map(m => `<code>${escapeHtml(m)}</code>`).join(', ')}
                        ${result.matches.length > 5 ? `<span>... 等 ${result.matches.length} 个</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// 跳转到搜索结果
function gotoSearchResult(groupNum, book) {
    // 保存搜索词到 sessionStorage，以便在 viewer 页面高亮显示
    const query = document.getElementById('searchInput').value.trim();
    sessionStorage.setItem('searchHighlight', query);

    // 跳转到对应页面
    window.location.href = `viewer.html?group=${groupNum}&book=${book}`;
}

// 高亮搜索词
function highlightSearchTerm(text, query) {
    if (!query) return escapeHtml(text);

    try {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return escapeHtml(text).replace(regex, '<mark>$1</mark>');
    } catch (e) {
        return escapeHtml(text);
    }
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 格式化搜索时间
function formatSearchTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;

    return date.toLocaleDateString('zh-CN');
}

// 在 viewer 页面高亮搜索词
function highlightSearchTermInViewer() {
    const searchTerm = sessionStorage.getItem('searchHighlight');
    if (!searchTerm) return;

    const readingContent = document.getElementById('readingContent');
    if (!readingContent) return;

    try {
        const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');

        // 递归高亮文本节点
        function highlightNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                if (regex.test(text)) {
                    const span = document.createElement('span');
                    span.innerHTML = text.replace(regex, '<mark class="search-highlight">$1</mark>');
                    node.parentNode.replaceChild(span, node);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                Array.from(node.childNodes).forEach(highlightNode);
            }
        }

        highlightNode(readingContent);

        // 清除搜索高亮标记
        sessionStorage.removeItem('searchHighlight');

        // 显示提示
        showToast(`已高亮显示 "${searchTerm}"`, 'info');

    } catch (e) {
        console.error('高亮搜索词失败:', e);
    }
}

// ========================================
// 学习统计功能 (P2-2)
// ========================================

// Chart.js 实例存储
let progressChart = null;
let dailyVocabChart = null;
let studyTimeChart = null;

// 学习会话跟踪
let currentSessionStartTime = null;
let isSessionActive = false;

// 获取学习统计数据
function getLearningStats() {
    try {
        const stats = localStorage.getItem(STORAGE_KEYS.LEARNING_STATS);
        return stats ? JSON.parse(stats) : {
            totalStudyTime: 0, // 总学习时长（分钟）
            dailyVocabulary: {}, // { "2025-11-17": 50, ... }
            dailyStudyTime: {}, // { "2025-11-17": 30, ... }
            completionDates: {}, // { "book1_1": "2025-11-17", ... }
            lastUpdateDate: null
        };
    } catch (e) {
        console.error('获取学习统计失败:', e);
        return {
            totalStudyTime: 0,
            dailyVocabulary: {},
            dailyStudyTime: {},
            completionDates: {},
            lastUpdateDate: null
        };
    }
}

// 保存学习统计数据
function saveLearningStats(stats) {
    try {
        stats.lastUpdateDate = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.LEARNING_STATS, JSON.stringify(stats));
    } catch (e) {
        console.error('保存学习统计失败:', e);
    }
}

// 开始学习会话
function startStudySession() {
    if (!isSessionActive) {
        currentSessionStartTime = Date.now();
        isSessionActive = true;
    }
}

// 结束学习会话并记录时长
function endStudySession() {
    if (isSessionActive && currentSessionStartTime) {
        const duration = Math.floor((Date.now() - currentSessionStartTime) / 1000 / 60); // 分钟
        if (duration > 0) {
            recordStudyTime(duration);
        }
        currentSessionStartTime = null;
        isSessionActive = false;
    }
}

// 记录学习时长
function recordStudyTime(minutes) {
    const stats = getLearningStats();
    const today = getTodayDateString();

    stats.totalStudyTime += minutes;
    stats.dailyStudyTime[today] = (stats.dailyStudyTime[today] || 0) + minutes;

    saveLearningStats(stats);
}

// 记录完成的组（重写原有函数以添加统计）
const originalToggleComplete = window.toggleComplete;
function toggleCompleteWithStats() {
    // 调用原有函数
    if (typeof originalToggleComplete === 'function') {
        originalToggleComplete();
    }

    // 记录统计
    const completed = isGroupCompleted(currentGroup, currentBook);
    const stats = getLearningStats();
    const today = getTodayDateString();
    const groupKey = `${currentBook}_${currentGroup}`;

    if (completed) {
        // 新完成一个组
        if (!stats.completionDates[groupKey]) {
            const bookConfig = BOOK_CONFIGS[currentBook];
            const vocabCount = bookConfig.wordsPerGroup;

            stats.dailyVocabulary[today] = (stats.dailyVocabulary[today] || 0) + vocabCount;
            stats.completionDates[groupKey] = today;

            saveLearningStats(stats);
            showToast(`已记录今日学习 ${vocabCount} 个词汇`, 'success');
        }
    } else {
        // 取消完成
        if (stats.completionDates[groupKey]) {
            const completionDate = stats.completionDates[groupKey];
            const bookConfig = BOOK_CONFIGS[currentBook];
            const vocabCount = bookConfig.wordsPerGroup;

            if (stats.dailyVocabulary[completionDate]) {
                stats.dailyVocabulary[completionDate] -= vocabCount;
                if (stats.dailyVocabulary[completionDate] <= 0) {
                    delete stats.dailyVocabulary[completionDate];
                }
            }
            delete stats.completionDates[groupKey];

            saveLearningStats(stats);
        }
    }

    // 刷新统计图表（如果在首页）
    if (typeof renderAllCharts === 'function') {
        renderAllCharts();
    }
}

// 替换原有的 toggleComplete 函数
if (typeof window !== 'undefined') {
    window.toggleComplete = toggleCompleteWithStats;
}

// 获取今天的日期字符串 (YYYY-MM-DD)
function getTodayDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

// 获取最近N天的日期列表
function getRecentDates(days) {
    const dates = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
}

// 切换统计显示
function toggleStatistics() {
    const content = document.getElementById('statsContent');
    const toggleBtn = document.getElementById('toggleStatsBtn');
    const icon = document.getElementById('statsToggleIcon');

    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▲';
        toggleBtn.innerHTML = `<span id="statsToggleIcon">▲</span> 收起`;

        // 渲染所有图表
        renderAllCharts();
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
        toggleBtn.innerHTML = `<span id="statsToggleIcon">▼</span> 展开`;
    }
}

// 渲染所有图表
function renderAllCharts() {
    renderProgressChart();
    renderDailyVocabChart();
    renderStudyTimeChart();
    renderHeatmap();
}

// 1. 进度饼图
function renderProgressChart() {
    const canvas = document.getElementById('progressChart');
    if (!canvas) return;

    const bookConfig = BOOK_CONFIGS[currentBook];
    const completedCount = getCompletedGroupsCount(currentBook);
    const totalGroups = bookConfig.totalGroups;
    const remainingCount = totalGroups - completedCount;

    // 销毁旧图表
    if (progressChart) {
        progressChart.destroy();
    }

    // 创建新图表
    const ctx = canvas.getContext('2d');
    progressChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['已完成', '未完成'],
            datasets: [{
                data: [completedCount, remainingCount],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(229, 231, 235, 0.5)'
                ],
                borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(229, 231, 235, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const percentage = ((value / totalGroups) * 100).toFixed(1);
                            return `${label}: ${value} 组 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // 更新图例
    const legend = document.getElementById('progressLegend');
    if (legend) {
        const percentage = ((completedCount / totalGroups) * 100).toFixed(1);
        legend.innerHTML = `
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(34, 197, 94, 0.8);"></span>
                <span>已完成: ${completedCount} 组 (${percentage}%)</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: rgba(229, 231, 235, 0.5);"></span>
                <span>未完成: ${remainingCount} 组</span>
            </div>
        `;
    }
}

// 2. 每日词汇量柱状图
function renderDailyVocabChart() {
    const canvas = document.getElementById('dailyVocabChart');
    if (!canvas) return;

    const stats = getLearningStats();
    const dates = getRecentDates(7);
    const data = dates.map(date => stats.dailyVocabulary[date] || 0);

    // 格式化日期标签
    const labels = dates.map(date => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    // 销毁旧图表
    if (dailyVocabChart) {
        dailyVocabChart.destroy();
    }

    // 创建新图表
    const ctx = canvas.getContext('2d');
    dailyVocabChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '词汇量',
                data: data,
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} 个词`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 25
                    }
                }
            }
        }
    });
}

// 3. 学习时长图表
function renderStudyTimeChart() {
    const canvas = document.getElementById('studyTimeChart');
    if (!canvas) return;

    const stats = getLearningStats();
    const dates = getRecentDates(7);
    const data = dates.map(date => stats.dailyStudyTime[date] || 0);

    // 格式化日期标签
    const labels = dates.map(date => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    // 销毁旧图表
    if (studyTimeChart) {
        studyTimeChart.destroy();
    }

    // 创建新图表
    const ctx = canvas.getContext('2d');
    studyTimeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '学习时长',
                data: data,
                backgroundColor: 'rgba(168, 85, 247, 0.2)',
                borderColor: 'rgba(168, 85, 247, 1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: 'rgba(168, 85, 247, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} 分钟`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 10,
                        callback: function(value) {
                            return value + ' 分钟';
                        }
                    }
                }
            }
        }
    });

    // 更新时长摘要
    const summary = document.getElementById('timeSummary');
    if (summary) {
        const totalWeek = data.reduce((sum, val) => sum + val, 0);
        const avgDaily = totalWeek > 0 ? (totalWeek / 7).toFixed(1) : 0;
        const totalHours = (stats.totalStudyTime / 60).toFixed(1);

        summary.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">本周总计:</span>
                <span class="summary-value">${totalWeek} 分钟</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">日均学习:</span>
                <span class="summary-value">${avgDaily} 分钟</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">累计时长:</span>
                <span class="summary-value">${totalHours} 小时</span>
            </div>
        `;
    }
}

// 4. 学习热力图
function renderHeatmap() {
    const container = document.getElementById('heatmapContainer');
    if (!container) return;

    const stats = getLearningStats();
    const dates = getRecentDates(30);

    // 计算最大值用于颜色缩放
    const values = dates.map(date => stats.dailyVocabulary[date] || 0);
    const maxValue = Math.max(...values, 1);

    // 生成热力图格子
    let html = '<div class="heatmap-grid">';

    dates.forEach(date => {
        const value = stats.dailyVocabulary[date] || 0;
        const intensity = maxValue > 0 ? value / maxValue : 0;

        // 根据强度选择颜色
        let colorClass = 'level-0';
        if (intensity > 0.75) colorClass = 'level-4';
        else if (intensity > 0.5) colorClass = 'level-3';
        else if (intensity > 0.25) colorClass = 'level-2';
        else if (intensity > 0) colorClass = 'level-1';

        const d = new Date(date);
        const dateLabel = `${d.getMonth() + 1}月${d.getDate()}日`;

        html += `
            <div class="heatmap-cell ${colorClass}"
                 title="${dateLabel}: ${value} 词"
                 data-date="${date}"
                 data-value="${value}">
            </div>
        `;
    });

    html += '</div>';

    // 添加图例
    html += `
        <div class="heatmap-legend">
            <span>少</span>
            <div class="heatmap-cell level-0"></div>
            <div class="heatmap-cell level-1"></div>
            <div class="heatmap-cell level-2"></div>
            <div class="heatmap-cell level-3"></div>
            <div class="heatmap-cell level-4"></div>
            <span>多</span>
        </div>
    `;

    container.innerHTML = html;
}

// 在首页初始化时启动学习会话跟踪
if (typeof window !== 'undefined' && window.location.pathname.includes('index.html')) {
    window.addEventListener('load', () => {
        startStudySession();
    });

    window.addEventListener('beforeunload', () => {
        endStudySession();
    });
}

// 在viewer页面也跟踪学习时间
if (typeof window !== 'undefined' && window.location.pathname.includes('viewer.html')) {
    window.addEventListener('load', () => {
        startStudySession();
    });

    window.addEventListener('beforeunload', () => {
        endStudySession();
    });

    // 每5分钟自动保存一次学习时长
    setInterval(() => {
        if (isSessionActive && currentSessionStartTime) {
            const duration = Math.floor((Date.now() - currentSessionStartTime) / 1000 / 60);
            if (duration >= 5) {
                recordStudyTime(5);
                currentSessionStartTime = Date.now(); // 重置开始时间
            }
        }
    }, 5 * 60 * 1000); // 5分钟
}

// ========================================
// CSS 动画（添加到页面中）
// ========================================
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}
