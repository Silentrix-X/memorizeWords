// 数据存储
let sentences = [];
let currentIndex = 0;

// DOM 元素
const sentenceTextEl = document.getElementById('sentence-text');
const translationTextEl = document.getElementById('translation-text');
const importBtn = document.getElementById('import-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const importModal = document.getElementById('import-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');
const sentenceInput = document.getElementById('sentence-input');
const translationInput = document.getElementById('translation-input');
const wordsInput = document.getElementById('words-input');
const currentDateEl = document.getElementById('current-date');

// 管理相关元素
const manageBtn = document.getElementById('manage-btn');
const manageModal = document.getElementById('manage-modal');
const manageOverlay = document.getElementById('manage-overlay');
const closeManageModalBtn = document.getElementById('close-manage-modal');
const addSentenceBtn = document.getElementById('add-sentence-btn');
const exportBtn = document.getElementById('export-btn');
const importBatchBtn = document.getElementById('import-batch-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const sentenceList = document.getElementById('sentence-list');
const emptyState = document.getElementById('empty-state');

// 编辑相关元素
const editModal = document.getElementById('edit-modal');
const editOverlay = document.getElementById('edit-overlay');
const closeEditModalBtn = document.getElementById('close-edit-modal');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const saveEditBtn = document.getElementById('save-edit-btn');
const editSentenceInput = document.getElementById('edit-sentence-input');
const editTranslationInput = document.getElementById('edit-translation-input');
const editTitle = document.getElementById('edit-title');
let editingSentenceId = null;

// 批量导入相关元素
const importBatchModal = document.getElementById('import-batch-modal');
const importBatchOverlay = document.getElementById('import-batch-overlay');
const closeImportBatchModalBtn = document.getElementById('close-import-batch-modal');
const cancelImportBatchBtn = document.getElementById('cancel-import-batch-btn');
const saveImportBatchBtn = document.getElementById('save-import-batch-btn');
const batchJsonInput = document.getElementById('batch-json-input');
const batchFileInput = document.getElementById('batch-file-input');
const selectFileBtn = document.getElementById('select-file-btn');
const fileNameSpan = document.getElementById('file-name');
const jsonExample = document.getElementById('json-example');
const copyExampleBtn = document.getElementById('copy-example-btn');

// 初始化
async function init() {
    loadSentences();
    updateDate();
    await displayCurrentSentence();
    setupEventListeners();
}

// 设置事件监听
function setupEventListeners() {
    importBtn.addEventListener('click', () => {
        importModal.classList.add('show');
        clearForm();
    });

    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // 管理功能事件
    manageBtn.addEventListener('click', () => {
        manageModal.classList.add('show');
        renderSentenceList();
    });

    closeManageModalBtn.addEventListener('click', closeManageModal);
    manageOverlay.addEventListener('click', closeManageModal);
    addSentenceBtn.addEventListener('click', () => {
        closeManageModal();
        importModal.classList.add('show');
        clearForm();
    });

    // 导出功能
    exportBtn.addEventListener('click', exportSentences);

    // 清空所有句子
    clearAllBtn.addEventListener('click', clearAllSentences);

    // 批量导入功能
    importBatchBtn.addEventListener('click', () => {
        importBatchModal.classList.add('show');
        batchJsonInput.value = '';
        batchFileInput.value = '';
        fileNameSpan.textContent = '';
        loadJsonExample();
    });

    // 复制示例
    copyExampleBtn.addEventListener('click', copyJsonExample);

    closeImportBatchModalBtn.addEventListener('click', closeImportBatchModal);
    importBatchOverlay.addEventListener('click', closeImportBatchModal);
    cancelImportBatchBtn.addEventListener('click', closeImportBatchModal);
    saveImportBatchBtn.addEventListener('click', importBatchSentences);

    // 文件选择
    selectFileBtn.addEventListener('click', () => {
        batchFileInput.click();
    });

    batchFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameSpan.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (event) => {
                batchJsonInput.value = event.target.result;
            };
            reader.readAsText(file);
        }
    });

    // 编辑功能事件
    closeEditModalBtn.addEventListener('click', closeEditModal);
    editOverlay.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);
    saveEditBtn.addEventListener('click', saveEditSentence);

    saveBtn.addEventListener('click', saveSentence);

    prevBtn.addEventListener('click', async () => {
        if (currentIndex > 0) {
            currentIndex--;
            await displayCurrentSentence();
        }
    });

    nextBtn.addEventListener('click', async () => {
        if (currentIndex < sentences.length - 1) {
            currentIndex++;
            await displayCurrentSentence();
        }
    });

    // 点击模态框外部关闭
    importModal.addEventListener('click', (e) => {
        if (e.target === importModal) {
            closeModal();
        }
    });

    // 悬停和点击单词处理
    const dictionaryModal = document.getElementById('dictionary-modal');
    const dictionaryOverlay = document.getElementById('dictionary-overlay');
    const dictionaryCloseBtn = document.getElementById('dictionary-close-btn');
    const dictionaryIframe = document.getElementById('dictionary-iframe');
    const dictionaryWord = document.getElementById('dictionary-word');
    const dictionaryLink = document.getElementById('dictionary-link');
    const dictionaryLoading = document.querySelector('.dictionary-loading');
    const wordTooltip = document.getElementById('word-tooltip');
    const tooltipWord = document.getElementById('tooltip-word');
    const tooltipMeaning = document.getElementById('tooltip-meaning');
    const tooltipLoading = document.getElementById('tooltip-loading');
    
    let tooltipTimeout = null;
    let currentHoverWord = null;
    const translationCache = {}; // 翻译缓存
    let selectedWordElements = []; // 选中的单词元素数组

    // 获取所有选中单词的文本
    function getSelectedWordsText() {
        const selectedWords = document.querySelectorAll('.word.selected');
        if (selectedWords.length === 0) {
            return null;
        }
        
        // 按在DOM中的顺序获取文本
        const words = Array.from(selectedWords)
            .map(el => el.textContent.trim().replace(/[.,!?;:]/g, ''))
            .filter(word => word.length > 0)
            .join(' ');
        
        return words.length > 0 ? { text: words, elements: Array.from(selectedWords) } : null;
    }

    // 显示选中单词的翻译
    async function showSelectedWordsTranslation() {
        const selection = getSelectedWordsText();
        if (!selection || selection.elements.length === 0) {
            hideWordTooltip();
            return;
        }
        
        const selectedText = selection.text.toLowerCase().trim();
        if (selectedText.length === 0) {
            return;
        }
        
        // 使用第一个选中单词的位置来定位提示框
        const firstWordElement = selection.elements[0];
        tooltipWord.textContent = selectedText;
        tooltipMeaning.textContent = '';
        tooltipLoading.style.display = 'block';
        wordTooltip.classList.add('show');
        
        // 计算提示框位置
        updateTooltipPosition(firstWordElement);
        
        // 检查缓存
        if (translationCache[selectedText]) {
            tooltipMeaning.textContent = translationCache[selectedText];
            tooltipLoading.style.display = 'none';
            return;
        }
        
        // 获取翻译
        try {
            const translation = await fetchTranslation(selectedText);
            translationCache[selectedText] = translation;
            tooltipMeaning.textContent = translation;
            tooltipLoading.style.display = 'none';
        } catch (error) {
            tooltipMeaning.textContent = '翻译获取失败';
            tooltipLoading.style.display = 'none';
        }
    }

    let clickTimer = null;
    let isDoubleClick = false;

    // 单击单词切换选中状态
    document.addEventListener('click', (e) => {
        // 如果点击的是单词
        if (e.target.classList.contains('word')) {
            // 清除文本选择
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                selection.removeAllRanges();
            }
            
            // 检查是否是双击
            if (isDoubleClick) {
                isDoubleClick = false;
                return;
            }
            
            // 延迟执行单击操作，等待可能的双击
            if (clickTimer) {
                clearTimeout(clickTimer);
            }
            
            clickTimer = setTimeout(() => {
                const wordElement = e.target;
                
                // 切换选中状态
                if (wordElement.classList.contains('selected')) {
                    // 取消选中
                    wordElement.classList.remove('selected');
                } else {
                    // 选中
                    wordElement.classList.add('selected');
                }
                
                // 更新翻译显示
                showSelectedWordsTranslation();
            }, 250); // 等待250ms，如果在这期间有双击则取消
        } else if (!e.target.closest('.sentence-text')) {
            // 点击句子外部，清除所有选中
            document.querySelectorAll('.word.selected').forEach(el => {
                el.classList.remove('selected');
            });
            hideWordTooltip();
        }
    });

    // 悬停显示翻译（仅当单词未被选中时）
    document.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('word')) {
            // 如果单词已被选中，不显示悬停翻译
            if (e.target.classList.contains('selected')) {
                return;
            }
            
            // 如果有其他选中的单词，不显示悬停翻译
            const selectedCount = document.querySelectorAll('.word.selected').length;
            if (selectedCount > 0) {
                return;
            }
            
            const word = e.target.getAttribute('data-word') || e.target.textContent.trim().toLowerCase().replace(/[.,!?;:]/g, '');
            if (word && word.length > 0) {
                currentHoverWord = word;
                tooltipTimeout = setTimeout(() => {
                    showWordTranslation(e.target, word);
                }, 200); // 200ms延迟显示
            }
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('word')) {
            // 如果单词已被选中，不隐藏提示（因为选中单词的翻译应该保持显示）
            if (e.target.classList.contains('selected')) {
                return;
            }
            
            if (tooltipTimeout) {
                clearTimeout(tooltipTimeout);
                tooltipTimeout = null;
            }
            hideWordTooltip();
            currentHoverWord = null;
        }
    });

    // 双击单词显示词典弹窗
    document.addEventListener('dblclick', (e) => {
        if (e.target.classList.contains('word')) {
            // 取消单击事件的延迟执行
            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
            }
            
            isDoubleClick = true;
            
            // 获取双击的单词或选中的短语
            let wordToLookup;
            const selectedWords = document.querySelectorAll('.word.selected');
            
            if (selectedWords.length > 0) {
                // 如果有选中的单词，使用选中的短语
                const phrase = Array.from(selectedWords)
                    .map(el => el.textContent.trim().replace(/[.,!?;:]/g, ''))
                    .filter(word => word.length > 0)
                    .join(' ');
                wordToLookup = phrase;
            } else {
                // 否则使用双击的单词
                wordToLookup = e.target.getAttribute('data-word') || e.target.textContent.trim().toLowerCase().replace(/[.,!?;:]/g, '');
            }
            
            if (wordToLookup) {
                hideWordTooltip();
                showDictionary(wordToLookup);
            }
        }
    });

    dictionaryCloseBtn.addEventListener('click', closeDictionary);
    dictionaryOverlay.addEventListener('click', closeDictionary);

    function showDictionary(word) {
        dictionaryWord.textContent = word;
        const youdaoUrl = `https://www.youdao.com/result?word=${encodeURIComponent(word)}&lang=en`;
        dictionaryLink.href = youdaoUrl;
        dictionaryModal.classList.add('show');
        dictionaryLoading.style.display = 'block';
        dictionaryIframe.style.display = 'none';
        
        // 尝试使用iframe加载
        dictionaryIframe.src = youdaoUrl;
        
        let loadTimeout = setTimeout(() => {
            if (dictionaryLoading.style.display !== 'none') {
                dictionaryLoading.innerHTML = '无法嵌入词典页面<br><small>请点击下方"查看完整页面"链接</small>';
                dictionaryIframe.style.display = 'none';
            }
        }, 3000);
        
        dictionaryIframe.onload = () => {
            clearTimeout(loadTimeout);
            dictionaryLoading.style.display = 'none';
            dictionaryIframe.style.display = 'block';
        };
        
        dictionaryIframe.onerror = () => {
            clearTimeout(loadTimeout);
            dictionaryLoading.innerHTML = '无法嵌入词典页面<br><small>请点击下方"查看完整页面"链接</small>';
            dictionaryIframe.style.display = 'none';
        };
    }

    function closeDictionary() {
        dictionaryModal.classList.remove('show');
        dictionaryIframe.src = '';
    }

    // 显示单词翻译提示（单个单词悬停）
    async function showWordTranslation(wordElement, word) {
        // 如果单词已被选中，不显示悬停翻译
        if (wordElement.classList.contains('selected')) {
            return;
        }
        
        // 如果有其他选中的单词，不显示悬停翻译
        const selectedCount = document.querySelectorAll('.word.selected').length;
        if (selectedCount > 0) {
            return;
        }
        
        if (currentHoverWord !== word) return; // 确保当前悬停的单词没变
        
        tooltipWord.textContent = word;
        tooltipMeaning.textContent = '';
        tooltipLoading.style.display = 'block';
        wordTooltip.classList.add('show');
        
        // 计算提示框位置
        updateTooltipPosition(wordElement);
        
        // 检查缓存
        if (translationCache[word]) {
            tooltipMeaning.textContent = translationCache[word];
            tooltipLoading.style.display = 'none';
            return;
        }
        
        // 获取翻译
        try {
            const translation = await fetchTranslation(word);
            if (currentHoverWord === word) { // 再次检查，确保用户还在悬停这个单词
                translationCache[word] = translation;
                tooltipMeaning.textContent = translation;
                tooltipLoading.style.display = 'none';
            }
        } catch (error) {
            if (currentHoverWord === word) {
                tooltipMeaning.textContent = '翻译获取失败';
                tooltipLoading.style.display = 'none';
            }
        }
    }

    // 隐藏单词翻译提示
    function hideWordTooltip() {
        wordTooltip.classList.remove('show');
    }

    // 更新提示框位置
    function updateTooltipPosition(wordElement) {
        // 先显示以获取尺寸
        wordTooltip.style.visibility = 'hidden';
        wordTooltip.style.display = 'block';
        
        const rect = wordElement.getBoundingClientRect();
        const tooltipRect = wordTooltip.getBoundingClientRect();
        
        const padding = 15; // 距离屏幕边缘的最小距离
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // 初始位置：单词下方居中
        let top = rect.bottom + 10;
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        
        // 确保提示框不超出屏幕右侧
        if (left + tooltipRect.width > viewportWidth - padding) {
            left = viewportWidth - tooltipRect.width - padding;
        }
        
        // 确保提示框不超出屏幕左侧
        if (left < padding) {
            left = padding;
        }
        
        // 如果单词在屏幕左侧，让提示框左对齐到单词
        if (rect.left < viewportWidth / 2 && left < rect.left) {
            left = Math.max(padding, rect.left);
        }
        
        // 确保提示框不超出屏幕底部
        if (top + tooltipRect.height > viewportHeight - padding) {
            top = rect.top - tooltipRect.height - 10;
            // 如果上方也没有空间，放在单词右侧
            if (top < padding) {
                top = Math.max(padding, rect.top);
                left = rect.right + 10;
                // 如果右侧也没有空间，放在单词左侧
                if (left + tooltipRect.width > viewportWidth - padding) {
                    left = rect.left - tooltipRect.width - 10;
                    if (left < padding) {
                        left = padding;
                    }
                }
            }
        }
        
        // 确保顶部不超出屏幕
        if (top < padding) {
            top = padding;
        }
        
        wordTooltip.style.top = `${top}px`;
        wordTooltip.style.left = `${left}px`;
        wordTooltip.style.visibility = 'visible';
    }
}

