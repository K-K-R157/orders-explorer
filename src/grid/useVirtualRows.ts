import { useEffect, useState, type RefObject } from 'react';

// Works out which rows are inside the scroll viewport, so only those are rendered.
// The body is given the full height (rowCount * rowHeight) so the scrollbar is correct.
export function useVirtualRows(
  containerRef: RefObject<HTMLElement | null>,
  rowCount: number,
  rowHeight: number,
  overscan = 8, // extra rows above/below to avoid blank flashes while scrolling fast
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => setScrollTop(el.scrollTop);
    const observer = new ResizeObserver(() => setViewportHeight(el.clientHeight));

    el.addEventListener('scroll', onScroll, { passive: true });
    observer.observe(el); // also fires once immediately with the initial size
    return () => {
      el.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, [containerRef]);

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(rowCount, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);

  return { start, end, totalHeight: rowCount * rowHeight };
}
