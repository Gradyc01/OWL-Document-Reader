import React, { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist/types/src/display/api";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PDFViewerProps {
  fileUrl: string;
  documentName?: string; // Optional prop for custom download filename
  renderOverlay?: (
    pageNumber: number,
    dims: { width: number; height: number }
  ) => React.ReactNode;
  hoveredPageNumber?: number;
  hoveredFieldBoundingBox?: {
    pageNumber: number;
    bbox: { Left: number; Top: number; Width: number; Height: number };
  };
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  fileUrl, 
  documentName,
  renderOverlay, 
  hoveredPageNumber, 
  hoveredFieldBoundingBox 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [scale, setScale] = useState<number>(1.0);
  const [baselineScale, setBaselineScale] = useState<number>(1.0);

  const [pageDims, setPageDims] = useState<{ [key: number]: { width: number; height: number } }>({});

  const [hoverStates, setHoverStates] = useState({
    prevButton: false,
    nextButton: false,
    zoomInButton: false,
    zoomOutButton: false,
    resetZoomButton: false,
    downloadButton: false
  });

  const [toolbarWidth, setToolbarWidth] = useState<number>(0);
  const BREAKPOINTS = {
    HIDE_RESET_ZOOM: 400,
    HIDE_NAVIGATION: 300,
    STACK_LAYOUT: 250
  };

  const onDocumentLoadSuccess = async (pdf: PDFDocumentProxy) => {
    setNumPages(pdf.numPages);
    const firstPage = await pdf.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1 });
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const fitScale = Math.min(clientWidth / viewport.width, clientHeight / viewport.height);
      const newBaseline = fitScale * 0.9; // 90% looks better as default
      setBaselineScale(newBaseline);
      setScale(newBaseline);
      containerRef.current.scrollLeft = 0;
      containerRef.current.scrollTop = 0;
    }
  };

  const onPageRenderSuccess = (_page: PDFPageProxy, pageNumber: number) => {
    const pageContainer = pageRefs.current[pageNumber - 1];
    if (pageContainer) {
      setPageDims(prev => ({
        ...prev,
        [pageNumber]: {
          width: pageContainer.clientWidth,
          height: pageContainer.clientHeight,
        }
      }));
    }
  };

  const isManualNavigationRef = useRef<boolean>(false);

  const handleNextPage = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const next = Math.min(currentPage + 1, numPages);
    setCurrentPage(next);
    
    isManualNavigationRef.current = true;
    
    if (containerRef.current && pageRefs.current[next - 1]) {
      const targetPage = pageRefs.current[next - 1];
      if (targetPage) {
        containerRef.current.scrollTo({
          top: targetPage.offsetTop - containerRef.current.offsetTop,
          behavior: "smooth"
        });
        
        setTimeout(() => {
          isManualNavigationRef.current = false;
        }, 500);
      }
    }
  };
  
  const handlePrevPage = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const prev = Math.max(currentPage - 1, 1);
    setCurrentPage(prev);
    
    isManualNavigationRef.current = true;
    
    if (containerRef.current && pageRefs.current[prev - 1]) {
      const targetPage = pageRefs.current[prev - 1];
      if (targetPage) {
        containerRef.current.scrollTo({
          top: targetPage.offsetTop - containerRef.current.offsetTop,
          behavior: "smooth"
        });
        
        setTimeout(() => {
          isManualNavigationRef.current = false;
        }, 500);
      }
    }
  };

  const determineVisiblePage = () => {
    if (!containerRef.current || pageRefs.current.length === 0) return currentPage;
    
    const container = containerRef.current;
    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;
    const containerCenter = containerTop + (container.clientHeight / 2);
    
    for (let i = 0; i < pageRefs.current.length; i++) {
      const page = pageRefs.current[i];
      if (!page) continue;
      
      const pageTop = page.offsetTop;
      const pageBottom = pageTop + page.clientHeight;
      
      if (containerCenter >= pageTop && containerCenter <= pageBottom) {
        return i + 1;
      }
    }
    
    let maxVisibleArea = 0;
    let mostVisiblePage = currentPage;
    
    for (let i = 0; i < pageRefs.current.length; i++) {
      const page = pageRefs.current[i];
      if (!page) continue;
      
      const pageTop = page.offsetTop;
      const pageBottom = pageTop + page.clientHeight;
      
      const visibleTop = Math.max(containerTop, pageTop);
      const visibleBottom = Math.min(containerBottom, pageBottom);
      
      if (visibleBottom > visibleTop) {
        const visibleArea = visibleBottom - visibleTop;
        if (visibleArea > maxVisibleArea) {
          maxVisibleArea = visibleArea;
          mostVisiblePage = i + 1;
        }
      }
    }
    
    return mostVisiblePage;
  };

  const handleScroll = () => {
    if (isManualNavigationRef.current) return;
    
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = window.setTimeout(() => {
      const visiblePage = determineVisiblePage();
      if (visiblePage !== currentPage) {
        setCurrentPage(visiblePage);
      }
    }, 100);
  };
  
  const scrollTimeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [currentPage]);

  // Download functionality
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = fileUrl;
    // Use the documentName prop if provided, otherwise extract from the URL or use a default
    const filename = documentName 
      ? documentName.endsWith('.pdf') ? documentName : `${documentName}.pdf`
      : fileUrl.split('/').pop() || "document.pdf";
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle page changes
  useEffect(() => {
    if (containerRef.current && pageRefs.current[currentPage - 1]) {
      const targetPage = pageRefs.current[currentPage - 1];
      if (targetPage) {
        containerRef.current.scrollTo({
          top: targetPage.offsetTop - containerRef.current.offsetTop,
          behavior: "smooth"
        });
      }
    }
  }, [currentPage]);

  // Handle hoveredPageNumber changes
  useEffect(() => {
    if (hoveredPageNumber && hoveredPageNumber !== currentPage) {
      setCurrentPage(hoveredPageNumber);
      isManualNavigationRef.current = true;
      
      setTimeout(() => {
        isManualNavigationRef.current = false;
      }, 500);
    }
  }, [hoveredPageNumber, currentPage]);

  // Handle field bounding box hover
  useEffect(() => {
    if (
      hoveredFieldBoundingBox &&
      containerRef.current &&
      pageDims[hoveredFieldBoundingBox.pageNumber]
    ) {
      const pageIndex = hoveredFieldBoundingBox.pageNumber - 1;
      const pageContainer = pageRefs.current[pageIndex];
      if (!pageContainer) return;
  
      if (currentPage !== hoveredFieldBoundingBox.pageNumber) {
        setCurrentPage(hoveredFieldBoundingBox.pageNumber);
        isManualNavigationRef.current = true;
        
        setTimeout(() => {
          isManualNavigationRef.current = false;
        }, 500);
      }
      
      const dimsForPage = pageDims[hoveredFieldBoundingBox.pageNumber];
      const { Left, Top, Width, Height } = hoveredFieldBoundingBox.bbox;
      
      const bboxLeft = pageContainer.offsetLeft + Left * dimsForPage.width;
      const bboxTop = pageContainer.offsetTop + Top * dimsForPage.height;
      const bboxCenterX = bboxLeft + (Width * dimsForPage.width) / 2;
      const bboxCenterY = bboxTop + (Height * dimsForPage.height) / 2;
      
      const container = containerRef.current;
      const newScrollLeft = bboxCenterX - container.clientWidth / 2;
      const newScrollTop = bboxCenterY - container.clientHeight / 2;
      
      const { maxScrollLeft, maxScrollTop } = getMaxScrollValues();
      
      container.scrollTo({
        left: clamp(newScrollLeft, 0, maxScrollLeft),
        top: clamp(newScrollTop, 0, maxScrollTop),
        behavior: "smooth",
      });
    }
  }, [hoveredFieldBoundingBox, pageDims, scale, currentPage]);

  useEffect(() => {
    if (!toolbarRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setToolbarWidth(entry.contentRect.width);
      }
    });
    
    resizeObserver.observe(toolbarRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

  const getZoomStep = () => baselineScale * 0.1;

  const getMaxScrollValues = () => {
    if (!containerRef.current || !contentRef.current) return { maxScrollLeft: 0, maxScrollTop: 0 };
    
    const container = containerRef.current;
    const content = contentRef.current;
    
    const maxScrollLeft = Math.max(0, content.scrollWidth - container.clientWidth);
    const maxScrollTop = Math.max(0, content.scrollHeight - container.clientHeight);
    
    return { maxScrollLeft, maxScrollTop };
  };

  const handleZoomIn = () => {
    if (containerRef.current && contentRef.current) {
      const step = getZoomStep();
      const oldScale = scale;
      const newScale = scale + step;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const newScrollLeft = (container.scrollLeft + centerX) * (newScale / oldScale) - centerX;
      const newScrollTop = (container.scrollTop + centerY) * (newScale / oldScale) - centerY;
      
      setScale(newScale);
      
      setTimeout(() => {
        const { maxScrollLeft, maxScrollTop } = getMaxScrollValues();
        container.scrollLeft = clamp(newScrollLeft, 0, maxScrollLeft);
        container.scrollTop = clamp(newScrollTop, 0, maxScrollTop);
      }, 100);
    } else {
      setScale(scale + getZoomStep());
    }
  };

  const handleZoomOut = () => {
    if (containerRef.current && contentRef.current) {
      const step = getZoomStep();
      const oldScale = scale;
      const newScale = Math.max(baselineScale * 0.1, scale - step);
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const newScrollLeft = (container.scrollLeft + centerX) * (newScale / oldScale) - centerX;
      const newScrollTop = (container.scrollTop + centerY) * (newScale / oldScale) - centerY;
      
      setScale(newScale);
      
      setTimeout(() => {
        const { maxScrollLeft, maxScrollTop } = getMaxScrollValues();
        container.scrollLeft = clamp(newScrollLeft, 0, maxScrollLeft);
        container.scrollTop = clamp(newScrollTop, 0, maxScrollTop);
      }, 0);
    } else {
      setScale(Math.max(baselineScale * 0.1, scale - getZoomStep()));
    }
  };

  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey && containerRef.current && contentRef.current) {
      e.preventDefault();
      const step = getZoomStep();
      const oldScale = scale;
      const delta = e.deltaY < 0 ? step : -step;
      const newScale = Math.max(baselineScale * 0.1, scale + delta);
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      const mouseX = e.clientX - rect.left + container.scrollLeft;
      const mouseY = e.clientY - rect.top + container.scrollTop;
      
      const newScrollLeft = (container.scrollLeft + mouseX) * (newScale / oldScale) - mouseX;
      const newScrollTop = (container.scrollTop + mouseY) * (newScale / oldScale) - mouseY;
      
      setScale(newScale);
      
      setTimeout(() => {
        const { maxScrollLeft, maxScrollTop } = getMaxScrollValues();
        container.scrollLeft = clamp(newScrollLeft, 0, maxScrollLeft);
        container.scrollTop = clamp(newScrollTop, 0, maxScrollTop);
      }, 0);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
      }
    };
  }, [scale, baselineScale]);

  const getButtonStyle = (isHovered: boolean, isDisabled: boolean = false) => ({
    background: isHovered && !isDisabled ? "#505054" : "transparent",
    border: "none",
    color: "white",
    padding: "4px 8px",
    margin: "0 2px",
    borderRadius: "2px",
    cursor: isDisabled ? "default" : "pointer",
    opacity: isDisabled ? "0.5" : "1",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s ease"
  });

  const showResetZoom = toolbarWidth > BREAKPOINTS.HIDE_RESET_ZOOM;
  const showNavigation = toolbarWidth > BREAKPOINTS.HIDE_NAVIGATION;
  const useStackedLayout = toolbarWidth <= BREAKPOINTS.STACK_LAYOUT;

  return (
    <div style={{ width: "100%", height: "80vh" }}>
      {/* Toolbar */}
      <div 
        ref={toolbarRef}
        style={{ 
          display: "flex", 
          alignItems: "center", 
          height: useStackedLayout ? "auto" : "40px", 
          padding: "0 8px",
          backgroundColor: "#38383d", 
          color: "white",
          marginBottom: "0",
          justifyContent: useStackedLayout ? "center" : "flex-start",
          flexDirection: useStackedLayout ? "column" : "row",
          flexWrap: "wrap"
        }}
      >
        {/* Left section - Page Navigation */}
        {showNavigation && (
          <div style={{ 
            display: "flex", 
            alignItems: "center",
            padding: useStackedLayout ? "4px 0" : "0"
          }}>
            {/* Previous Page Button */}
            <button 
              onClick={(e) => handlePrevPage(e)} 
              disabled={currentPage <= 1}
              onMouseEnter={() => setHoverStates(prev => ({ ...prev, prevButton: true }))}
              onMouseLeave={() => setHoverStates(prev => ({ ...prev, prevButton: false }))}
              style={getButtonStyle(hoverStates.prevButton, currentPage <= 1)}
              title="Previous Page"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {/* Page Display */}
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              margin: "0 8px",
              fontSize: "14px"
            }}>
              <div style={{ 
                backgroundColor: "#5a5a5e", 
                padding: "2px 8px", 
                borderRadius: "2px",
                minWidth: "24px",
                textAlign: "center"
              }}>
                {currentPage}
              </div>
              <span style={{ margin: "0 4px" }}>of {numPages}</span>
            </div>
            
            {/* Next Page Button */}
            <button 
              onClick={(e) => handleNextPage(e)}
              disabled={currentPage >= numPages}
              onMouseEnter={() => setHoverStates(prev => ({ ...prev, nextButton: true }))}
              onMouseLeave={() => setHoverStates(prev => ({ ...prev, nextButton: false }))}
              style={getButtonStyle(hoverStates.nextButton, currentPage >= numPages)}
              title="Next Page"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
                <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
        
        {/* Center section - Zoom Controls */}
        <div style={{ 
          display: "flex", 
          alignItems: "center",
          position: useStackedLayout ? "relative" : "absolute",
          left: useStackedLayout ? "auto" : "50%",
          transform: useStackedLayout ? "none" : "translateX(-50%)",
          padding: useStackedLayout ? "4px 0" : "0",
          zIndex: 1
        }}>
          {/* Zoom Out Button */}
          <button 
            onClick={handleZoomOut}
            onMouseEnter={() => setHoverStates(prev => ({ ...prev, zoomOutButton: true }))}
            onMouseLeave={() => setHoverStates(prev => ({ ...prev, zoomOutButton: false }))}
            style={getButtonStyle(hoverStates.zoomOutButton)}
            title="Zoom Out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* Zoom Percentage (conditionally shown) */}
          {showResetZoom && (
            <div 
              onMouseEnter={() => setHoverStates(prev => ({ ...prev, resetZoomButton: true }))}
              onMouseLeave={() => setHoverStates(prev => ({ ...prev, resetZoomButton: false }))}
              style={{ 
                margin: "0 4px", 
                fontSize: "14px", 
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: "2px",
                backgroundColor: hoverStates.resetZoomButton ? "#505054" : "transparent",
                transition: "background-color 0.2s ease"
              }}
              onClick={() => {
                if (containerRef.current) {
                  containerRef.current.scrollLeft = 0;
                  containerRef.current.scrollTop = 0;
                }
                setScale(baselineScale);
              }}
              title="Reset Zoom"
            >
              {baselineScale ? Math.round((scale / baselineScale) * 100) : 100}%
            </div>
          )}
          
          {/* Zoom In Button */}
          <button 
            onClick={handleZoomIn}
            onMouseEnter={() => setHoverStates(prev => ({ ...prev, zoomInButton: true }))}
            onMouseLeave={() => setHoverStates(prev => ({ ...prev, zoomInButton: false }))}
            style={getButtonStyle(hoverStates.zoomInButton)}
            title="Zoom In"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        {/* Right section - Download Button */}
        <div style={{ 
          display: "flex", 
          alignItems: "center",
          padding: useStackedLayout ? "4px 0" : "0",
          marginLeft: useStackedLayout ? "0" : "auto"
        }}>
          <button 
            onClick={handleDownload}
            onMouseEnter={() => setHoverStates(prev => ({ ...prev, downloadButton: true }))}
            onMouseLeave={() => setHoverStates(prev => ({ ...prev, downloadButton: false }))}
            style={getButtonStyle(hoverStates.downloadButton)}
            title="Download"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
              <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full h-[calc(100%-40px)] bg-gray-50 overflow-auto relative"
        style={{ 
          backgroundColor: "#2a2a2e",
          height: `calc(100% - ${useStackedLayout ? 'auto' : '40px'})` 
        }}
      >
        <div 
          ref={contentRef}
          className="min-w-fit"
          style={{ 
            margin: "0 auto", 
            width: "fit-content"
          }}
        >
          <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
            {Array.from({ length: numPages }, (_, index) => (
              <div
                key={index}
                ref={(el) => { pageRefs.current[index] = el; }}
                style={{ margin: "1rem 0", position: "relative" }}
              >
                <Page
                  pageNumber={index + 1}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onRenderSuccess={(page) => onPageRenderSuccess(page, index + 1)}
                />
                {renderOverlay && pageDims && pageDims[index + 1] && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none",
                    }}
                  >
                    {renderOverlay(index + 1, pageDims[index + 1])}
                  </div>
                )}
              </div>
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
