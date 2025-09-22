// customConfirm.js

export function showCustomConfirm(message, onConfirm) {
    const dialog = document.getElementById('custom-confirm-dialog');
    const msgElement = document.getElementById('custom-confirm-message');
    const confirmBtn = document.getElementById('custom-confirm-ok');
    const cancelBtn = document.getElementById('custom-confirm-cancel');

    if (!dialog || !msgElement || !confirmBtn || !cancelBtn) {
        console.error('Custom confirmation dialog elements not found.');
        return;
    }

    msgElement.textContent = message;
    dialog.classList.add('show');

    const handleConfirm = () => {
        dialog.classList.remove('show');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        onConfirm();
    };

    const handleCancel = () => {
        dialog.classList.remove('show');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}