// 全局翻译函数（供其他函数使用）
async function fetchTranslation(text) {
    // 使用MyMemory Translation API（免费，无需API key）
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
    } else {
        throw new Error('Translation failed');
    }
}

// 更新日期显示
function updateDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[today.getDay()];
    
    currentDateEl.textContent = `${year}年${month}月${day}日 ${weekday}`;
}

// 显示当前句子
async function displayCurrentSentence() {
    if (sentences.length === 0) {
        sentenceTextEl.innerHTML = '<span class="word-placeholder">点击导入按钮添加今日句子</span>';
        translationTextEl.innerHTML = '<span class="word-placeholder">翻译将显示在这里</span>';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    const sentence = sentences[currentIndex];
    if (!sentence) return;

    // 显示句子，每个单词可点击跳转到有道词典
    const words = sentence.sentence.split(/(\s+|[.,!?;:])/);
    sentenceTextEl.innerHTML = words.map(word => {
        const cleanWord = word.trim().replace(/[.,!?;:]/g, '');
        if (!cleanWord) return word;
        
        // 所有单词都可以点击，跳转到有道词典
        const wordLower = cleanWord.toLowerCase();
        return `<span class="word" data-word="${wordLower}">${word}</span>`;
    }).join('');

    // 显示翻译，如果没有则自动获取
    if (sentence.translation) {
        translationTextEl.textContent = sentence.translation;
    } else {
        // 如果没有翻译，显示加载状态并自动获取
        translationTextEl.innerHTML = '<span class="word-placeholder">正在获取翻译...</span>';
        try {
            const translation = await fetchTranslation(sentence.sentence);
            sentence.translation = translation;
            translationTextEl.textContent = translation;
            // 保存更新后的翻译
            saveSentences();
        } catch (error) {
            translationTextEl.innerHTML = '<span class="word-placeholder">翻译获取失败，请手动输入</span>';
        }
    }

    // 更新按钮状态
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === sentences.length - 1;
}

// 显示单词提示
function showWordTooltip(wordElement, word, meaning) {
    // 移除之前的active状态
    document.querySelectorAll('.word.active').forEach(el => {
        el.classList.remove('active');
    });
    
    // 添加active状态
    wordElement.classList.add('active');

    tooltipWordEl.textContent = word;
    tooltipMeaningEl.textContent = meaning;
    
    wordTooltipEl.classList.add('show');
    
    // 计算位置
    const rect = wordElement.getBoundingClientRect();
    const tooltipRect = wordTooltipEl.getBoundingClientRect();
    
    let top = rect.bottom + 10;
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    
    // 确保提示框不超出屏幕
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
    }
    
    if (top + tooltipRect.height > window.innerHeight - 10) {
        top = rect.top - tooltipRect.height - 10;
    }
    
    wordTooltipEl.style.top = `${top}px`;
    wordTooltipEl.style.left = `${left}px`;
}

