// customConfirm.js

export function showCustomConfirm(message) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('custom-confirm-dialog');
        const msgElement = document.getElementById('custom-confirm-message');
        const confirmBtn = document.getElementById('custom-confirm-ok');
        const cancelBtn = document.getElementById('custom-confirm-cancel');

        if (!dialog || !msgElement || !confirmBtn || !cancelBtn) {
            console.error('Custom confirmation dialog elements not found.');
            resolve(false); // Resolve with false if elements are missing
            return;
        }

        msgElement.textContent = message;
        dialog.classList.add('show');

        const handleConfirm = () => {
            dialog.classList.remove('show');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = () => {
            dialog.classList.remove('show');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    });
}