const socket = io();

// Identify this connection as an uploader
socket.emit('identify', 'uploader');
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const progressContainer = document.getElementById('progressContainer');
const fileList = document.getElementById('fileList');
const uploadSection = document.querySelector('.upload-card');
const successMessage = document.getElementById('successMessage');

let currentXhr = null;

selectBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
    const files = fileInput.files;
    if (files.length > 0) {
        uploadFiles(files);
    }
});

function uploadFiles(files) {
    uploadSection.style.display = 'none';
    progressContainer.style.display = 'block';
    fileList.innerHTML = '';

    const isBatch = files.length > 1;
    const displayName = isBatch ? `Sending ${files.length} files...` : `Sending ${files[0].name}`;

    // Notify Desktop IMMEDIATELY to prevent flicker
    if (isBatch) {
        socket.emit('batch-start', { count: files.length });
    }

    const item = document.createElement('div');
    item.className = 'file-progress-item';
    item.innerHTML = `
        <div class="file-info">
            <span>${displayName}</span>
            <span class="percent">0%</span>
        </div>
        <div class="progress-bar-bg">
            <div class="progress-bar-fill"></div>
        </div>
    `;
    fileList.appendChild(item);

    const fill = item.querySelector('.progress-bar-fill');
    const text = item.querySelector('.percent');

    // Global cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'secondary-btn';
    cancelBtn.style.marginTop = '1rem';
    cancelBtn.style.width = '100%';
    cancelBtn.textContent = 'Cancel Transfer';
    cancelBtn.onclick = () => {
        if (currentXhr) currentXhr.abort();
        socket.emit('cancel-all'); // Tell desktop to clear UI
        location.reload();
    };
    fileList.appendChild(cancelBtn);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    const xhr = new XMLHttpRequest();
    currentXhr = xhr;

    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            fill.style.width = percentComplete + '%';
            text.textContent = percentComplete + '%';

            socket.emit('upload-progress', { 
                percent: percentComplete,
                files: Array.from(files).map(f => f.name),
                isBatch: isBatch
            });
        }
    });

    xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
            if (isBatch) socket.emit('batch-complete');
            progressContainer.style.display = 'none';
            successMessage.style.display = 'block';
            
            // AUTOMATIC RESET: Go back to upload screen after 3 seconds
            setTimeout(() => {
                successMessage.style.display = 'none';
                uploadSection.style.display = 'block';
                fileInput.value = ''; // Clear file input
            }, 3000);
        } else if (xhr.status !== 0) {
            alert('Upload failed.');
            location.reload();
        }
    });

    xhr.open('POST', '/upload', true);
    xhr.setRequestHeader('x-socket-id', socket.id);
    xhr.send(formData);
}

// Listen for remote cancel from Desktop
socket.on('force-cancel', () => {
    if (currentXhr) currentXhr.abort();
    location.reload();
});

const busyScreen = document.getElementById('busyScreen');

socket.on('session-status', ({ status }) => {
    if (status === 'busy') {
        uploadSection.style.display = 'none';
        progressContainer.style.display = 'none';
        successMessage.style.display = 'none';
        busyScreen.style.display = 'block';
    } else {
        // If we were busy and now it's free, reload to get a fresh state
        if (busyScreen.style.display === 'block') {
            location.reload();
        }
    }
});