// 隐藏单词提示
function hideWordTooltip() {
    wordTooltipEl.classList.remove('show');
    document.querySelectorAll('.word.active').forEach(el => {
        el.classList.remove('active');
    });
}

// 关闭模态框
function closeModal() {
    importModal.classList.remove('show');
    clearForm();
}

// 清空表单
function clearForm() {
    sentenceInput.value = '';
    translationInput.value = '';
    wordsInput.value = '';
}

// 保存句子
async function saveSentence() {
    const sentence = sentenceInput.value.trim();
    let translation = translationInput.value.trim();
    const wordsStr = wordsInput.value.trim();

    if (!sentence) {
        alert('请输入英文句子！');
        return;
    }

    // 如果没有输入翻译，自动获取
    if (!translation) {
        translationInput.value = '正在获取翻译...';
        try {
            translation = await fetchTranslation(sentence);
            translationInput.value = translation;
        } catch (error) {
            alert('自动翻译失败，请手动输入中文翻译！');
            translationInput.value = '';
            return;
        }
    }

    let words = {};
    if (wordsStr) {
        try {
            words = JSON.parse(wordsStr);
        } catch (e) {
            alert('单词释义格式错误！请使用正确的JSON格式。');
            return;
        }
    }

    // 如果没有提供单词释义，尝试从句子中提取单词
    if (Object.keys(words).length === 0) {
        const sentenceWords = sentence.toLowerCase().match(/\b[a-z]+\b/g) || [];
        sentenceWords.forEach(word => {
            words[word] = '（未定义）';
        });
    }

    const newSentence = {
        id: Date.now(),
        sentence: sentence,
        translation: translation,
        words: words,
        date: new Date().toISOString().split('T')[0]
    };

    sentences.push(newSentence);
    currentIndex = sentences.length - 1;
    
    saveSentences();
    await displayCurrentSentence();
    closeModal();
}

