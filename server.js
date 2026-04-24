const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');
const Busboy = require('busboy');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const PORT = 977;

// Get Local IPv4 Address (Prioritizing real Wi-Fi/Ethernet)
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    let backupIP = '127.0.0.1';

    const sortedNames = Object.keys(interfaces).sort((a, b) => {
        const priority = (name) => {
            if (/wi-fi|wlan|wireless/i.test(name)) return 1;
            if (/ethernet/i.test(name) && !/virtual|vbox|vmware/i.test(name)) return 2;
            return 3;
        };
        return priority(a) - priority(b);
    });

    for (const name of sortedNames) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                if (iface.address.startsWith('192.168.56.')) continue;
                if (iface.address.startsWith('192.168.99.')) continue;
                if (/wi-fi|wlan|wireless/i.test(name)) return iface.address;
                if (/ethernet/i.test(name) && !/virtual|vbox|vmware/i.test(name)) return iface.address;
                if (backupIP === '127.0.0.1') backupIP = iface.address;
            }
        }
    }
    return backupIP;
}

const LOCAL_IP = getLocalIP();
let UPLOAD_DIR = '';

function getUniqueFilename(filename) {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    let finalName = filename;
    let counter = 1;

    while (fs.existsSync(path.join(UPLOAD_DIR, finalName))) {
        finalName = `${base} (${counter})${ext}`;
        counter++;
    }
    return finalName;
}

app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const activeUploads = new Map();

app.post('/upload', (req, res) => {
    const busboy = Busboy({ headers: req.headers });
    const socketId = req.headers['x-socket-id']; // We'll send this from the client
    
    if (!activeUploads.has(socketId)) {
        activeUploads.set(socketId, []);
    }
    const myStreams = activeUploads.get(socketId);

    busboy.on('file', (name, file, info) => {
        const { filename } = info;

        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }

        const uniqueName = getUniqueFilename(filename);
        const saveTo = path.join(UPLOAD_DIR, uniqueName);
        const writeStream = fs.createWriteStream(saveTo);
        
        const streamInfo = { name: uniqueName, path: saveTo, stream: writeStream, finished: false };
        myStreams.push(streamInfo);

        writeStream.on('error', (err) => {
            console.error('Write stream error:', err);
            io.emit('transfer-error', { name: uniqueName });
        });
        
        console.log(`Receiving: ${uniqueName}`);
        io.emit('transfer-start', { name: uniqueName });

        file.pipe(writeStream);

        file.on('end', () => {
            streamInfo.finished = true;
            console.log(`Finished: ${uniqueName}`);
            io.emit('transfer-success', { name: uniqueName });
        });
    });

    busboy.on('finish', () => {
        res.status(200).send('OK');
    });

    req.pipe(busboy);
});

let UploaderId = null;

function cleanupStreams(socketId) {
    const streams = activeUploads.get(socketId);
    if (streams) {
        streams.forEach(item => {
            if (!item.finished) {
                item.stream.destroy();
                if (fs.existsSync(item.path)) {
                    try { fs.unlinkSync(item.path); } catch (e) {}
                }
                io.emit('transfer-cancelled', { name: item.name });
            }
        });
        activeUploads.delete(socketId);
    }
}

// Socket logic
io.on('connection', (socket) => {
    socket.on('identify', (type) => {
        if (type === 'uploader') {
            if (!UploaderId) {
                UploaderId = socket.id;
                socket.emit('session-status', { status: 'allowed' });
                io.emit('uploader-connected');
            } else {
                socket.emit('session-status', { status: 'busy' });
            }
        }
    });

    socket.on('batch-start', (data) => {
        socket.broadcast.emit('batch-start', data);
    });

    socket.on('upload-progress', (data) => {
        socket.broadcast.emit('remote-progress', data);
    });

    socket.on('batch-complete', () => {
        socket.broadcast.emit('batch-complete');
        // Clear finished streams from the map to save memory
        activeUploads.delete(socket.id);
    });

    socket.on('cancel-all', () => {
        cleanupStreams(socket.id);
        socket.broadcast.emit('force-cancel');
    });

    socket.on('disconnect', () => {
        cleanupStreams(socket.id);
        if (socket.id === UploaderId) {
            UploaderId = null;
            io.emit('uploader-disconnected');
            io.emit('session-status', { status: 'allowed' });
        }
    });
});

function startServer(dir, onStart) {
    UPLOAD_DIR = dir;
    // Initial creation
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running at http://${LOCAL_IP}:${PORT}`);
        if (onStart) onStart(LOCAL_IP, PORT);
    });

    // Support for massive files (10GB+): Disable timeouts
    server.timeout = 0; 
    server.keepAliveTimeout = 0;
}

module.exports = { startServer, getLocalIP, PORT };
