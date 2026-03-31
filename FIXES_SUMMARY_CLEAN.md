# Production & Packer Interface Fixes - Summary

## Overview
This commit addresses SWR cache invalidation issues and removes unused code in the production and packer modules.

## Changes Made

### 1. `components/production/recipe-drawer.tsx`
**Problem:** Unused `useSWRConfig` import and declaration creating unnecessary code bloat.

**Fix:**
- Removed import: `import { useSWRConfig } from "swr"`
- Removed declaration: `const { mutate } = useSWRConfig()`
- Cache invalidation now properly handled via `onSuccess?.()` callback

**Impact:** Cache revalidation works through the callback chain: RecipeDrawer → onSuccess → mutateRecipes()

---

### 2. `components/production/production-batch-drawer.tsx`
**Problem:** Invalid SWR cache invalidation syntax and unused imports.

**Fixes:**
- Removed import: `import { useSWRConfig } from "swr"`
- Removed declaration: `const { mutate } = useSWRConfig()`
- Removed invalid call: `mutate((key: string) => typeof key === "string" && key.includes("batches"))`
  - This syntax is not supported by SWR's `useSWRConfig().mutate()`
- Added `onSuccess?: () => void` parameter to interface `ProductionBatchDrawerProps`
- Added callback invocation: `onSuccess?.()` after successful batch creation

**Impact:** Proper cache invalidation via callback: ProductionBatchDrawer → onSuccess → mutateBatches()

---

### 3. `components/production/production-view.tsx`
**Problem:** ProductionBatchDrawer not revalidating cache after creation.

**Fix:**
- Updated ProductionBatchDrawer usage to include callback:
  ```tsx
  <ProductionBatchDrawer 
    open={batchDrawerOpen} 
    onOpenChange={setBatchDrawerOpen} 
    preselectedRecipeId={selectedRecipe} 
    onSuccess={() => mutateBatches()} 
  />
  ```

**Impact:** After creating a production batch, the cache is automatically revalidated and UI updates immediately.

---

## Technical Details

### SWR Cache Invalidation Pattern
The correct pattern for SWR cache invalidation in this app:

```tsx
// ✓ Correct: Using onSuccess callback
<ProductionBatchDrawer 
  onSuccess={() => mutateBatches()} 
/>

// ✗ Incorrect: Using useSWRConfig() mutate with function matcher
const { mutate } = useSWRConfig()
mutate((key) => key.includes("batches"))  // NOT SUPPORTED
```

### Files NOT Modified
- `app/packer/login/page.tsx` - Already correct
- `app/packer/dashboard/page.tsx` - Already correct
- `lib/production/actions.ts` - Already correct (no phantom columns)

---

## Testing Checklist

- [ ] Create a new recipe → should appear in "Fiches techniques" tab
- [ ] Create a production batch → should appear in "Lots de production" tab
- [ ] Verify UI updates immediately after creation (no manual refresh needed)
- [ ] Check browser console for no SWR warnings

---

## Commit Message

```
fix: resolve SWR cache invalidation and remove unused code

- Remove useSWRConfig import from recipe-drawer and production-batch-drawer
- Fix invalid SWR cache invalidation syntax in production-batch-drawer
- Add onSuccess callback to ProductionBatchDrawer for proper cache revalidation
- Ensure recipe and batch caches are invalidated after creation

This fixes the issue where newly created recipes and batches were not
appearing in their respective tabs without manual page refresh.
```

---

## Migration Notes

If you're reverting changes:
1. The old code had `mutate((key) => ...)` which never actually worked
2. Cache was never being invalidated after batch/recipe creation
3. This fix ensures proper real-time updates
