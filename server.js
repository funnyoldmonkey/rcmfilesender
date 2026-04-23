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
const UPLOAD_DIR = path.join(os.homedir(), 'Desktop', 'RCM_Uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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

app.post('/upload', (req, res) => {
    const busboy = Busboy({ headers: req.headers });
    let currentFiles = [];

    busboy.on('file', (name, file, info) => {
        const { filename } = info;
        const uniqueName = getUniqueFilename(filename);
        const saveTo = path.join(UPLOAD_DIR, uniqueName);
        const writeStream = fs.createWriteStream(saveTo);
        
        currentFiles.push({ name: uniqueName, path: saveTo });
        
        console.log(`Receiving: ${uniqueName}`);
        io.emit('transfer-start', { name: uniqueName });

        file.pipe(writeStream);

        file.on('end', () => {
            console.log(`Finished: ${uniqueName}`);
            io.emit('transfer-success', { name: uniqueName });
        });

        // If the request is closed prematurely (cancelled)
        req.on('aborted', () => {
            writeStream.destroy();
            if (fs.existsSync(saveTo)) fs.unlinkSync(saveTo);
            io.emit('transfer-cancelled', { name: uniqueName });
        });
    });

    busboy.on('finish', () => {
        res.status(200).send('OK');
    });

    req.pipe(busboy);
});

// Socket logic for progress and remote cancel
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('upload-progress', (data) => {
        // Relay progress from mobile to desktop
        socket.broadcast.emit('remote-progress', data);
    });

    socket.on('cancel-all', () => {
        socket.broadcast.emit('force-cancel');
    });
});

function startServer(onStart) {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running at http://${LOCAL_IP}:${PORT}`);
        if (onStart) onStart(LOCAL_IP, PORT);
    });
}

module.exports = { startServer, getLocalIP, PORT };
