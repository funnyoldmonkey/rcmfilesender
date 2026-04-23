# RCM File Sender

**RCM File Sender** is a professional, high-performance desktop application built with Electron and Node.js. It allows users to transfer massive files (10GB+) from their mobile phones directly to their computer over a local Wi-Fi connection using a simple QR code scan.

![Branding](assets/logo.png)

## 📥 [Download Latest Version (Windows & macOS)](https://github.com/funnyoldmonkey/rcmfilesender/releases/latest)

## 🚀 Key Features

- **Multi-Platform**: Supports Windows, macOS, and Linux.
- **Instant Connection**: Auto-detects PC's local IP and generates a high-contrast QR code for mobile discovery.
- **High-Performance Streaming**: Uses `Busboy` to stream file data directly to the disk, ensuring low RAM usage even for 10GB+ files.
- **Real-Time Sync**: Powered by `Socket.io`, providing live progress bars on both the Desktop and Mobile interfaces simultaneously.
- **Bi-Directional Cancellation**: Ability to cancel transfers from either the phone or the PC with automatic cleanup of partial files.
- **Smart Duplicate Handling**: Automatically renames files (e.g., `file (1).png`) if a duplicate exists in the upload folder.
- **Premium UI/UX**: Professional "Navy Blue & White" corporate aesthetic with "Built by Jall Fiel" branding.

## 🛠️ Technology Stack

- **Core**: Electron, Node.js, Express.js
- **Streaming**: Busboy
- **Real-Time**: Socket.io
- **Utilities**: QRCode.js
- **Styling**: Vanilla CSS (Modern, Responsive)

## 📥 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/funnyoldmonkey/rcmfilesender.git
   cd rcmfilesender
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the application**:
   ```bash
   npm start
   ```

## 📦 Building Standalone Executables

The project is configured with GitHub Actions to build for all platforms automatically. However, you can build locally:

### Windows
```bash
npm run build:win
```

### macOS (Requires a Mac)
```bash
npm run build:mac
```

### Linux
```bash
npm run build:linux
```

## 📂 Upload Directory

By default, all uploaded files are saved to your Desktop:
- **Windows**: `C:\Users\[YourUser]\Desktop\RCM_Uploads`
- **macOS**: `/Users/[YourUser]/Desktop/RCM_Uploads`
- **Linux**: `/home/[YourUser]/Desktop/RCM_Uploads`

## 👤 Author

Built with ❤️ by **Jall Fiel**.

## 📄 License

MIT License - feel free to use and modify for your own projects!

