// Neural Network Background (Matching Dashboard)
const canvas = document.getElementById('neuralCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const nodes = [];
const nodeCount = 60;

for (let i = 0; i < nodeCount; i++) {
    nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4
    });
}

function drawNeuralNetwork() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
    ctx.lineWidth = 0.5;

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 180) {
                ctx.beginPath();
                ctx.moveTo(nodes[i].x, nodes[i].y);
                ctx.lineTo(nodes[j].x, nodes[j].y);
                ctx.stroke();
            }
        }
    }

    ctx.fillStyle = 'rgba(139, 92, 246, 0.3)';
    nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
        ctx.fill();
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;
    });

    requestAnimationFrame(drawNeuralNetwork);
}
drawNeuralNetwork();

// Form Toggling
function toggleForm(type) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (type === 'signup') {
        loginForm.classList.remove('active');
        signupForm.classList.add('active');
    } else {
        signupForm.classList.remove('active');
        loginForm.classList.add('active');
    }
}

// Authentication Logic
document.getElementById('signIn').addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;

    btn.textContent = 'Verifying Identity...';
    btn.style.opacity = '0.7';
    btn.disabled = true;

    // Create transition overlay
    const overlay = document.createElement('div');
    overlay.className = 'transition-overlay';
    document.body.appendChild(overlay);

    // Simulate Auth Check
    setTimeout(() => {
        showToast('Authentication Successful. Redirecting...');

        setTimeout(() => {
            overlay.classList.add('active');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        }, 1000);
    }, 1500);
});

document.getElementById('signUp').addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');

    btn.textContent = 'Sending Request...';
    btn.disabled = true;

    setTimeout(() => {
        showToast('Enrollment Request Sent. Await Admin Approval.');
        setTimeout(() => {
            toggleForm('login');
            btn.textContent = 'Submit Enrollment';
            btn.disabled = false;
        }, 2000);
    }, 1500);
});

// Toast Utility
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Resize handler
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
