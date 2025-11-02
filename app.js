// ========================================
// 全局变量和配置
// ========================================
const TOTAL_GROUPS = 100;
const GROUPS_PER_BATCH = 10;
const WORDS_PER_GROUP = 50;

// LocalStorage 键名
const STORAGE_KEYS = {
    COMPLETED_GROUPS: 'coca_completed_groups',
    USER_NOTES: 'coca_user_notes_',
    FONT_SIZE: 'coca_font_size',
    BOLD_VISIBLE: 'coca_bold_visible'
};

// ========================================
// 工具函数
// ========================================

// 获取已完成的组
function getCompletedGroups() {
    const stored = localStorage.getItem(STORAGE_KEYS.COMPLETED_GROUPS);
    return stored ? JSON.parse(stored) : [];
}

// 保存已完成的组
function saveCompletedGroups(groups) {
    localStorage.setItem(STORAGE_KEYS.COMPLETED_GROUPS, JSON.stringify(groups));
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
async function loadMarkdown(groupNum) {
    try {
        const response = await fetch(`reading_materials/group${groupNum}_reading.md`);
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
function parseMarkdownSections(markdown) {
    const sections = {
        title: '',
        reading: '',
        summary: '',
        translation: '',
        vocabulary: '',
        sentences: '',
        memory: '',
        practice: ''
    };

    if (!markdown) return sections;

    // 提取标题
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    if (titleMatch) {
        sections.title = titleMatch[1];
    }

    // 分割不同的部分
    const parts = markdown.split(/^##\s+/m);

    parts.forEach(part => {
        const lines = part.trim().split('\n');
        const heading = lines[0];
        const content = lines.slice(1).join('\n').trim();

        if (heading.includes('Reading Passage') || heading.includes('📖 Reading Passage')) {
            sections.reading = content;
        } else if (heading.includes('文章概要') || heading.includes('Story Summary')) {
            sections.summary = content;
        } else if (heading.includes('中文翻译') || heading.includes('Chinese Translation')) {
            sections.translation = content;
        } else if (heading.includes('重点词汇注释') || heading.includes('Key Vocabulary')) {
            sections.vocabulary = content;
        } else if (heading.includes('重点句子分析') || heading.includes('Key Sentence Analysis')) {
            sections.sentences = content;
        } else if (heading.includes('记忆技巧') || heading.includes('Memory Techniques')) {
            sections.memory = content;
        } else if (heading.includes('练习建议') || heading.includes('Practice Suggestions')) {
            sections.practice = content;
        }
    });

    return sections;
}

// ========================================
// 首页功能
// ========================================

function initHomepage() {
    updateStats();
    renderGroupBatches();

    // 添加键盘事件
    document.getElementById('groupSearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            jumpToGroup();
        }
    });
}

function updateStats() {
    const completed = getCompletedGroups();
    const completedCount = completed.length;
    const progress = Math.round((completedCount / TOTAL_GROUPS) * 100);
    const learnedWords = completedCount * WORDS_PER_GROUP;

    document.getElementById('completedGroups').textContent = completedCount;
    document.getElementById('progressPercent').textContent = progress + '%';
}

function renderGroupBatches() {
    const container = document.getElementById('groupsContainer');
    const completed = getCompletedGroups();

    container.innerHTML = '';

    for (let i = 0; i < TOTAL_GROUPS; i += GROUPS_PER_BATCH) {
        const startGroup = i + 1;
        const endGroup = Math.min(i + GROUPS_PER_BATCH, TOTAL_GROUPS);

        // 计算这个批次的完成进度
        let batchCompleted = 0;
        for (let g = startGroup; g <= endGroup; g++) {
            if (completed.includes(g)) {
                batchCompleted++;
            }
        }

        const batchDiv = document.createElement('div');
        batchDiv.className = 'group-batch';
        if (batchCompleted === GROUPS_PER_BATCH) {
            batchDiv.classList.add('completed');
        }

        const progressPercent = Math.round((batchCompleted / GROUPS_PER_BATCH) * 100);

        batchDiv.innerHTML = `
            <h3>Group ${startGroup} - ${endGroup}</h3>
            <div class="group-range">${WORDS_PER_GROUP * GROUPS_PER_BATCH} 个单词</div>
            <div class="group-progress">
                完成进度: ${batchCompleted}/${GROUPS_PER_BATCH}
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
        `;

        batchDiv.addEventListener('click', () => {
            window.location.href = `viewer.html?group=${startGroup}`;
        });

        container.appendChild(batchDiv);
    }
}

function jumpToGroup() {
    const input = document.getElementById('groupSearch');
    const groupNum = parseInt(input.value);

    if (groupNum >= 1 && groupNum <= TOTAL_GROUPS) {
        window.location.href = `viewer.html?group=${groupNum}`;
    } else {
        alert(`请输入 1 到 ${TOTAL_GROUPS} 之间的数字`);
    }
}

// ========================================
// 学习页面功能
// ========================================

let currentGroup = 1;
let currentFontSize = 16;
let boldVisible = true;

async function initViewer() {
    // 获取当前组号
    currentGroup = parseInt(getUrlParameter('group')) || 1;

    // 确保组号在有效范围内
    if (currentGroup < 1) currentGroup = 1;
    if (currentGroup > TOTAL_GROUPS) currentGroup = TOTAL_GROUPS;

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
}

function updateViewerUI() {
    // 更新标题
    document.getElementById('groupTitle').textContent = `Group ${currentGroup}`;
    document.getElementById('currentProgress').textContent = `Group ${currentGroup} / ${TOTAL_GROUPS}`;

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
    document.getElementById('nextBtn').disabled = currentGroup >= TOTAL_GROUPS;
}

async function loadGroupContent(groupNum) {
    // 显示加载状态
    const readingContent = document.getElementById('readingContent');
    readingContent.innerHTML = '<p>正在加载内容...</p>';

    // 加载Markdown文件
    const markdown = await loadMarkdown(groupNum);

    if (!markdown) {
        readingContent.innerHTML = '<p>加载失败，请检查文件是否存在。</p>';
        return;
    }

    // 解析内容
    const sections = parseMarkdownSections(markdown);

    // 渲染各个部分
    renderReading(sections.reading);
    renderTranslation(sections.translation);
    renderVocabulary(sections.vocabulary);
    renderSentences(sections.sentences);
    renderMemory(sections.memory);
    renderPractice(sections.practice);
}

function renderReading(content) {
    const readingContent = document.getElementById('readingContent');

    if (typeof marked !== 'undefined') {
        readingContent.innerHTML = marked.parse(content);
    } else {
        // 如果marked.js没有加载，使用简单的渲染
        readingContent.innerHTML = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                          .replace(/\n\n/g, '</p><p>')
                                          .replace(/^/, '<p>')
                                          .replace(/$/, '</p>');
    }
}

function renderTranslation(content) {
    renderSection('translation', content);
}

function renderVocabulary(content) {
    renderSection('vocabulary', content);
}

function renderSentences(content) {
    renderSection('sentences', content);
}

function renderMemory(content) {
    renderSection('memory', content);
}

function renderPractice(content) {
    renderSection('practice', content);
}

function renderSection(sectionId, content) {
    const element = document.getElementById(sectionId);

    if (typeof marked !== 'undefined') {
        element.innerHTML = marked.parse(content);
    } else {
        element.innerHTML = '<pre>' + content + '</pre>';
    }
}

// ========================================
// 交互功能
// ========================================

function switchTab(tabName) {
    // 移除所有active类
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });

    // 添加active类到当前标签
    event.target.classList.add('active');
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

    if (newGroup >= 1 && newGroup <= TOTAL_GROUPS) {
        window.location.href = `viewer.html?group=${newGroup}`;
    }
}

function loadUserNotes() {
    const key = STORAGE_KEYS.USER_NOTES + currentGroup;
    const notes = localStorage.getItem(key) || '';
    document.getElementById('userNotes').value = notes;
}

function saveNotes() {
    const notes = document.getElementById('userNotes').value;
    const key = STORAGE_KEYS.USER_NOTES + currentGroup;
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

        switch(e.key) {
            case 'ArrowLeft':
                if (currentGroup > 1) {
                    navigateGroup(-1);
                }
                break;
            case 'ArrowRight':
                if (currentGroup < TOTAL_GROUPS) {
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
