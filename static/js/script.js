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

        try {
            const response = await fetch('/generate', {
                method: 'POST',
                body: formData // Send FormData directly
            });

            const data = await response.json();

            if (response.ok) {
                resultContent.classList.remove('placeholder');
                resultContent.innerHTML = formatOutputText(data.result);
                resultContent.dataset.rawText = data.result;
                copyBtn.disabled = false;
                document.getElementById('variations-toolbar').classList.remove('hidden');
                showToast('Successfully generated!');
            } else {
                throw new Error(data.error || 'Failed to generate content');
            }
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

    copyBtn.addEventListener('click', async () => {
        const textToCopy = resultContent.dataset.rawText || resultContent.textContent;
        if (!textToCopy || copyBtn.disabled) return;

        try {
            await navigator.clipboard.writeText(textToCopy);
            showToast('Copied to clipboard!');
            
            // Temporary visual feedback on button
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
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
            
        escapedText = escapedText.replace(/\n/g, '<br>');
        escapedText = escapedText.replace(/\[.*?\]/g, '<span class="highlight-placeholder">$&</span>');
        return escapedText;
    }

    // Tweak logic
    const tweakBtns = document.querySelectorAll('.tweak-btn');
    tweakBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const instruction = e.target.getAttribute('data-instruction');
            const originalText = resultContent.dataset.rawText;
            
            if (!originalText) return;

            const originalBtnText = e.target.textContent;
            e.target.textContent = "Tweaking...";
            tweakBtns.forEach(b => b.disabled = true);
            resultContent.classList.add('placeholder');
            
            try {
                const response = await fetch('/tweak', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        original_text: originalText,
                        instruction: instruction
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    resultContent.classList.remove('placeholder');
                    resultContent.innerHTML = formatOutputText(data.result);
                    resultContent.dataset.rawText = data.result;
                    showToast('Text updated!');
                } else {
                    throw new Error(data.error || 'Failed to tweak content');
                }
            } catch (error) {
                resultContent.classList.remove('placeholder');
                showToast(error.message, true);
            } finally {
                e.target.textContent = originalBtnText;
                tweakBtns.forEach(b => b.disabled = false);
            }
        });
    });
});
