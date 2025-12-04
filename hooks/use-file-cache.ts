"use client"

import { useRef, useCallback } from "react"

interface CacheEntry {
  blobUrl: string
  timestamp: number
}

// Simple in-memory cache for loaded files
// Stores blob URLs so switching between files is instant
export function useFileCache() {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map())
  const MAX_CACHE_SIZE = 50 // Increased to 50 to hold more files

  const getCachedUrl = useCallback((originalUrl: string): string | null => {
    const entry = cacheRef.current.get(originalUrl)
    return entry?.blobUrl || null
  }, [])

  const cacheFile = useCallback(async (originalUrl: string): Promise<string> => {
    // Check if already cached
    const existing = cacheRef.current.get(originalUrl)
    if (existing) {
      return existing.blobUrl
    }

    try {
      // Fetch and create blob URL
      const response = await fetch(originalUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      // Evict old entries if cache is full
      if (cacheRef.current.size >= MAX_CACHE_SIZE) {
        const entries = Array.from(cacheRef.current.entries())
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
        const oldest = entries[0]
        if (oldest) {
          URL.revokeObjectURL(oldest[1].blobUrl)
          cacheRef.current.delete(oldest[0])
        }
      }

      // Store in cache
      cacheRef.current.set(originalUrl, {
        blobUrl,
        timestamp: Date.now(),
      })

      return blobUrl
    } catch {
      // If caching fails, return original URL
      return originalUrl
    }
  }, [])

  const preloadFile = useCallback(async (url: string) => {
    // Silently preload without blocking
    if (!cacheRef.current.has(url)) {
      try {
        const response = await fetch(url)
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)

        if (cacheRef.current.size >= MAX_CACHE_SIZE) {
          const entries = Array.from(cacheRef.current.entries())
          entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
          const oldest = entries[0]
          if (oldest) {
            URL.revokeObjectURL(oldest[1].blobUrl)
            cacheRef.current.delete(oldest[0])
          }
        }

        cacheRef.current.set(url, {
          blobUrl,
          timestamp: Date.now(),
        })
      } catch {
        // Silently fail preloading
      }
    }
  }, [])

  const preloadAllFiles = useCallback(
    (urls: string[]) => {
      // Preload files with a small delay between each to avoid overwhelming the network
      urls.forEach((url, index) => {
        if (url && !cacheRef.current.has(url)) {
          setTimeout(() => {
            preloadFile(url)
          }, index * 100) // Stagger by 100ms each
        }
      })
    },
    [preloadFile],
  )

  return { getCachedUrl, cacheFile, preloadFile, preloadAllFiles }
}
