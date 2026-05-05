/* =============================================
   AUTO IMAGE EDITOR — app.js
   ============================================= */

// ── Seletores ──────────────────────────────────
const dropZone = document.getElementById('drop-zone');
const photoInput = document.getElementById('photo-input');
const btnChoose = document.getElementById('btn-choose');
const dropInner = document.getElementById('drop-inner');
const previewWrap = document.getElementById('preview-wrap');
const previewImg = document.getElementById('preview-img');
const btnRemove = document.getElementById('btn-remove');
const fileNameEl = document.getElementById('file-name');

const textarea = document.getElementById('description');
const charCount = document.getElementById('char-count');
const MAX_CHARS = 300;

const btnSubmit = document.getElementById('btn-submit');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toast-msg');

const WEBHOOK_URL = 'https://web.jayf4.shop/webhook/7fc61c6b-0e72-4284-84ce-9889ba02710c';

// ── Estado ─────────────────────────────────────
let selectedFile = null;

// =============================================
// UPLOAD / DROP ZONE
// =============================================

btnChoose.addEventListener('click', (e) => {
    e.stopPropagation();
    photoInput.click();
});

dropZone.addEventListener('click', () => {
    if (!selectedFile) photoInput.click();
});

photoInput.addEventListener('change', () => {
    if (photoInput.files && photoInput.files[0]) {
        handleFile(photoInput.files[0]);
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Por favor, envie apenas arquivos de imagem.', true);
        return;
    }

    selectedFile = file;
    const reader = new FileReader();

    reader.onload = (e) => {
        previewImg.src = e.target.result;
        fileNameEl.textContent = file.name;
        dropInner.style.display = 'none';
        previewWrap.style.display = 'flex';
    };

    reader.readAsDataURL(file);
}

btnRemove.addEventListener('click', (e) => {
    e.stopPropagation();
    resetFile();
});

function resetFile() {
    selectedFile = null;
    photoInput.value = '';
    previewImg.src = '';
    fileNameEl.textContent = '';
    previewWrap.style.display = 'none';
    dropInner.style.display = 'flex';
}

// =============================================
// CONTADOR DE CARACTERES
// =============================================

textarea.addEventListener('input', () => {
    if (textarea.value.length > MAX_CHARS) {
        textarea.value = textarea.value.slice(0, MAX_CHARS);
    }
    const current = textarea.value.length;
    charCount.textContent = `${current} / ${MAX_CHARS}`;
    charCount.classList.toggle('warn', current >= MAX_CHARS * 0.9);
});

// =============================================
// SUBMIT
// =============================================

btnSubmit.addEventListener('click', async () => {
    const description = textarea.value.trim();

    if (!selectedFile) {
        showToast('Selecione uma foto antes de enviar.', true);
        shakeFocus('field-photo');
        return;
    }

    if (!description) {
        showToast('Adicione uma descrição para a imagem.', true);
        shakeFocus('field-desc');
        return;
    }

    setLoading(true);

    try {
        const base64 = await toBase64(selectedFile);

        const payload = {
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileBase64: base64,
            description: description,
        };

        // 1. Envia para o N8N — recebe o jobId
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const { jobId } = await response.json();

        // 2. Esconde o formulário, mostra o loading
        document.querySelector('.card').style.display = 'none';
        document.getElementById('loading-screen').style.display = 'flex';

        // 3. Começa o polling
        await pollJobStatus(jobId);

    } catch (error) {
        showToast('Falha ao enviar. Tente novamente.', true);
        setLoading(false);
        document.querySelector('.card').style.display = 'block'; // ← garante que o form volte
    }
});

// =============================================
// AUXILIARES
// =============================================

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function setLoading(isLoading) {
    btnSubmit.disabled = isLoading;
    const btnText = btnSubmit.querySelector('.btn-text');
    if (isLoading) {
        btnSubmit.classList.add('loading');
        btnText.textContent = 'Enviando';
    } else {
        btnSubmit.classList.remove('loading');
        btnText.textContent = 'Enviar';
    }
}

function resetForm() {
    resetFile();
    textarea.value = '';
    charCount.textContent = `0 / ${MAX_CHARS}`;
    charCount.classList.remove('warn');
}

function showToast(msg, isError = false) {
    toastMsg.textContent = msg;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

function shakeFocus(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.style.transition = 'transform 0.1s ease';
    const shakes = [8, -8, 6, -6, 3, -3, 0];
    let i = 0;
    const interval = setInterval(() => {
        field.style.transform = `translateX(${shakes[i]}px)`;
        i++;
        if (i >= shakes.length) {
            clearInterval(interval);
            field.style.transform = '';
        }
    }, 60);
}

async function pollJobStatus(jobId) {
    const STATUS_URL = 'https://n8n.jayf4.shop/webhook/check-status';
    const INTERVAL = 5000;
    const MAX_TRIES = 36; // 36 × 5s = 3 minutos máximo
    let tries = 0;

    return new Promise((resolve, reject) => {
        const timer = setInterval(async () => {
            tries++;

            if (tries > MAX_TRIES) {
                clearInterval(timer);
                document.getElementById('loading-screen').style.display = 'none';
                document.querySelector('.card').style.display = 'block';
                showToast('Tempo esgotado. Tente novamente.', true);
                resolve();
                return;
            }

            try {
                const res = await fetch(`${STATUS_URL}?jobId=${jobId}`);
                const data = await res.json();

                if (data.status === 'done') {
                    clearInterval(timer);
                    showResults(data.images);
                    resolve();
                }
            } catch (err) {
                console.error('Erro no polling:', err);
            }
        }, INTERVAL);
    });
}

function showResults(images) {
    document.getElementById('loading-screen').style.display = 'none';

    const resultsEl = document.getElementById('results-screen');
    resultsEl.style.display = 'flex';

    images.forEach((base64, index) => {
        const img = document.getElementById(`result-img-${index + 1}`);
        img.src = `data:image/png;base64,${base64}`;
    });
}