/* =============================================
   AUTO IMAGE EDITOR — script.js
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

// ── Estado ─────────────────────────────────────
let selectedFile = null;

// =============================================
// UPLOAD / DROP ZONE
// =============================================

/** Abre o seletor de arquivo ao clicar no botão ou no drop zone */
btnChoose.addEventListener('click', (e) => {
    e.stopPropagation();
    photoInput.click();
});

dropZone.addEventListener('click', () => {
    if (!selectedFile) photoInput.click();
});

/** Quando um arquivo é selecionado via input */
photoInput.addEventListener('change', () => {
    if (photoInput.files && photoInput.files[0]) {
        handleFile(photoInput.files[0]);
    }
});

/** Drag & Drop */
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

/** Processar o arquivo escolhido */
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

/** Remover imagem */
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
    const len = textarea.value.length;

    // Limitar ao máximo
    if (len > MAX_CHARS) {
        textarea.value = textarea.value.slice(0, MAX_CHARS);
    }

    const current = textarea.value.length;
    charCount.textContent = `${current} / ${MAX_CHARS}`;
    charCount.classList.toggle('warn', current >= MAX_CHARS * 0.9);
});

// =============================================
// SUBMIT
// =============================================

btnSubmit.addEventListener('click', () => {
    const description = textarea.value.trim();

    // Validação
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

    // Simular envio
    setLoading(true);

    btnSubmit.addEventListener('click', async () => {
        const description = textarea.value.trim();

        // Validações (mantém igual)
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
            // Converte a imagem para base64
            const base64 = await toBase64(selectedFile);

            // Monta o payload
            const payload = {
                fileName: selectedFile.name,
                fileType: selectedFile.type,
                fileBase64: base64,
                description: description,
            };

            // ✅ Coloque sua URL do Webhook N8N aqui
            const WEBHOOK_URL = 'https://n8n.jayf4.shop/webhook-test/7fc61c6b-0e72-4284-84ce-9889ba02710c';

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

    // Converte arquivo para base64
    function toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // =============================================
    // AUXILIARES
    // =============================================

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

    /** Exibir toast de feedback */
    function showToast(msg, isError = false) {
        toastMsg.textContent = msg;
        toast.classList.toggle('error', isError);
        toast.classList.add('show');

        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }

    /** Pequeno shake no campo inválido */
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
})