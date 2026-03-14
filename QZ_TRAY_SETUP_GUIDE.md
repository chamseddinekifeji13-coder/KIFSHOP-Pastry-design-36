# QZ Tray Configuration Guide for KIFSHOP POS80

## Overview

QZ Tray is the recommended solution for printing receipts and opening the cash drawer on the POS80 thermal printer. It provides:
- ✅ Direct thermal printer communication (no print dialogs)
- ✅ Automatic cash drawer opening
- ✅ ESC/POS command support
- ✅ Multi-printer management
- ✅ Windows, Mac, Linux support

---

## Architecture

### Components

1. **Frontend (`lib/qz-tray-service.ts`)**
   - Client-side QZ Tray library integration
   - WebSocket communication with QZ Tray app
   - ESC/POS command formatting (hex format)
   - Receipt generation and printing
   - Cash drawer control

2. **UI Component (`components/treasury/printer-settings.tsx`)**
   - Printer configuration dialog with 4 tabs: QZ Tray, Windows, USB, Network
   - Printer detection and selection
   - Test print and test drawer buttons
   - Live connection status

3. **Integration Point (`components/treasury/treasury-pos-view.tsx`)**
   - Uses `getQZTrayService()` for printing
   - Automatic receipt printing after payment
   - Drawer opening for cash payments
   - Fallback to window.print() if QZ Tray unavailable

4. **Backup Server (`print-bridge/server.js`)**
   - Alternative Windows printer bridge (Node.js server on port 7731)
   - Direct Windows API access via PowerShell
   - Used if QZ Tray is unavailable

5. **Network Printer API (`app/api/treasury/esc-pos/route.ts`)**
   - Backend fallback for network printers
   - Direct TCP socket communication to POS80
   - Works on any IP network

---

## Installation Steps

### Step 1: Download QZ Tray

1. Go to **https://qz.io/download/**
2. Download the Windows installer
3. Run the installer (Administrator rights recommended)
4. QZ Tray will start automatically and appear in system tray

**Verification:**
- Look for QZ Tray icon in Windows system tray (bottom right)
- It should show as a small system tray icon

### Step 2: Configure Firewall (if needed)

QZ Tray uses port **8181** for WebSocket communication:

```
Windows Defender Firewall > Allow an app through firewall
- Add "qz-tray.exe" to allowed apps
- Allow both Private and Public networks
```

Or via PowerShell (Admin):
```powershell
netsh advfirewall firewall add rule name="QZ Tray" dir=in action=allow program="C:\Program Files\QZ\qz-tray.exe"
```

### Step 3: Connect POS80 Printer to Network

1. **Find POS80 IP Address:**
   - Press the configuration button on the back of the POS80
   - The printer will print its network settings including IP address
   - OR use your router's connected devices list

2. **Test Network Connection:**
   ```bash
   # Windows Command Prompt
   ping <POS80-IP-ADDRESS>
   
   # Should receive responses
   ```

3. **Verify TCP Port 9100:**
   ```bash
   # Test connectivity to printer port
   telnet <POS80-IP-ADDRESS> 9100
   
   # Should connect (black screen), type Ctrl+] then Quit
   ```

### Step 4: Configure in KIFSHOP

1. Open KIFSHOP application
2. Go to **Treasury** (Trésorerie) section
3. Click **"Imprimante"** button (top right)
4. Select **"QZ Tray"** tab (first tab, should show lightning icon ⚡)
5. Click **"Vérifier"** button to detect QZ Tray

**Expected Result:**
- Status changes from "QZ Tray Non Disponible" to "QZ Tray Connecté"
- Shows version number (e.g., "Version 2.2.5")
- Shows number of printers found

### Step 5: Select Printer

1. Click dropdown **"Sélectionner l'imprimante POS80"**
2. Choose your POS80 printer from the list
3. Click **"Utiliser cette imprimante"**
4. Click **"Test impression"** to verify

**Expected Result:**
- POS80 prints a test ticket
- Test ticket shows "Configuration OK!"

### Step 6: Test Cash Drawer

1. In the Printer Settings dialog
2. Click **"Ouvrir tiroir"** (Open Drawer) button
3. Cash drawer should open

**Expected Result:**
- Drawer motor engages and opens
- You hear a beep sound

---

## Troubleshooting

### Problem: "QZ Tray Non Disponible"

**Solution 1: QZ Tray Not Running**
- Check Windows system tray for QZ Tray icon
- If not there, open Start Menu and search "QZ Tray"
- Launch the application

**Solution 2: Firewall Blocking**
```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="QZ Tray" dir=in action=allow program="C:\Program Files\QZ\qz-tray.exe"
```

**Solution 3: Wrong Port**
- QZ Tray default port is 8181 (localhost:8181)
- Check if another app uses this port:
```bash
netstat -ano | findstr :8181
```
- If occupied, restart QZ Tray or change its port in settings

### Problem: Printer Not Found

**Cause:** POS80 not detected by QZ Tray

**Solution:**
1. Verify POS80 is powered on and networked
2. Check it appears in QZ Tray settings:
   - Open QZ Tray settings (right-click icon > Settings)
   - Check "Printers" tab
