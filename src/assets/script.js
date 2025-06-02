document.addEventListener('DOMContentLoaded', function () {
    const futuristaButton = document.querySelector('input[name="theme"][value="futuristic"]');
    const modernoButton = document.querySelector('input[name="theme"][value="modern"]');
    const minimalistaButton = document.querySelector('input[name="theme"][value="minimal"]');
    const commandInput = document.getElementById('command-input');
    const effectsCheckboxes = document.querySelectorAll('.cyber-checkbox');

    if (futuristaButton) futuristaButton.checked = false;
    if (modernoButton) modernoButton.checked = false;
    if (minimalistaButton) minimalistaButton.checked = false;

    function updateCommandInput(newText) {
        const currentText = commandInput.value.trim();
        const styles = ['estilo de site futurista', 'estilo de site moderno', 'estilo de site minimalista'];

        // Remove qualquer estilo existente
        let updatedText = currentText;
        styles.forEach(style => {
            if (updatedText.includes(style)) {
                updatedText = updatedText.replace(style, '').trim();
            }
        });

        // Adiciona o novo estilo
        commandInput.value = updatedText ? `${updatedText} ${newText}` : newText;
    }

    function updateCommandWithEffects(effectText, isChecked) {
        let currentText = commandInput.value.trim();

        if (isChecked) {
            // Adiciona o efeito se não estiver presente
            if (!currentText.includes(effectText)) {
                commandInput.value = currentText ? `${currentText} ${effectText}`.trim() : effectText;
            }
        } else {
            // Remove o efeito se estiver presente
            const regex = new RegExp(`\\b${effectText}\\b`, 'g');
            commandInput.value = currentText.replace(regex, '').replace(/\s+/g, ' ').trim();
        }
    }

    if (futuristaButton) {
        futuristaButton.addEventListener('change', function () {
            if (this.checked) {
                updateCommandInput('estilo de site futurista');
                this.checked = false;
            }
        });
    }

    if (modernoButton) {
        modernoButton.addEventListener('change', function () {
            if (this.checked) {
                updateCommandInput('estilo de site moderno');
                this.checked = false;

            }
        });
    }

    if (minimalistaButton) {
        minimalistaButton.addEventListener('change', function () {
            if (this.checked) {
                updateCommandInput('estilo de site minimalista');
                this.checked = false;

            }
        });
    }

    effectsCheckboxes.forEach((checkbox, index) => {
        checkbox.addEventListener('change', function () {
            const effectTexts = ['efeito partículas', 'efeito holográfico', 'efeito 3d'];
            updateCommandWithEffects(effectTexts[index], this.checked);
        });
    });
});

document.getElementById('generate-btn').addEventListener('click', gerarSite);

function gerarSite() {
    fetch('/api/huggingface', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: 'side para um mercado de médio porte' })
    })
        .then(response => response.json())
        .then(data => console.log(data))
        .catch(error => console.error('Erro na requisição:', error));
}

function makeElementsEditable(container) {
    const textElements = container.querySelectorAll('h1, h2, h3, p, span, div');
    const imageElements = container.querySelectorAll('img');

    textElements.forEach(element => {
        element.setAttribute('contenteditable', 'true');
        element.classList.add('editable');
        element.addEventListener('input', function () {
            console.log('Texto alterado:', this.innerHTML);
        });
    });

    imageElements.forEach(image => {
        image.classList.add('editable-image');

        image.addEventListener('click', function () {
            const newSrc = prompt('Insira a URL da nova imagem:', image.src);
            if (newSrc) {
                image.src = newSrc;
                console.log('Imagem alterada para:', newSrc);
            }
        });
    });
}

function removeEditableState(container) {
    const textElements = container.querySelectorAll('.editable');
    textElements.forEach(element => {
        element.removeAttribute('contenteditable');
        element.classList.remove('editable');
    });

    const imageElements = container.querySelectorAll('.editable-image');
    imageElements.forEach(image => {
        image.classList.remove('editable-image');
        image.removeEventListener('click', null);
    });
}


document.addEventListener('DOMContentLoaded', function () {
    const generatedContent = document.getElementById('generated-content');
    const editLayoutBtn = document.getElementById('edit-layout-btn');

    let isEditMode = false;

    editLayoutBtn.addEventListener('click', function () {
        isEditMode = !isEditMode;

        if (isEditMode) {
            makeElementsEditable(generatedContent);
            editLayoutBtn.textContent = 'Sair do Modo Edição';
        } else {
            removeEditableState(generatedContent);
            editLayoutBtn.textContent = 'Editar Layout';
        }
    });
});s