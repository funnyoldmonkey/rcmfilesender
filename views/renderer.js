const { ipcRenderer } = require('electron');
const QRCode = require('qrcode');

// Wait for socket.io to load
const socket = io('http://localhost:977');

// Identify this connection as the desktop viewer
socket.emit('identify', 'viewer');

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
    statusText.textContent = 'Waiting for Device...';
    serverUrl.textContent = url;

    QRCode.toCanvas(qrCanvas, url, {
        width: 200,
        margin: 2,
        color: { dark: '#1A365D', light: '#FFFFFF' }
    });
});

socket.on('uploader-connected', () => {
    statusText.textContent = 'Device Connected';
    statusText.parentElement.style.background = 'rgba(72, 187, 120, 0.2)'; // Green tint
});

socket.on('uploader-disconnected', () => {
    statusText.textContent = 'Waiting for Device...';
    statusText.parentElement.style.background = 'rgba(255, 255, 255, 0.1)';
    resetUI(); // Also clear any stuck bars
});

socket.on('disconnect', () => {
    statusText.textContent = 'Server Offline';
    statusText.parentElement.style.background = 'rgba(229, 62, 62, 0.2)'; // Red tint
});

let isCurrentBatch = false;

// Socket Events
socket.on('batch-start', ({ count }) => {
    isCurrentBatch = true;
    transfersSection.style.display = 'block';
    infoCard.style.display = 'none';
    transferList.innerHTML = '';
    activeTransfers = {};

    const batchId = 'batch-upload';
    const batchItem = document.createElement('div');
    batchItem.className = 'transfer-item';
    batchItem.id = batchId;
    batchItem.innerHTML = `
        <span class="file-name">Receiving ${count} files...</span>
        <div class="progress-container">
            <div class="progress-fill" style="width: 0%"></div>
        </div>
        <span class="percent-text">0%</span>
    `;
    transferList.appendChild(batchItem);
    activeTransfers[batchId] = batchItem;
});

socket.on('transfer-start', ({ name }) => {
    // IF we are in a batch, DO NOT show individual bars
    if (isCurrentBatch) return;

    // Safety: If an individual file starts, we definitely aren't in a batch anymore
    isCurrentBatch = false;

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

socket.on('remote-progress', ({ percent, isBatch }) => {
    if (isBatch) {
        const batchItem = document.getElementById('batch-upload');
        if (batchItem) {
            batchItem.querySelector('.progress-fill').style.width = `${percent}%`;
            batchItem.querySelector('.percent-text').textContent = `${percent}%`;
        }
    } else {
        Object.values(activeTransfers).forEach(item => {
            if (item) {
                item.querySelector('.progress-fill').style.width = `${percent}%`;
                item.querySelector('.percent-text').textContent = `${percent}%`;
            }
        });
    }
});

socket.on('batch-complete', () => {
    const item = document.getElementById('batch-upload');
    if (item) {
        item.querySelector('.percent-text').textContent = 'All Complete';
        item.querySelector('.progress-fill').style.background = '#48BB78';
        setTimeout(() => {
            resetUI();
        }, 2000);
    }
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
    const item = activeTransfers[name] || document.getElementById('batch-upload');
    if (item) {
        item.querySelector('.percent-text').textContent = 'Cancelled';
        item.querySelector('.progress-fill').style.background = '#E53E3E';
        setTimeout(() => {
            if (item.parentNode) item.remove();
            delete activeTransfers[name];
            delete activeTransfers['batch-upload'];
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
    isCurrentBatch = false;
    activeTransfers = {};
    transferList.innerHTML = '';
    transfersSection.style.display = 'none';
    infoCard.style.display = 'block';
}