3. If not listed, it may need configuration:
   - Press config button on back of POS80
   - Configure network settings manually
   - Restart printer

### Problem: Test Print Works But Sales Prints Nothing

**Cause:** Different printer selected or payment method issue

**Solution:**
1. Verify correct printer is selected (should be same as test)
2. Check if "Ouvrir tiroir" (Open Drawer) test works
3. In KIFSHOP Treasury, verify printer is still connected
4. Try test print again from Printer Settings

### Problem: Drawer Opens Automatically (Unwanted)

**Cause:** Drawer opens on cash payment by default

**Solution:**
- This is intended behavior for cash payments
- Configure PIN protection if needed (not automatic)
- Or switch to Network printer mode to disable

### Problem: "Erreur connexion: Connection timeout"

**Cause:** Cannot reach QZ Tray app

**Solution:**
1. Verify QZ Tray is running (system tray icon visible)
2. Restart QZ Tray:
   - Right-click icon in system tray
   - Click "Exit" or "Quit"
   - Relaunch application
3. Clear browser cache:
   - Ctrl+Shift+Delete in browser
   - Clear cookies and cached data
   - Refresh KIFSHOP page

---

## ESC/POS Commands Used

QZ Tray communicates with POS80 using ESC/POS thermal printer commands:

```
INIT (1B40)              - Initialize printer
ALIGN_CENTER (1B6101)    - Center text
ALIGN_LEFT (1B6100)      - Left align
BOLD_ON (1B4501)         - Enable bold
BOLD_OFF (1B4500)        - Disable bold
DOUBLE_HEIGHT (1B2101)   - Double height text
DOUBLE_WIDTH (1B2110)    - Double width text
DOUBLE_SIZE (1B2111)     - Double size (both)
NORMAL_SIZE (1B2100)     - Normal size
LINE_FEED (0A)           - New line
CUT_PARTIAL (1D5601)     - Partial cut (tear line)
OPEN_DRAWER_PIN2 (1B7000197A) - Open drawer pin 2
OPEN_DRAWER_PIN5 (1B7001197A) - Open drawer pin 5
```

---

## Backup Solutions

If QZ Tray is unavailable:

### 1. Network Printer Mode (Recommended)
- **Connection:** Direct TCP to POS80 IP:9100
- **Advantages:** No extra software needed
- **Setup:** Treasury > Imprimante > Réseau tab
- **Enter:** POS80 IP address and port 9100

### 2. Print Bridge Server (Windows Only)
- **Server:** `/print-bridge/server.js` (Node.js on port 7731)
- **Advantages:** Advanced Windows printer control
- **Setup:** `node server.js` in print-bridge folder
- **Note:** Can access Windows printers directly

### 3. Windows Mode (Limited)
- **Method:** Browser print dialog (window.print)
- **Disadvantages:** Requires manual print confirmation, no drawer support
- **Use:** Emergency fallback only

---

## Advanced Configuration

### Custom ESC/POS Commands

Modify receipt formatting in `lib/qz-tray-service.ts`:

```typescript
// Receipt data array
const data: string[] = [
  ESCPOS_HEX.INIT,
  ESCPOS_HEX.ALIGN_CENTER,
  ESCPOS_HEX.DOUBLE_SIZE,
  textToHex("CUSTOM HEADER"),
  // ... add your custom ESC/POS here
]
```

### Multiple Printers

1. In Printer Settings, you can switch between printers
2. Each printer remembers its last selection
3. Use `selectPrinter(name)` in code to switch

### Drawer Pin Selection

By default, KIFSHOP uses **PIN2** for drawer opening:
```typescript
OPEN_DRAWER_PIN2: "1B7000197A"  // Default
OPEN_DRAWER_PIN5: "1B7001197A"  // Alternative
```

To change, modify in `lib/qz-tray-service.ts`.

---

## Testing Checklist

- [ ] QZ Tray is running (system tray icon visible)
- [ ] QZ Tray shows "Connecté" in KIFSHOP
- [ ] POS80 printer is detected in printer list
- [ ] Printer is selected and saved
- [ ] Test print produces ticket on POS80
- [ ] Test drawer opens the cash drawer
- [ ] Sale payment prints ticket automatically
- [ ] Sale payment with cash opens drawer
- [ ] Multiple receipts print correctly

---

## Support

For QZ Tray issues:
- **QZ Tray Documentation:** https://qz.io/docs
- **QZ Tray GitHub Issues:** https://github.com/qzind/tray/issues

For KIFSHOP issues:
- **KIFSHOP Repository:** https://github.com/chamseddinekifeji13-coder/KIFSHOP-Pastry-design-36
- **Check:** `VERIFICATION_COMPLETE.md` for system status

---

## Quick Start Video (Optional)

If you have a screen recording tool, you can create a 2-3 minute video:
1. Download QZ Tray
2. Open KIFSHOP Treasury
3. Configure printer
4. Test print
5. Make a sale with payment

---

*Last Updated: March 14, 2026*  
*KIFSHOP Version: 2.0*  
*QZ Tray Support: v2.2.5 CDN*
