# KIFSHOP Pastry - POS System with QZ Tray

*Professional Point of Sale System for pastry shops with thermal printer support*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/kifgedexpert-droids-projects/v0-dashboard-design-36)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/evKkhrYu51X)
[![QZ Tray Ready](https://img.shields.io/badge/QZ%20Tray-Ready-green?style=for-the-badge)](https://qz.io/)

## Overview

KIFSHOP is a comprehensive Point of Sale system for pastry shops with:
- ✅ Professional POS interface with touch support
- ✅ Real-time inventory management
- ✅ QZ Tray thermal printer integration
- ✅ Automatic cash drawer control
- ✅ Multi-user support with role-based access
- ✅ Financial reporting and analytics
- ✅ Customer management and CRM
- ✅ Production planning and recipes

**QZ Tray Integration:** Fully implemented and production-ready. Receipts print automatically without dialog boxes, and cash drawer opens for cash payments.

## 🚀 Quick Start - Printer Setup

### For Users (5 minutes)
1. Download [QZ Tray](https://qz.io/download/) - Free application
2. Run the installer (Administrator)
3. Find your POS80 printer IP address
4. Open KIFSHOP → Treasury → "Imprimante" button
5. Click "Vérifier" and select your printer
6. Click "Test impression" to verify

**Done!** Receipts will now print automatically.

📘 **Full Setup Guide:** See `QZ_TRAY_SETUP_GUIDE.md`

---

## Features

### POS System
- 🛒 Fast product search and selection
- 💳 Multiple payment methods (Cash, Card, Check)
- 🧾 Professional receipts
- 🎫 Cash drawer control
- 📊 Sales history

### Inventory
- 📦 Stock tracking
- ⚙️ Recipe management
- 🔄 Automatic consumption tracking
- 📈 Reorder alerts

### Business
- 👥 Customer database
- 📞 CRM features
- 💰 Financial reporting
- 👨‍💼 Multi-user with roles
- 📱 Responsive design

### Printer Support
- ⚡ QZ Tray (Primary - Recommended)
- 🌐 Network printer (Fallback)
- 🔌 USB printer (Fallback)
- 🖨️ Windows printing (Fallback)
- 🖥️ Print Bridge server (Backup)

---

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, TailwindCSS
- **Printer Integration:** QZ Tray WebSocket, ESC/POS commands
- **Database:** Supabase PostgreSQL with RLS
- **Auth:** Supabase Auth
- **Deployment:** Vercel

---

## Project Structure

```
├── app/
│   ├── (dashboard)/      # Main business pages
│   ├── (super-admin)/    # Admin pages
│   ├── auth/             # Authentication
│   └── api/              # Backend routes
│
├── components/
│   ├── treasury/         # POS system
│   │   ├── printer-settings.tsx     # Printer configuration
│   │   ├── treasury-pos-view.tsx    # Main POS interface
│   │   ├── payment-numpad.tsx       # Payment input
│   │   └── sales-history-panel.tsx  # Receipt history
│   └── [other components]
│
├── lib/
│   ├── qz-tray-service.ts          # QZ Tray integration
│   ├── thermal-printer.ts           # USB printer support
│   ├── sound-manager.ts             # Payment sounds
│   └── utils.ts                     # Utilities
│
└── print-bridge/
    └── server.js                    # Windows printer bridge

```

---

## Documentation

| Document | Purpose |
|----------|---------|
| **QZ_TRAY_SUMMARY.md** | Start here - overview and quick start |
| **QZ_TRAY_SETUP_GUIDE.md** | User setup instructions (detailed) |
| **QZ_TRAY_INTEGRATION_STATUS.md** | Technical architecture & implementation |
| **QZ_TRAY_QUICK_REFERENCE.md** | Developer reference and code examples |
| **VERIFICATION_COMPLETE.md** | Full system verification report |

---

## API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/treasury/pos-sale` | Record transaction |
| `POST /api/treasury/esc-pos` | Print receipt / open drawer |
| `GET /api/treasury/cashier-stats` | Cashier statistics |
| `POST /api/quick-order` | Quick order creation |
| `GET /api/active-profile` | Current user profile |

---

## Development

### Requirements
- Node.js 18+
- npm or pnpm
- Git

### Setup
```bash
# Clone repository
git clone https://github.com/chamseddinekifeji13-coder/KIFSHOP-Pastry-design-36

# Install dependencies
npm install

# Set environment variables (copy .env.example)
cp .env.example .env.local

# Run development server
npm run dev

# Open http://localhost:3000
```

### Build
```bash
npm run build
npm start
```

---

## Deployment

### Vercel (Recommended)
```bash
git push origin main
# Vercel auto-deploys in ~2 minutes
```

Your project is live at:
**[https://vercel.com/kifgedexpert-droids-projects/v0-dashboard-design-36](https://vercel.com/kifgedexpert-droids-projects/v0-dashboard-design-36)**

---

## Printer Modes

### 1. QZ Tray (Primary - Recommended)
- ✅ No print dialogs
- ✅ Automatic drawer opening
- ✅ Professional receipts
- ❌ Requires QZ Tray app

### 2. Network Printer (Fallback)
- ✅ Works immediately
- ✅ No extra software
- ❌ Drawer support limited
- ❌ Requires IP configuration

### 3. Windows Mode (Basic)
- ✅ Always available
- ❌ Print dialog required
- ❌ No drawer support

### 4. USB Mode (For USB Printers)
- ✅ Browser-native WebUSB
- ❌ Browser security requirements

### 5. Print Bridge (Windows Advanced)
- ✅ Direct Windows printer control
- ❌ Requires Node.js server

---

## Troubleshooting

### "QZ Tray Non Disponible"
→ Start QZ Tray from Windows Start Menu

### "Printer Not Found"
→ Click "Vérifier" button, verify printer is powered on

### "Receipts Not Printing"
→ Click "Test impression" to verify, check network/IP

### "Drawer Not Opening"
→ Click "Ouvrir tiroir" to test drawer function

**See `QZ_TRAY_QUICK_REFERENCE.md` for more troubleshooting**

---

## Support

- 📘 **User Support:** See `QZ_TRAY_SETUP_GUIDE.md`
- 👨‍💻 **Developer Support:** See `QZ_TRAY_QUICK_REFERENCE.md`
- 🏗️ **Architecture:** See `QZ_TRAY_INTEGRATION_STATUS.md`
- 🐛 **Issues:** Check GitHub issues or browser console

---

## License

This project is part of KIFSHOP Business Suite. Proprietary - All rights reserved.

---

## Status

✅ **Production Ready**  
✅ **QZ Tray Integrated**  
✅ **Fully Tested**  
✅ **Documented**  

**Last Updated:** March 14, 2026
