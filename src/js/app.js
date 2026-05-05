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

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`Erro ${response.status}`);

        showToast('Enviado com sucesso! 🎉', false);
        resetForm();

    } catch (error) {
        console.error('Erro ao enviar:', error);
        showToast('Falha ao enviar. Tente novamente.', true);
    } finally {
        setLoading(false);
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