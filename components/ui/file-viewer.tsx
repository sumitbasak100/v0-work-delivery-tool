"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Maximize, MoveHorizontal, Loader2, Play, X } from "lucide-react"
import { Document, Page, pdfjs } from "react-pdf"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const ZOOM_LEVELS = [25, 50, 75, 100, 125, 150, 200, 300, 400]

interface FileViewerProps {
  fileUrl: string
  fileName: string
  fileType: "image" | "video" | "pdf"
  cachedUrl?: string | null
  // Markup support
  markupMode?: boolean
  pendingMarkup?: { x: number; y: number; timestamp?: number; page?: number } | null // Add page to pendingMarkup type
  onMarkupClick?: (x: number, y: number, timestamp?: number, page?: number) => void // Add page parameter
  onClearMarkup?: () => void
  feedbackWithMarkups?: Array<{
    id: string
    markup_x: number | null
    markup_y: number | null
    markup_timestamp?: number | null
    markup_page?: number | null // Add markup_page to feedback type
  }>
  onMarkupHover?: (feedbackId: string | null) => void
  highlightedFeedbackId?: string | null
  onSeekToTimestamp?: (timestamp: number) => void
  videoRef?: React.RefObject<HTMLVideoElement>
  onVideoPauseForMarkup?: () => void
}

