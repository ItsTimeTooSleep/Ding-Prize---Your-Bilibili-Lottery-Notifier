// confetti.js

export function showConfetti() {
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    document.body.appendChild(confettiContainer);

    const colors = ['bilibili-pink', 'bilibili-blue', 'yellow', 'green'];

    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = `confetti ${colors[Math.floor(Math.random() * colors.length)]}`;
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        confettiContainer.appendChild(confetti);
    }

    // 移除 setTimeout，使彩带不自动消失
    // setTimeout(() => {
    //     confettiContainer.remove();
    // }, 3000); // 3秒后移除彩带容器
}