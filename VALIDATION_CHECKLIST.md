# VALIDATION CHECKLIST - React Hooks & Popover Fixes
**Status:** Ready for testing | **Date:** 2026-03-23

---

## 🔧 Fixes Applied

- [x] **icon.tsx** - Removed `'use client'` directive
- [x] **apple-icon.tsx** - Removed `'use client'` directive  
- [x] **popover.tsx** - Fixed Popover.Root export
- [x] **recipe-drawer.tsx** - Added popover state management
- [x] **next.config.js** - Hybrid Turbopack + webpack config
- [x] **CRON_SECRET** - Updated to ASCII-only value

---

## ✅ Pre-Deployment Tests

### Local Build Test
```bash
cd /vercel/share/v0-project

# 1. Clean build
pnpm clean 2>/dev/null || true
pnpm install

# 2. Build (should complete without errors)
pnpm build
# Expected: ✅ Build successful

# 3. Check for React errors
# Expected output: No React #300, #301, #310 errors

# 4. Start server
pnpm start
# Expected: Server running on http://localhost:3000
```

### Console Validation (after pnpm start)
```javascript
// Open DevTools Console (F12) and run:

// 1. Check PopoverTrigger exists
import { PopoverTrigger } from '@/components/ui/popover'
console.log("PopoverTrigger:", typeof PopoverTrigger)
// Expected: PopoverTrigger: function

// 2. Check for React errors
console.log("React errors:", 
  Array.from(document.querySelectorAll('[data-react-error]')).length
)
// Expected: 0 errors

// 3. Test Popover interaction
// - Click any "Material" or "Packaging" button
// Expected: Popover opens smoothly
// Expected: Popover closes after selection
// Expected: No console warnings
```

### UI Interaction Test
- [ ] Navigate to Recipe/Production page
- [ ] Click "Material" popover button
  - [ ] Popover opens immediately
  - [ ] Can search materials
  - [ ] Selection works
  - [ ] Popover closes after selection
- [ ] Click "Packaging" popover button  
  - [ ] Popover opens immediately
  - [ ] Can search packaging
  - [ ] Selection works
  - [ ] Popover closes after selection
- [ ] No console errors during interaction

---

## 📱 API Tests

### Quick Order API
```bash
# Test API endpoint
curl -X POST http://localhost:3000/api/quick-order \
  -H "Content-Type: application/json" \
  -d '{"items": [{"id": "123", "quantity": 1}]}'

# Expected: Status 200 or 201
# NOT 500
```

---

## 🚀 Deployment Verification

### Before Pushing
```bash
# 1. Check git status
git status
# Should show only modified files listed in REACT_HOOKS_FIXES_*.md

# 2. Review changes
git diff

# 3. Commit message
git add .
git commit -m "fix: resolve React #310 hooks, PopoverTrigger, and image response"

# 4. Push to branch
git push origin v0/kifgedexpert-droid-525406ca
```

### Vercel Deployment Logs
After pushing, check Vercel for:
- [ ] Build starts successfully
- [ ] No "React hook violations" warnings
- [ ] No "PopoverTrigger undefined" errors
- [ ] No "ImageResponse" errors
- [ ] Build completes in < 5 minutes
- [ ] Deployment URL accessible

### Post-Deployment Testing
- [ ] Visit https://your-preview-url.vercel.app
- [ ] Check console (F12) for errors
- [ ] Test popover interactions
- [ ] Test API endpoints
- [ ] Check favicon loads correctly

---

## 📊 Expected Results

| Test | Before | After | Status |
|------|--------|-------|--------|
| React #310 Error | ❌ Present | ✅ Gone | [ ] |
| React #301 Error | ❌ Present | ✅ Gone | [ ] |
| PopoverTrigger | ❌ Undefined | ✅ Defined | [ ] |
| OG Image | ❌ Error | ✅ Generated | [ ] |
| Popover Open/Close | ❌ Buggy | ✅ Smooth | [ ] |
| Build Time | ❌ > 10min | ✅ < 5min | [ ] |
| API /quick-order | ❌ 500 | ✅ 200/201 | [ ] |

---

## 🆘 Troubleshooting

### If React #310 Error Persists
```bash
# 1. Clear cache
rm -rf .next node_modules
pnpm install

# 2. Check all files use proper hook patterns
grep -r "if.*useState\|useState.*if" components/ app/

# 3. Verify popover state at top
# Check recipe-drawer.tsx lines 71-72
```

### If PopoverTrigger Still Undefined
```bash
# 1. Verify popover.tsx export
cat components/ui/popover.tsx | grep "export.*Popover"
# Should show: export { Popover, PopoverTrigger, ... }

# 2. Force rebuild
rm -rf .next
pnpm build
```

### If OG Image Still Errors
```bash
# 1. Verify icon.tsx has NO 'use client'
head -5 app/icon.tsx
# Should start with: import { ImageResponse }

# 2. Check runtime setting
grep "runtime" app/icon.tsx
# Should show: export const runtime = 'edge'
```

### If Build Fails
```bash
# 1. Check TypeScript errors
pnpm type-check

# 2. Check next.config.js syntax
node -e "require('./next.config.js')"

# 3. Full clean rebuild
rm -rf .next node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

---

## ✨ Success Indicators

- ✅ Build completes without errors
- ✅ No React hook violations in console
- ✅ PopoverTrigger properly exported
- ✅ OG images generated
- ✅ Popovers open/close smoothly
- ✅ API returns correct status codes
- ✅ No performance regression

---

## 📋 Sign-Off

Once all tests pass:

- [ ] Local build successful
- [ ] Console validation passed
- [ ] UI interaction tested
- [ ] API endpoints working
- [ ] Vercel deployment successful
- [ ] All fixes verified

**Ready for production:** ✅

---

**Last Updated:** 2026-03-23  
**Branch:** v0/kifgedexpert-droid-525406ca  
**Fixes Summary:** See REACT_HOOKS_FIXES_2026-03-23.md