export function FileViewer({
  fileUrl,
  fileName,
  fileType,
  cachedUrl,
  markupMode = false,
  pendingMarkup = null,
  onMarkupClick,
  onClearMarkup,
  feedbackWithMarkups = [],
  onMarkupHover,
  highlightedFeedbackId,
  onSeekToTimestamp,
  videoRef: externalVideoRef,
  onVideoPauseForMarkup,
}: FileViewerProps) {
  const effectiveUrl = fileType === "pdf" ? fileUrl : cachedUrl || fileUrl

  const [zoomIndex, setZoomIndex] = useState(3)
  const [fitMode, setFitMode] = useState<"width" | "height" | "zoom">("zoom")
  const [lastTap, setLastTap] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const internalVideoRef = useRef<HTMLVideoElement>(null)
  const videoRef = externalVideoRef || internalVideoRef
  const contentRef = useRef<HTMLDivElement>(null)

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })

  const [numPages, setNumPages] = useState<number>(0)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pdfPageSize, setPdfPageSize] = useState({ width: 0, height: 0 })

  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [videoStarted, setVideoStarted] = useState(false)
  const [currentVideoTime, setCurrentVideoTime] = useState(0)

  const zoom = ZOOM_LEVELS[zoomIndex]

  useEffect(() => {
    setZoomIndex(3)
    setFitMode("zoom")
    setNumPages(0)
    setPdfLoading(true)
    setPdfError(null)
    setImageNaturalSize({ width: 0, height: 0 })
    setPdfPageSize({ width: 0, height: 0 })
    setVideoPlaying(false)
    setVideoLoaded(false)
    setVideoError(false)
    setVideoStarted(false)
    setCurrentVideoTime(0)
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

  useEffect(() => {
    const video = videoRef.current
    if (!video || fileType !== "video") return

    const handleTimeUpdate = () => {
      setCurrentVideoTime(video.currentTime)
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    return () => video.removeEventListener("timeupdate", handleTimeUpdate)
  }, [fileType, videoRef])

  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, pageNumber?: number) => {
      // Add pageNumber parameter
      if (!markupMode || !onMarkupClick) return

      if (fileType === "video" && videoPlaying && videoRef?.current) {
        videoRef.current.pause()
        setVideoPlaying(false)
        if (onVideoPauseForMarkup) {
          onVideoPauseForMarkup()
        }
      }

      const rect = e.currentTarget.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100

      if (fileType === "video") {
        onMarkupClick(x, y, currentVideoTime)
      } else if (fileType === "pdf" && pageNumber !== undefined) {
        onMarkupClick(x, y, undefined, pageNumber)
      } else {
        onMarkupClick(x, y)
      }
    },
    [markupMode, onMarkupClick, fileType, videoPlaying, currentVideoTime, videoRef, onVideoPauseForMarkup],
  )

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
      if (fileType === "video" || markupMode) return
      e.preventDefault()
      if (fitMode === "zoom") {
        setFitMode("width")
      } else {
        setFitMode("zoom")
        setZoomIndex(5)
      }
    },
    [fitMode, fileType, markupMode],
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (fileType === "video" || markupMode) return
      const now = Date.now()
      if (now - lastTap < 300) {
        e.preventDefault()
        if (fitMode === "zoom") {
          setFitMode("width")
        } else {
          setFitMode("zoom")
          setZoomIndex(5)
        }
      }
      setLastTap(now)
    },
    [lastTap, fitMode, fileType, markupMode],
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
    setZoomIndex(3)
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

  const handlePlayVideo = () => {
    if (videoRef.current) {
      videoRef.current.play()
      setVideoPlaying(true)
      setVideoStarted(true)
    }
  }

  const effectiveZoom = calculateEffectiveZoom()
  const effectiveIndex = findClosestZoomIndex(effectiveZoom)
  const canZoomOut = effectiveIndex > 0 || effectiveZoom > ZOOM_LEVELS[0]
  const canZoomIn = effectiveIndex < ZOOM_LEVELS.length - 1 || effectiveZoom < ZOOM_LEVELS[ZOOM_LEVELS.length - 1]

  const getMarkupScale = useCallback(() => {
    if (fileType === "video") return 1
    const effectiveZoom = calculateEffectiveZoom()
    // Scale markups proportionally with zoom (base at 100%)
    return effectiveZoom / 100
  }, [calculateEffectiveZoom, fileType])

  const renderMarkupPins = (pageNumber?: number) => {
    const visibleMarkups = feedbackWithMarkups
      .filter((fb) => {
        if (fb.markup_x == null || fb.markup_y == null) return false
        if (fileType === "video" && fb.markup_timestamp != null) {
          const timeDiff = Math.abs(currentVideoTime - fb.markup_timestamp)
          return timeDiff <= 3
        }
        if (fileType === "pdf" && pageNumber !== undefined) {
          return fb.markup_page === pageNumber
        }
        return true
      })
      .map((fb, idx) => ({
        id: fb.id,
        x: fb.markup_x!,
        y: fb.markup_y!,
        timestamp: fb.markup_timestamp,
        page: fb.markup_page,
        index: feedbackWithMarkups.filter((f) => f.markup_x != null).indexOf(fb) + 1,
        isPending: false,
      }))

    const shouldShowPendingMarkup = pendingMarkup && (pageNumber === undefined || pendingMarkup.page === pageNumber)

    const allMarkups = [
      ...visibleMarkups,
      ...(shouldShowPendingMarkup
        ? [
            {
              id: "pending",
              x: pendingMarkup.x,
              y: pendingMarkup.y,
              timestamp: pendingMarkup.timestamp,
              page: pendingMarkup.page,
              index: feedbackWithMarkups.filter((fb) => fb.markup_x != null).length + 1,
              isPending: true,
            },
          ]
        : []),
    ]

    if (allMarkups.length === 0) return null

    const pinSize = 24

    return (
      <div className="absolute inset-0 pointer-events-none">
        {allMarkups.map((markup) => (
          <div
            key={markup.id}
            className={`absolute z-20 transform -translate-x-1/2 -translate-y-1/2 transition-all pointer-events-auto ${
              markup.isPending
                ? "scale-110"
                : highlightedFeedbackId === markup.id
                  ? "scale-125 z-30"
                  : "hover:scale-110"
            }`}
            style={{
              left: `${markup.x}%`,
              top: `${markup.y}%`,
            }}
            onMouseEnter={() => !markup.isPending && onMarkupHover?.(markup.id)}
            onMouseLeave={() => !markup.isPending && onMarkupHover?.(null)}
          >
            <div
              className={`rounded-full flex items-center justify-center font-bold shadow-lg cursor-pointer ${
                markup.isPending
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                  : highlightedFeedbackId === markup.id
                    ? "bg-primary text-primary-foreground ring-2 ring-primary"
                    : "bg-amber-500 text-white hover:bg-amber-600"
              }`}
              style={{
                width: `${pinSize}px`,
                height: `${pinSize}px`,
                fontSize: `${Math.max(10, pinSize * 0.5)}px`,
              }}
            >
              {markup.index}
            </div>
            {markup.isPending && onClearMarkup && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClearMarkup()
                }}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (fileType === "video") {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-black/5 dark:bg-white/5 p-6">
        <div
          ref={contentRef}
          className={`relative max-w-full max-h-full ${markupMode && !videoPlaying ? "cursor-crosshair" : ""}`}
          onClick={handleContentClick}
        >
          {!videoLoaded && !videoError && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg min-w-[300px] min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {videoError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-destructive" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">Failed to load video</p>
              </div>
            </div>
          )}
          <video
            ref={videoRef}
            src={effectiveUrl}
            controls={videoStarted}
            className="max-w-full max-h-[calc(100vh-200px)] rounded-lg shadow-2xl"
            playsInline
            preload="auto"
            onLoadedData={() => setVideoLoaded(true)}
            onError={() => setVideoError(true)}
            onPlay={() => setVideoPlaying(true)}
            onPause={() => setVideoPlaying(false)}
            onEnded={() => setVideoPlaying(false)}
          />
          {videoLoaded && !videoStarted && (
            <button
              onClick={handlePlayVideo}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer rounded-lg"
            >
              <div className="h-20 w-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="h-10 w-10 text-foreground ml-1" fill="currentColor" />
              </div>
            </button>
          )}
          {videoLoaded && renderMarkupPins()}
        </div>
      </div>
    )
  }

  // PDF viewer
  if (fileType === "pdf") {
    let pdfWidth: number | undefined
    if (fitMode === "width" && containerSize.width > 0) {
      pdfWidth = containerSize.width - 48
    } else if (fitMode === "height" && pdfPageSize.width > 0 && pdfPageSize.height > 0) {
      const availableHeight = containerSize.height - 96
      pdfWidth = availableHeight * (pdfPageSize.width / pdfPageSize.height)
    } else {
      const baseWidth = containerSize.width * 0.8
      pdfWidth = baseWidth * (zoom / 100)
    }
    const isContentWider = pdfWidth && pdfWidth > containerSize.width - 48

    return (
      <div className="w-full h-full flex flex-col relative">
        <div
          ref={containerRef}
          className={`flex-1 overflow-auto relative bg-muted/30 ${markupMode ? "cursor-crosshair" : ""}`}
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
            ref={contentRef}
            className={`flex flex-col py-6 ${isContentWider ? "items-start px-6" : "items-center"}`}
            style={isContentWider ? { minWidth: (pdfWidth || 0) + 48 } : undefined}
          >
            <Document
              file={effectiveUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
            >
              {Array.from(new Array(numPages), (_, index) => (
                <div
                  key={`page_${index + 1}`}
                  className={`relative mb-10 ${markupMode ? "cursor-crosshair" : ""}`}
                  onClick={(e) => handleContentClick(e, index + 1)} // Pass page number for PDF markups
                >
                  <div className="shadow-lg rounded-lg overflow-hidden bg-white">
                    <Page
                      pageNumber={index + 1}
                      width={pdfWidth && pdfWidth > 0 ? pdfWidth : undefined}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      onLoadSuccess={index === 0 ? onPdfPageLoadSuccess : undefined}
                    />
                  </div>
                  {renderMarkupPins(index + 1)} {/* Render markups for each page */}
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
        className={`flex-1 overflow-auto relative bg-black/5 dark:bg-white/5 ${markupMode ? "cursor-crosshair" : ""}`}
        onDoubleClick={handleDoubleClick}
        onTouchEnd={handleTouchEnd}
      >
        {fitMode === "width" ? (
          <div className="p-6" ref={contentRef}>
            <div className="relative mx-auto" style={{ width: containerSize.width - 48 }} onClick={handleContentClick}>
              <img
                ref={imageRef}
                src={effectiveUrl || "/placeholder.svg"}
                alt={fileName}
                draggable={false}
                onLoad={onImageLoad}
                className="select-none rounded-lg shadow-2xl block w-full h-auto"
              />
              {renderMarkupPins()}
            </div>
          </div>
        ) : fitMode === "height" ? (
          <div className="h-full p-6 overflow-x-auto flex items-center justify-center" ref={contentRef}>
            <div
              className="relative flex-shrink-0"
              style={{ height: containerSize.height - 48 }}
              onClick={handleContentClick}
            >
              <img
                ref={imageRef}
                src={effectiveUrl || "/placeholder.svg"}
                alt={fileName}
                draggable={false}
                onLoad={onImageLoad}
                className="select-none rounded-lg shadow-2xl h-full w-auto"
              />
              {renderMarkupPins()}
            </div>
          </div>
        ) : (
          <div className="p-6" style={{ minWidth: zoomedWidth + 48, minHeight: "100%" }} ref={contentRef}>
            <div
              className="relative mx-auto"
              style={{ width: zoomedWidth > 0 ? zoomedWidth : "80%" }}
              onClick={handleContentClick}
            >
              <img
                ref={imageRef}
                src={effectiveUrl || "/placeholder.svg"}
                alt={fileName}
                draggable={false}
                onLoad={onImageLoad}
                className="select-none rounded-lg shadow-2xl block w-full"
              />
              {renderMarkupPins()}
            </div>
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
