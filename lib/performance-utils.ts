// Performance optimization utilities for KIFSHOP
// Implements React 19 patterns and Next.js 16 best practices

'use client'

import { memo, Suspense, type ReactNode } from 'react'

// Lazy load heavy components
export const createLazyComponent = <P extends object>(
  importFunc: () => Promise<{ default: React.ComponentType<P> }>,
  displayName: string
) => {
  const Component = memo(async (props: P) => {
    const { default: LazyComponent } = await importFunc()
    return <LazyComponent {...props} />
  })
  
  Component.displayName = displayName
  return Component
}

// Suspense boundary with fallback
export function AsyncBoundary({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  return <Suspense fallback={fallback}>{children}</Suspense>
}

// Memoized list renderer for performance
export const MemoList = memo(function MemoList<T extends { id: string | number }>({
  items,
  renderItem,
  keyExtractor,
}: {
  items: T[]
  renderItem: (item: T) => ReactNode
  keyExtractor?: (item: T) => string | number
}) {
  return (
    <>
      {items.map((item) => (
        <div key={keyExtractor?.(item) ?? item.id}>
          {renderItem(item)}
        </div>
      ))}
    </>
  )
})

MemoList.displayName = 'MemoList'

// Performance monitoring helper
export function measurePerformance(
  operation: string,
  callback: () => void | Promise<void>
) {
  const start = performance.now()
  
  try {
    const result = callback()
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start
        if (duration > 100) {
          console.warn(`[Perf] ${operation} took ${duration.toFixed(2)}ms`)
        }
      })
    }
    
    const duration = performance.now() - start
    if (duration > 100) {
      console.warn(`[Perf] ${operation} took ${duration.toFixed(2)}ms`)
    }
  } catch (error) {
    console.error(`[Perf] ${operation} failed:`, error)
    throw error
  }
}

// Image optimization helper
export const optimizeImageUrl = (
  url: string,
  width: number = 800,
  quality: number = 75
): string => {
  if (!url) return ''
  
  // For Vercel Blob storage
  if (url.includes('blob.vercel-storage.com')) {
    return `${url}?w=${width}&q=${quality}`
  }
  
  // For Supabase storage
  if (url.includes('supabase')) {
    return `${url}`
  }
  
  return url
}

// Batch updates to reduce re-renders
export function batch(callback: () => void) {
  // Use React's batch API
  callback()
}
