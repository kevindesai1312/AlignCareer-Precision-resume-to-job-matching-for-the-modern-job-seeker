document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('generator-form');
    const generateBtn = document.getElementById('generate-btn');
    const btnText = form.querySelector('.btn-text');
    const spinner = document.getElementById('loading-spinner');
    const resultContent = document.getElementById('result-content');
    const copyBtn = document.getElementById('copy-btn');
    
    const fileInput = document.getElementById('resume-file');
    const fileNameDisplay = document.getElementById('file-name');
    const dropZone = document.getElementById('drop-zone');
    const resumeTextarea = document.getElementById('resume');
    const subjectOptionsContainer = document.getElementById('subject-options');

    // Modal & Settings logic
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const apiKeyInput = document.getElementById('custom-api-key');

    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }

    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    saveSettingsBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            showToast('API Key saved to browser storage!');
        } else {
            localStorage.removeItem('gemini_api_key');
            showToast('Using default server API Key.');
        }
        settingsModal.classList.add('hidden');
    });

    // Drag and Drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        let dt = e.dataTransfer;
        let files = dt.files;
        if (files.length > 0) {
            fileInput.files = files;
            updateFileName();
        }
    });

    fileInput.addEventListener('change', updateFileName);

    function updateFileName() {
        if (fileInput.files.length > 0) {
            fileNameDisplay.textContent = `Selected: ${fileInput.files[0].name}`;
            resumeTextarea.disabled = true;
            resumeTextarea.placeholder = "File uploaded. This text area is disabled.";
            resumeTextarea.value = "";
        } else {
            fileNameDisplay.textContent = "";
            resumeTextarea.disabled = false;
            resumeTextarea.placeholder = "Paste your resume, LinkedIn summary, or key skills here...";
        }
    }
    
    // Create toast container
    const toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);

    function showToast(message, isError = false) {
        toast.textContent = message;
        if (isError) {
            toast.classList.add('error');
        } else {
            toast.classList.remove('error');
        }
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Use FormData instead of JSON to support file uploads
        const formData = new FormData(form);
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) {
            formData.append('custom_api_key', storedKey);
        }

        // Validation
        const hasFile = fileInput.files.length > 0;
        const hasText = document.getElementById('resume').value.trim() !== "";
        if (!hasFile && !hasText) {
            showToast("Please provide a resume file or paste text.", true);
            return;
        }

        // UI Loading State
        generateBtn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        resultContent.innerHTML = '<p class="placeholder">Generating your personalized outreach... This might take a few seconds.</p>';
        resultContent.classList.add('placeholder');
        copyBtn.disabled = true;
        subjectOptionsContainer.innerHTML = '';
        subjectOptionsContainer.classList.add('hidden');

        try {
            const response = await fetch('/generate', {
                method: 'POST',
                body: formData // Send FormData directly
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate content');
            }

            // Stream reading
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";
            resultContent.classList.remove('placeholder');
            resultContent.innerHTML = ""; // Clear loader text

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                
                // Catch backend-yielded errors
                if (fullText.startsWith('[ERROR]')) {
                    throw new Error(fullText.replace('[ERROR]', '').trim());
                }
                
                let bodyText = fullText;
                if (fullText.includes('[BODY]')) {
                    const parts = fullText.split('[BODY]');
                    updateSubjects(parts[0]);
                    bodyText = parts.slice(1).join('[BODY]').trim();
                } else if (fullText.includes('[SUBJECT_')) {
                    updateSubjects(fullText);
                    bodyText = "Generating subjects...";
                }
                
                resultContent.innerHTML = formatOutputText(bodyText);
                resultContent.scrollTop = resultContent.scrollHeight;
            }

            resultContent.dataset.rawText = fullText;
            copyBtn.disabled = false;
            document.getElementById('variations-toolbar').classList.remove('hidden');
            showToast('Successfully generated!');
            saveToHistory(fullText, document.getElementById('output-type').value);
        } catch (error) {
            resultContent.classList.add('placeholder');
            resultContent.innerHTML = `<p style="color: var(--error);">Error: ${error.message}</p>`;
            showToast(error.message, true);
        } finally {
            // Restore UI State
            generateBtn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    function getFinalText() {
        const clone = resultContent.cloneNode(true);
        const spans = clone.querySelectorAll('.inline-input');
        spans.forEach(span => {
            if (!span.textContent.trim()) {
                span.textContent = span.getAttribute('data-placeholder');
            }
        });
        
        let html = clone.innerHTML;
        html = html.replace(/<br\s*[\/]?>/gi, '\n');
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent;
    }

    copyBtn.addEventListener('click', async () => {
        const textToCopy = getFinalText();
        if (!textToCopy || copyBtn.disabled) return;

        try {
            await navigator.clipboard.writeText(textToCopy);
            showToast('Copied to clipboard!');
            
            // Temporary visual feedback on button
            const copyIconContainer = document.getElementById('copy-icon-container');
            const copyText = document.getElementById('copy-text');
            const originalIcon = copyIconContainer.innerHTML;
            
            copyIconContainer.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            copyText.classList.remove('hidden');
            copyBtn.style.borderColor = '#10b981';
            
            setTimeout(() => {
                copyIconContainer.innerHTML = originalIcon;
                copyText.classList.add('hidden');
                copyBtn.style.borderColor = '';
            }, 2000);
        } catch (err) {
            showToast('Failed to copy text', true);
        }
    });

    // Formatting function for placeholders
    function formatOutputText(rawText) {
        let escapedText = rawText
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
            
        escapedText = escapedText.replace(/&lt;verified&gt;(.*?)&lt;\/verified&gt;/gi, '<span class="verified-skill" title="✓ Verified from your Resume">$1</span>');
        escapedText = escapedText.replace(/&lt;unverified&gt;(.*?)&lt;\/unverified&gt;/gi, '<span class="unverified-skill" title="⚠ Double check: This word wasn\'t found in your uploaded resume.">$1</span>');
            
        escapedText = escapedText.replace(/\n/g, '<br>');
        escapedText = escapedText.replace(/\[.*?\]/g, '<span contenteditable="true" class="inline-input highlight-placeholder" data-placeholder="$&">$&</span>');
        return escapedText;
    }

    // Tweak logic
    const tweakBtns = document.querySelectorAll('.tweak-btn');
    tweakBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const instruction = e.target.getAttribute('data-instruction');
            const originalText = getFinalText();
            
            if (!originalText) return;

            const originalBtnText = e.target.textContent;
            e.target.textContent = "Tweaking...";
            tweakBtns.forEach(b => b.disabled = true);
            resultContent.classList.add('placeholder');
            
            try {
                const payload = {
                    original_text: originalText,
                    instruction: instruction
                };
                const storedKey = localStorage.getItem('gemini_api_key');
                if (storedKey) {
                    payload.custom_api_key = storedKey;
                }

                const response = await fetch('/tweak', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to tweak content');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullText = "";
                resultContent.classList.remove('placeholder');
                resultContent.innerHTML = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    fullText += chunk;
                    
                    if (fullText.startsWith('[ERROR]')) {
                        throw new Error(fullText.replace('[ERROR]', '').trim());
                    }
                    
                    resultContent.innerHTML = formatOutputText(fullText);
                    resultContent.scrollTop = resultContent.scrollHeight;
                }

                resultContent.dataset.rawText = fullText;
                showToast('Text updated!');
                saveToHistory(fullText, "Tweaked: " + document.getElementById('output-type').value);
            } catch (error) {
                resultContent.classList.remove('placeholder');
                showToast(error.message, true);
            } finally {
                e.target.textContent = originalBtnText;
                tweakBtns.forEach(b => b.disabled = false);
            }
        });
    });

    // History Logic
    function saveToHistory(text, type) {
        if (!text) return;
        let history = JSON.parse(localStorage.getItem('letter_history') || '[]');
        const newItem = {
            id: Date.now(),
            text: text,
            type: type,
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        };
        // add to beginning
        history.unshift(newItem);
        // keep only last 5
        if (history.length > 5) {
            history = history.slice(0, 5);
        }
        localStorage.setItem('letter_history', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        const historySection = document.getElementById('history-section');
        const historyList = document.getElementById('history-list');
        let history = JSON.parse(localStorage.getItem('letter_history') || '[]');
        
        if (history.length === 0) {
            historySection.classList.add('hidden');
            return;
        }
        
        historySection.classList.remove('hidden');
        historyList.innerHTML = '';
        
        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-item-title">${item.type}</div>
                <div class="history-item-date">${item.date}</div>
            `;
            div.addEventListener('click', () => {
                loadFromHistory(item);
            });
            historyList.appendChild(div);
        });
    }

    function loadFromHistory(item) {
        resultContent.classList.remove('placeholder');
        resultContent.innerHTML = formatOutputText(item.text);
        resultContent.dataset.rawText = item.text;
        
        copyBtn.disabled = false;
        document.getElementById('variations-toolbar').classList.remove('hidden');
        showToast('Loaded from history!');
        
        // On mobile, scroll to output
        if (window.innerWidth <= 900) {
            document.querySelector('.output-panel').scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Call renderHistory on load
    renderHistory();

    // Two-Way Binding for Placeholders
    resultContent.addEventListener('input', (e) => {
        if (e.target.classList && e.target.classList.contains('inline-input')) {
            const placeholder = e.target.getAttribute('data-placeholder');
            const newValue = e.target.textContent;
            const siblings = resultContent.querySelectorAll(`.inline-input[data-placeholder="${placeholder}"]`);
            siblings.forEach(sibling => {
                if (sibling !== e.target && sibling.textContent !== newValue) {
                    sibling.textContent = newValue;
                }
            });
        }
    });

    // Inline Sentence Rephrasing
    const microToolbar = document.getElementById('micro-toolbar');
    let currentSelectionRange = null;

    document.addEventListener('selectionchange', () => {
        const selection = window.getSelection();
        if (!selection.isCollapsed && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (resultContent.contains(range.commonAncestorContainer)) {
                microToolbar.classList.remove('hidden');
                
                setTimeout(() => {
                    const rect = range.getBoundingClientRect();
                    microToolbar.style.top = `${window.scrollY + rect.top - 45}px`;
                    microToolbar.style.left = `${window.scrollX + rect.left + (rect.width / 2) - (microToolbar.offsetWidth / 2)}px`;
                }, 0);
                
                currentSelectionRange = range;
                return;
            }
        }
        
        if (document.activeElement && microToolbar.contains(document.activeElement)) return;
        microToolbar.classList.add('hidden');
        currentSelectionRange = null;
    });

    microToolbar.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });

    const microBtns = document.querySelectorAll('.micro-btn');
    microBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!currentSelectionRange) return;
            
            const instruction = e.target.getAttribute('data-instruction');
            const snippet = currentSelectionRange.toString();
            
            if (!snippet.trim()) return;

            const originalBtnText = e.target.textContent;
            e.target.textContent = "⏳";
            microBtns.forEach(b => b.disabled = true);
            
            const streamSpan = document.createElement('span');
            streamSpan.className = 'streaming-tweak';
            streamSpan.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
            streamSpan.style.borderRadius = '4px';
            
            currentSelectionRange.deleteContents();
            currentSelectionRange.insertNode(streamSpan);
            
            microToolbar.classList.add('hidden');

            try {
                const payload = { snippet: snippet, instruction: instruction };
                const storedKey = localStorage.getItem('gemini_api_key');
                if (storedKey) payload.custom_api_key = storedKey;

                const response = await fetch('/micro_tweak', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to tweak snippet');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullText = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    fullText += chunk;
                    
                    if (fullText.startsWith('[ERROR]')) {
                        throw new Error(fullText.replace('[ERROR]', '').trim());
                    }
                    
                    streamSpan.innerHTML = formatOutputText(fullText);
                }
                
                streamSpan.style.backgroundColor = 'transparent';
                
            } catch (error) {
                showToast(error.message, true);
                streamSpan.innerHTML = formatOutputText(snippet);
            } finally {
                e.target.textContent = originalBtnText;
                microBtns.forEach(b => b.disabled = false);
            }
        });
    });

    function escapeHtml(unsafe) {
        if (!unsafe) return "";
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    function updateSubjects(text) {
        if (!text) return;
        
        const lines = text.split('\n');
        let html = '';
        
        lines.forEach(line => {
            const match = line.match(/\[SUBJECT_(DIRECT|CURIOSITY|VALUE)\](.*)/);
            if (match) {
                const typeRaw = match[1];
                let typeName = 'Option';
                if (typeRaw === 'DIRECT') typeName = 'The Direct Match';
                if (typeRaw === 'CURIOSITY') typeName = 'The Curiosity Hook';
                if (typeRaw === 'VALUE') typeName = 'The Value-First Open';
                
                const subject = match[2].trim();
                
                html += `
                <div class="subject-card">
                    <div class="subject-card-text">
                        <span class="subject-card-type">${typeName}</span>
                        ${formatOutputText(subject)}
                    </div>
                    <button class="subject-btn" type="button" data-subject="${escapeHtml(subject)}">Click to Apply</button>
                </div>`;
            }
        });
        
        if (html) {
            subjectOptionsContainer.innerHTML = html;
            subjectOptionsContainer.classList.remove('hidden');
            
            subjectOptionsContainer.querySelectorAll('.subject-btn').forEach(btn => {
                btn.onclick = () => {
                    const chosenSubject = btn.getAttribute('data-subject');
                    // Wrap the subject in a styled span so it's clearly the subject line
                    const subjectHtml = `<strong>Subject:</strong> <span contenteditable="true" class="inline-input highlight-placeholder" data-placeholder="[Subject]">${chosenSubject}</span><br><br>`;
                    resultContent.innerHTML = subjectHtml + resultContent.innerHTML;
                    subjectOptionsContainer.classList.add('hidden');
                };
            });
        }
    }
});
