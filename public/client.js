const socket = io();
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

    const formData = new FormData();
    const progressItems = [];

    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
        
        const item = document.createElement('div');
        item.className = 'file-progress-item';
        item.innerHTML = `
            <div class="file-info">
                <span>${files[i].name}</span>
                <span class="percent">0%</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill"></div>
            </div>
        `;
        fileList.appendChild(item);
        progressItems.push({
            fill: item.querySelector('.progress-bar-fill'),
            text: item.querySelector('.percent')
        });
    }

    // Add a global cancel button for the batch
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'secondary-btn';
    cancelBtn.style.marginTop = '1rem';
    cancelBtn.style.width = '100%';
    cancelBtn.textContent = 'Cancel All Transfers';
    cancelBtn.onclick = () => {
        if (currentXhr) currentXhr.abort();
        location.reload();
    };
    fileList.appendChild(cancelBtn);

    const xhr = new XMLHttpRequest();
    currentXhr = xhr;

    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            
            progressItems.forEach(item => {
                item.fill.style.width = percentComplete + '%';
                item.text.textContent = percentComplete + '%';
            });

            // Report progress to server for Desktop
            socket.emit('upload-progress', { 
                percent: percentComplete,
                files: Array.from(files).map(f => f.name)
            });
        }
    });

    xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
            progressContainer.style.display = 'none';
            successMessage.style.display = 'block';
        } else if (xhr.status !== 0) {
            alert('Upload failed.');
            location.reload();
        }
    });

    xhr.addEventListener('abort', () => {
        console.log('Upload aborted by user');
    });

    xhr.open('POST', '/upload', true);
    xhr.send(formData);
}

// Listen for remote cancel from Desktop
socket.on('force-cancel', () => {
    if (currentXhr) currentXhr.abort();
    location.reload();
});
