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
    THEME: 'coca_theme'
};

const TAB_ORDER = ['translation', 'vocabulary', 'sentences', 'memory', 'practice', 'notes'];

const TAB_EMPTY_MESSAGES = {
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

// 加载Markdown文件
async function loadMarkdown(groupNum, book = null) {
    try {
        const bookConfig = BOOK_CONFIGS[book || currentBook];
        const filePath = `${bookConfig.directory}/${bookConfig.filePrefix}${groupNum}${bookConfig.fileSuffix}`;
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        return text;
    } catch (error) {
        console.error('Error loading markdown:', error);
        return null;
    }
}

// 解析Markdown内容为不同区块
function parseMarkdownSections(markdown, bookKey = currentBook) {
    const sections = {
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

async function initViewer() {
    // 获取当前组号和book
    const bookParam = getUrlParameter('book');
    currentBook = bookParam || getCurrentBook();
    currentGroup = parseInt(getUrlParameter('group')) || 1;

    const bookConfig = BOOK_CONFIGS[currentBook];
    const totalGroups = bookConfig.totalGroups;

    // 确保组号在有效范围内
    if (currentGroup < 1) currentGroup = 1;
    if (currentGroup > totalGroups) currentGroup = totalGroups;

    // 加载保存的设置
    loadViewerSettings();

    // 更新UI
    updateViewerUI();

    // 加载内容
    await loadGroupContent(currentGroup);

    // 加载用户笔记
    loadUserNotes();

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

function saveNotes() {
    const notes = document.getElementById('userNotes').value;
    const key = STORAGE_KEYS.USER_NOTES + currentBook + '_' + currentGroup;
    localStorage.setItem(key, notes);

    const status = document.getElementById('notesSaveStatus');
    status.textContent = '笔记已保存 ✓';

    setTimeout(() => {
        status.textContent = '';
    }, 2000);
}

function showToast(message) {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #10b981;
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
            document.body.removeChild(toast);
        }, 300);
    }, 2000);
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
        }
    });
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