// 保存到本地存储
function saveSentences() {
    localStorage.setItem('sentences', JSON.stringify(sentences));
    localStorage.setItem('currentIndex', currentIndex.toString());
}

// 从本地存储加载
function loadSentences() {
    const saved = localStorage.getItem('sentences');
    const savedIndex = localStorage.getItem('currentIndex');
    
    if (saved) {
        try {
            sentences = JSON.parse(saved);
            currentIndex = savedIndex ? parseInt(savedIndex) : sentences.length - 1;
            if (currentIndex < 0 || currentIndex >= sentences.length) {
                currentIndex = Math.max(0, sentences.length - 1);
            }
        } catch (e) {
            console.error('加载数据失败:', e);
            sentences = [];
            currentIndex = 0;
        }
    }
}

// 渲染句子列表
function renderSentenceList() {
    if (sentences.length === 0) {
        emptyState.style.display = 'block';
        sentenceList.innerHTML = '';
        return;
    }

    emptyState.style.display = 'none';
    
    sentenceList.innerHTML = sentences.map((sentence, index) => {
        const date = new Date(sentence.date);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const isCurrent = index === currentIndex;
        // 确保ID是字符串格式，避免精度问题
        const sentenceId = String(sentence.id);
        
        return `
            <div class="sentence-item ${isCurrent ? 'current' : ''}" data-id="${sentenceId}">
                <div class="sentence-item-content">
                    <div class="sentence-item-header">
                        <span class="sentence-index">#${index + 1}</span>
                        <span class="sentence-date">${dateStr}</span>
                        ${isCurrent ? '<span class="current-badge">当前</span>' : ''}
                    </div>
                    <div class="sentence-item-text">
                        <div class="sentence-item-english">${sentence.sentence}</div>
                        <div class="sentence-item-translation">${sentence.translation || '（无翻译）'}</div>
                    </div>
                </div>
                <div class="sentence-item-actions">
                    <button class="btn-icon btn-edit" data-id="${sentenceId}" title="编辑">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon btn-delete" data-id="${sentenceId}" title="删除">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                    <button class="btn-icon btn-view" data-id="${sentenceId}" title="查看">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // 绑定列表项事件
    sentenceList.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const button = e.target.closest('.btn-edit');
            if (!button) return;
            const idAttr = button.getAttribute('data-id');
            // 尝试解析为数字，如果失败则使用原始值
            const id = isNaN(idAttr) ? idAttr : parseFloat(idAttr);
            editSentence(id);
        });
    });

    sentenceList.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const button = e.target.closest('.btn-delete');
            if (!button) return;
            const idAttr = button.getAttribute('data-id');
            // 尝试解析为数字，如果失败则使用原始值
            const id = isNaN(idAttr) ? idAttr : parseFloat(idAttr);
            deleteSentence(id);
        });
    });

    sentenceList.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const button = e.target.closest('.btn-view');
            if (!button) return;
            const idAttr = button.getAttribute('data-id');
            // 尝试解析为数字，如果失败则使用原始值
            const id = isNaN(idAttr) ? idAttr : parseFloat(idAttr);
            viewSentence(id);
        });
    });
}

// 关闭管理模态框
function closeManageModal() {
    manageModal.classList.remove('show');
}

// 编辑句子
function editSentence(id) {
    // 使用宽松的比较，支持数字和字符串ID
    const sentence = sentences.find(s => s.id == id || String(s.id) === String(id));
    if (!sentence) {
        console.error('找不到句子，ID:', id, '所有ID:', sentences.map(s => s.id));
        return;
    }

    editingSentenceId = id;
    editTitle.textContent = '编辑句子';
    editSentenceInput.value = sentence.sentence;
    editTranslationInput.value = sentence.translation || '';
    editModal.classList.add('show');
}

// 保存编辑
async function saveEditSentence() {
    const sentence = editSentenceInput.value.trim();
    let translation = editTranslationInput.value.trim();

    if (!sentence) {
        alert('请输入英文句子！');
        return;
    }

    // 如果没有输入翻译，自动获取
    if (!translation) {
        editTranslationInput.value = '正在获取翻译...';
        try {
            translation = await fetchTranslation(sentence);
            editTranslationInput.value = translation;
        } catch (error) {
            alert('自动翻译失败，请手动输入中文翻译！');
            editTranslationInput.value = '';
            return;
        }
    }

    const sentenceIndex = sentences.findIndex(s => s.id === editingSentenceId);
    if (sentenceIndex === -1) return;

    sentences[sentenceIndex].sentence = sentence;
    sentences[sentenceIndex].translation = translation;

    // 如果编辑的是当前句子，更新显示
    if (sentenceIndex === currentIndex) {
        await displayCurrentSentence();
    }

    saveSentences();
    renderSentenceList();
    closeEditModal();
}

// 关闭编辑模态框
function closeEditModal() {
    editModal.classList.remove('show');
    editingSentenceId = null;
    editSentenceInput.value = '';
    editTranslationInput.value = '';
}

// 删除句子
function deleteSentence(id) {
    if (!confirm('确定要删除这个句子吗？')) {
        return;
    }

    // 使用宽松的比较，支持数字和字符串ID
    const sentenceIndex = sentences.findIndex(s => s.id == id || String(s.id) === String(id));
    if (sentenceIndex === -1) {
        console.error('找不到句子，ID:', id);
        return;
    }

    sentences.splice(sentenceIndex, 1);

    // 如果删除的是当前句子或之前的句子，调整currentIndex
    if (sentenceIndex <= currentIndex) {
        currentIndex = Math.max(0, currentIndex - 1);
    }

    // 确保currentIndex不超出范围
    if (currentIndex >= sentences.length && sentences.length > 0) {
        currentIndex = sentences.length - 1;
    }

    saveSentences();
    displayCurrentSentence();
    renderSentenceList();
}

// 查看句子
function viewSentence(id) {
    // 使用宽松的比较，支持数字和字符串ID
    const sentenceIndex = sentences.findIndex(s => s.id == id || String(s.id) === String(id));
    if (sentenceIndex === -1) {
        console.error('找不到句子，ID:', id);
        return;
    }

    currentIndex = sentenceIndex;
    displayCurrentSentence();
    closeManageModal();
}

// 导出句子
function exportSentences() {
    if (sentences.length === 0) {
        alert('没有句子可以导出！');
        return;
    }

    // 准备导出数据
    const exportData = sentences.map(s => ({
        sentence: s.sentence,
        translation: s.translation || '',
        date: s.date || new Date().toISOString().split('T')[0],
        words: s.words || {}
    }));

    // 创建JSON字符串
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // 创建Blob对象
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentences_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(`成功导出 ${sentences.length} 个句子！`);
}

// 批量导入句子
async function importBatchSentences() {
    const jsonText = batchJsonInput.value.trim();
    
    if (!jsonText) {
        alert('请输入JSON数据或选择文件！');
        return;
    }

    try {
        const importedData = JSON.parse(jsonText);
        
        if (!Array.isArray(importedData)) {
            alert('JSON格式错误！必须是数组格式。');
            return;
        }

        if (importedData.length === 0) {
            alert('导入的数据为空！');
            return;
        }

        let successCount = 0;
        let skipCount = 0;

        for (const item of importedData) {
            // 验证必需字段
            if (!item.sentence || typeof item.sentence !== 'string') {
                skipCount++;
                continue;
            }

            // 检查是否已存在（根据句子内容判断）
            const exists = sentences.some(s => 
                s.sentence.toLowerCase().trim() === item.sentence.toLowerCase().trim()
            );

            if (exists) {
                skipCount++;
                continue;
            }

            // 创建新句子对象
            let translation = item.translation || '';
            
            // 如果没有翻译，自动获取
            if (!translation) {
                try {
                    translation = await fetchTranslation(item.sentence);
                } catch (error) {
                    console.warn('翻译获取失败:', item.sentence);
                    translation = '';
                }
            }

            const newSentence = {
                id: item.id || Date.now() + successCount + Math.random(), // 使用导入的ID或生成新ID
                sentence: item.sentence.trim(),
                translation: translation.trim(),
                date: item.date || new Date().toISOString().split('T')[0],
                words: item.words || {}
            };

            sentences.push(newSentence);
            successCount++;
        }

        // 保存并更新显示
        saveSentences();
        await displayCurrentSentence();
        renderSentenceList();
        closeImportBatchModal();

        let message = `成功导入 ${successCount} 个句子！`;
        if (skipCount > 0) {
            message += `\n跳过 ${skipCount} 个重复或无效的句子。`;
        }
        alert(message);

    } catch (error) {
        alert('JSON格式错误！请检查数据格式。\n错误信息：' + error.message);
        console.error('导入错误:', error);
    }
}

// 关闭批量导入模态框
function closeImportBatchModal() {
    importBatchModal.classList.remove('show');
    batchJsonInput.value = '';
    batchFileInput.value = '';
    fileNameSpan.textContent = '';
}

// 清空所有句子
function clearAllSentences() {
    if (sentences.length === 0) {
        alert('当前没有句子可以清空！');
        return;
    }

    const count = sentences.length;
    const confirmMessage = `确定要清空所有 ${count} 个句子吗？\n\n此操作不可恢复！\n\n请输入"清空"以确认：`;
    
    const userInput = prompt(confirmMessage);
    
    if (userInput === '清空') {
        sentences = [];
        currentIndex = 0;
        saveSentences();
        displayCurrentSentence();
        renderSentenceList();
        alert('已清空所有句子！');
    } else if (userInput !== null) {
        alert('输入不正确，操作已取消。');
    }
}

// 加载JSON示例
function loadJsonExample() {
    const example = [
        {
            "sentence": "The quick brown fox jumps over the lazy dog.",
            "translation": "敏捷的棕色狐狸跳过懒惰的狗。",
            "date": "2026-01-28"
        },
        {
            "sentence": "She goes to the park with her friend every weekend.",
            "translation": "她每个周末都和朋友一起去公园。",
            "date": "2026-01-29"
        },
        {
            "sentence": "Learning a new language opens up new opportunities.",
            "translation": "学习一门新语言会带来新的机会。",
            "date": "2026-01-30"
        },
        {
            "sentence": "Practice makes perfect.",
            "translation": "熟能生巧。",
            "date": "2026-01-31"
        },
        {
            "sentence": "The early bird catches the worm.",
            "translation": "早起的鸟儿有虫吃。",
            "date": "2026-02-01"
        }
    ];
    
    jsonExample.textContent = JSON.stringify(example, null, 2);
}

// 复制JSON示例
function copyJsonExample() {
    const exampleText = jsonExample.textContent;
    
    navigator.clipboard.writeText(exampleText).then(() => {
        const originalText = copyExampleBtn.textContent;
        copyExampleBtn.textContent = '已复制！';
        copyExampleBtn.style.background = '#27ae60';
        copyExampleBtn.style.borderColor = '#27ae60';
        
        setTimeout(() => {
            copyExampleBtn.textContent = originalText;
            copyExampleBtn.style.background = '';
            copyExampleBtn.style.borderColor = '';
        }, 2000);
    }).catch(err => {
        // 如果clipboard API不可用，使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = exampleText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            const originalText = copyExampleBtn.textContent;
            copyExampleBtn.textContent = '已复制！';
            copyExampleBtn.style.background = '#27ae60';
            copyExampleBtn.style.borderColor = '#27ae60';
            
            setTimeout(() => {
                copyExampleBtn.textContent = originalText;
                copyExampleBtn.style.background = '';
                copyExampleBtn.style.borderColor = '';
            }, 2000);
        } catch (err) {
            alert('复制失败，请手动复制示例内容。');
        }
        document.body.removeChild(textArea);
    });
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init);