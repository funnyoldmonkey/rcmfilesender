const { ipcRenderer } = require('electron');
const QRCode = require('qrcode');

// Wait for socket.io to load
const socket = io('http://localhost:977');

const statusText = document.getElementById('statusText');
const serverUrl = document.getElementById('serverUrl');
const qrCanvas = document.getElementById('qrcode');
const transfersSection = document.getElementById('transfersSection');
const infoCard = document.getElementById('infoCard');
const transferList = document.getElementById('transferList');
const cancelAllBtn = document.getElementById('cancelAllBtn');

let activeTransfers = {};

ipcRenderer.on('server-info', (event, { ip, port }) => {
    const url = `http://${ip}:${port}`;
    statusText.textContent = 'Server Online';
    serverUrl.textContent = url;

    QRCode.toCanvas(qrCanvas, url, {
        width: 200,
        margin: 2,
        color: { dark: '#1A365D', light: '#FFFFFF' }
    });
});

// Socket Events
socket.on('transfer-start', ({ name }) => {
    transfersSection.style.display = 'block';
    infoCard.style.display = 'none';

    if (!activeTransfers[name]) {
        const item = document.createElement('div');
        item.className = 'transfer-item';
        item.id = `file-${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        item.innerHTML = `
            <span class="file-name">${name}</span>
            <div class="progress-container">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <span class="percent-text">0%</span>
        `;
        transferList.appendChild(item);
        activeTransfers[name] = item;
    }
});

socket.on('remote-progress', ({ percent, files }) => {
    files.forEach(name => {
        const item = activeTransfers[name];
        if (item) {
            item.querySelector('.progress-fill').style.width = `${percent}%`;
            item.querySelector('.percent-text').textContent = `${percent}%`;
        }
    });
});

socket.on('transfer-success', ({ name }) => {
    const item = activeTransfers[name];
    if (item) {
        item.querySelector('.percent-text').textContent = 'Complete';
        item.querySelector('.progress-fill').style.background = '#48BB78';
        setTimeout(() => {
            item.remove();
            delete activeTransfers[name];
            checkEmptyTransfers();
        }, 2000);
    }
});

socket.on('transfer-cancelled', ({ name }) => {
    const item = activeTransfers[name];
    if (item) {
        item.querySelector('.percent-text').textContent = 'Cancelled';
        item.querySelector('.progress-fill').style.background = '#E53E3E';
        setTimeout(() => {
            item.remove();
            delete activeTransfers[name];
            checkEmptyTransfers();
        }, 2000);
    }
});

socket.on('force-cancel', () => {
    resetUI();
});

cancelAllBtn.onclick = () => {
    socket.emit('cancel-all');
    resetUI();
};

function checkEmptyTransfers() {
    if (Object.keys(activeTransfers).length === 0) {
        resetUI();
    }
}

function resetUI() {
    activeTransfers = {};
    transferList.innerHTML = '';
    transfersSection.style.display = 'none';
    infoCard.style.display = 'block';
}
