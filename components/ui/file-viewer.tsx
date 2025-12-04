"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Maximize, MoveHorizontal, Loader2 } from "lucide-react"
import { Document, Page, pdfjs } from "react-pdf"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const ZOOM_LEVELS = [25, 50, 75, 100, 125, 150, 200, 300, 400]

interface FileViewerProps {
  fileUrl: string
  fileName: string
  fileType: "image" | "video" | "pdf"
}

export function FileViewer({ fileUrl, fileName, fileType }: FileViewerProps) {
  const [zoomIndex, setZoomIndex] = useState(3) // 100% by default
  const [fitMode, setFitMode] = useState<"width" | "height" | "zoom">("zoom") // Default to zoom mode at 100%
  const [lastTap, setLastTap] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })

  // PDF specific state
  const [numPages, setNumPages] = useState<number>(0)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pdfPageSize, setPdfPageSize] = useState({ width: 0, height: 0 })

  const zoom = ZOOM_LEVELS[zoomIndex]

  useEffect(() => {
    setZoomIndex(3) // 100%
    setFitMode("zoom")
    setNumPages(0)
    setPdfLoading(true)
    setPdfError(null)
    setImageNaturalSize({ width: 0, height: 0 })
    setPdfPageSize({ width: 0, height: 0 })
  }, [fileUrl])

  useEffect(() => {
    if (!containerRef.current) return
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }
    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  const calculateEffectiveZoom = useCallback((): number => {
    if (fitMode === "zoom") return zoom

    const baseWidth = containerSize.width * 0.8
    if (baseWidth === 0) return 100

    if (fileType === "image" && imageNaturalSize.width > 0) {
      if (fitMode === "width") {
        const fitWidth = containerSize.width - 48
        return Math.round((fitWidth / baseWidth) * 100)
      } else {
        const fitHeight = containerSize.height - 48
        const fitWidth = fitHeight * (imageNaturalSize.width / imageNaturalSize.height)
        return Math.round((fitWidth / baseWidth) * 100)
      }
    }

    if (fileType === "pdf" && pdfPageSize.width > 0) {
      if (fitMode === "width") {
        const fitWidth = containerSize.width - 48
        return Math.round((fitWidth / baseWidth) * 100)
      } else {
        const fitHeight = containerSize.height - 96
        const fitWidth = fitHeight * (pdfPageSize.width / pdfPageSize.height)
        return Math.round((fitWidth / baseWidth) * 100)
      }
    }

    return 100
  }, [fitMode, zoom, containerSize, imageNaturalSize, pdfPageSize, fileType])

  const findClosestZoomIndex = useCallback((effectiveZoom: number): number => {
    let closestIndex = 0
    let closestDiff = Math.abs(ZOOM_LEVELS[0] - effectiveZoom)

    for (let i = 1; i < ZOOM_LEVELS.length; i++) {
      const diff = Math.abs(ZOOM_LEVELS[i] - effectiveZoom)
      if (diff < closestDiff) {
        closestDiff = diff
        closestIndex = i
      }
    }
    return closestIndex
  }, [])

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (fileType === "video") return
      e.preventDefault()
      if (fitMode === "zoom") {
        setFitMode("width")
      } else {
        setFitMode("zoom")
        setZoomIndex(5) // 150%
      }
    },
    [fitMode, fileType],
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (fileType === "video") return
      const now = Date.now()
      if (now - lastTap < 300) {
        e.preventDefault()
        if (fitMode === "zoom") {
          setFitMode("width")
        } else {
          setFitMode("zoom")
          setZoomIndex(5) // 150%
        }
      }
      setLastTap(now)
    },
    [lastTap, fitMode, fileType],
  )

  const zoomIn = () => {
    const effectiveZoom = calculateEffectiveZoom()
    const currentIndex = findClosestZoomIndex(effectiveZoom)
    const nextIndex = Math.min(ZOOM_LEVELS.length - 1, currentIndex + 1)
    setFitMode("zoom")
    setZoomIndex(nextIndex)
  }

  const zoomOut = () => {
    const effectiveZoom = calculateEffectiveZoom()
    const currentIndex = findClosestZoomIndex(effectiveZoom)
    const nextIndex = Math.max(0, currentIndex - 1)
    setFitMode("zoom")
    setZoomIndex(nextIndex)
  }

  const resetView = () => {
    setFitMode("zoom")
    setZoomIndex(3) // 100%
  }

  const toggleFitDirection = () => {
    if (fitMode === "width") {
      setFitMode("height")
    } else {
      setFitMode("width")
    }
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPdfLoading(false)
    setPdfError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error("PDF load error:", error)
    setPdfError("Failed to load PDF")
    setPdfLoading(false)
  }

  const onPdfPageLoadSuccess = (page: { width: number; height: number }) => {
    if (pdfPageSize.width === 0) {
      setPdfPageSize({ width: page.width, height: page.height })
    }
  }

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
  }

  const effectiveZoom = calculateEffectiveZoom()
  const effectiveIndex = findClosestZoomIndex(effectiveZoom)
  const canZoomOut = effectiveIndex > 0 || effectiveZoom > ZOOM_LEVELS[0]
  const canZoomIn = effectiveIndex < ZOOM_LEVELS.length - 1 || effectiveZoom < ZOOM_LEVELS[ZOOM_LEVELS.length - 1]

  if (fileType === "video") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/5 dark:bg-white/5">
        <video src={fileUrl} controls className="max-w-full max-h-full rounded-lg shadow-2xl" autoPlay playsInline />
      </div>
    )
  }

  if (fileType === "pdf") {
    let pdfWidth: number | undefined

    if (fitMode === "width") {
      pdfWidth = containerSize.width - 48
    } else if (fitMode === "height") {
      if (pdfPageSize.width > 0 && pdfPageSize.height > 0) {
        const targetHeight = containerSize.height - 96
        pdfWidth = targetHeight * (pdfPageSize.width / pdfPageSize.height)
      } else {
        pdfWidth = containerSize.width - 48
      }
    } else {
      // Zoom mode - 100% = 80% of container width
      const baseWidth = containerSize.width * 0.8
      pdfWidth = baseWidth * (zoom / 100)
    }

    const isContentWider = pdfWidth && pdfWidth > containerSize.width - 48

    return (
      <div className="w-full h-full flex flex-col relative">
        <div
          ref={containerRef}
          className="flex-1 overflow-auto relative bg-muted/30"
          onDoubleClick={handleDoubleClick}
          onTouchEnd={handleTouchEnd}
        >
          {pdfLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {pdfError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-destructive" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </div>
                <p className="text-muted-foreground">{pdfError}</p>
              </div>
            </div>
          )}

          <div
            className={`flex flex-col py-6 ${isContentWider ? "items-start px-6" : "items-center"}`}
            style={isContentWider ? { minWidth: (pdfWidth || 0) + 48 } : undefined}
          >
            <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError} loading="">
              {Array.from(new Array(numPages), (_, index) => (
                <div key={`page_${index + 1}`} className="shadow-lg rounded-lg overflow-hidden bg-white mb-10">
                  <Page
                    pageNumber={index + 1}
                    width={pdfWidth && pdfWidth > 0 ? pdfWidth : undefined}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onLoadSuccess={index === 0 ? onPdfPageLoadSuccess : undefined}
                  />
                </div>
              ))}
            </Document>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-background/95 backdrop-blur rounded-lg px-2 py-1.5 shadow-lg border border-border">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 cursor-pointer"
            onClick={zoomOut}
            disabled={!canZoomOut}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-mono min-w-[40px] text-center">
            {fitMode !== "zoom" ? (fitMode === "width" ? "W" : "H") : `${zoom}%`}
          </span>
          <Button variant="ghost" size="sm" className="h-7 px-2 cursor-pointer" onClick={zoomIn} disabled={!canZoomIn}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            variant={fitMode === "zoom" && zoomIndex === 3 ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 cursor-pointer"
            onClick={resetView}
            title="100% zoom"
          >
            <Maximize className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={fitMode !== "zoom" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 cursor-pointer"
            onClick={toggleFitDirection}
            title={fitMode === "width" ? "Fit to width (click for height)" : "Fit to height (click for width)"}
          >
            <MoveHorizontal className={`h-3.5 w-3.5 ${fitMode === "height" ? "rotate-90" : ""}`} />
          </Button>

          {numPages > 0 && (
            <>
              <div className="w-px h-5 bg-border mx-1" />
              <span className="text-xs text-muted-foreground">
                {numPages} {numPages === 1 ? "page" : "pages"}
              </span>
            </>
          )}
        </div>
      </div>
    )
  }

  // Image viewer
  const baseWidth = containerSize.width * 0.8
  const zoomedWidth = baseWidth * (zoom / 100)

  return (
    <div className="w-full h-full flex flex-col relative">
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative bg-black/5 dark:bg-white/5"
        onDoubleClick={handleDoubleClick}
        onTouchEnd={handleTouchEnd}
      >
        {fitMode === "width" ? (
          <div className="p-6">
            <img
              ref={imageRef}
              src={fileUrl || "/placeholder.svg"}
              alt={fileName}
              draggable={false}
              onLoad={onImageLoad}
              className="select-none rounded-lg shadow-2xl mx-auto block"
              style={{ width: containerSize.width - 48, height: "auto" }}
            />
          </div>
        ) : fitMode === "height" ? (
          <div className="h-full p-6 overflow-x-auto flex items-center justify-center">
            <img
              ref={imageRef}
              src={fileUrl || "/placeholder.svg"}
              alt={fileName}
              draggable={false}
              onLoad={onImageLoad}
              className="select-none rounded-lg shadow-2xl flex-shrink-0"
              style={{ height: containerSize.height - 48, width: "auto" }}
            />
          </div>
        ) : (
          <div className="p-6" style={{ minWidth: zoomedWidth + 48, minHeight: "100%" }}>
            <img
              ref={imageRef}
              src={fileUrl || "/placeholder.svg"}
              alt={fileName}
              draggable={false}
              onLoad={onImageLoad}
              className="select-none rounded-lg shadow-2xl block mx-auto"
              style={{ width: zoomedWidth > 0 ? zoomedWidth : "80%" }}
            />
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-background/95 backdrop-blur rounded-lg px-2 py-1.5 shadow-lg border border-border">
        <Button variant="ghost" size="sm" className="h-7 px-2 cursor-pointer" onClick={zoomOut} disabled={!canZoomOut}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs font-mono min-w-[40px] text-center">
          {fitMode !== "zoom" ? (fitMode === "width" ? "W" : "H") : `${zoom}%`}
        </span>
        <Button variant="ghost" size="sm" className="h-7 px-2 cursor-pointer" onClick={zoomIn} disabled={!canZoomIn}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button
          variant={fitMode === "zoom" && zoomIndex === 3 ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2 cursor-pointer"
          onClick={resetView}
          title="100% zoom"
        >
          <Maximize className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={fitMode !== "zoom" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2 cursor-pointer"
          onClick={toggleFitDirection}
          title={fitMode === "width" ? "Fit to width (click for height)" : "Fit to height (click for width)"}
        >
          <MoveHorizontal className={`h-3.5 w-3.5 ${fitMode === "height" ? "rotate-90" : ""}`} />
        </Button>
      </div>
    </div>
  )
}
