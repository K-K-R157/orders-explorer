import { useRef, type PointerEvent } from 'react';

type ResizeHandleProps = {
  label: string;
  width: number;
  onResize: (width: number) => void;
  onReset: () => void;
};

// Thin drag area on the right edge of a header cell.
// Pointer capture keeps the drag going even when the mouse leaves the handle.
export function ResizeHandle({ label, width, onResize, onReset }: ResizeHandleProps) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  const resizeTo = (clientX: number) => {
    if (drag.current) onResize(drag.current.startWidth + clientX - drag.current.startX);
  };

  // Apply the final position on release too: the browser may merge fast moves,
  // so the last pointermove isn't guaranteed to arrive.
  const stopDrag = (e: PointerEvent) => {
    resizeTo(e.clientX);
    drag.current = null;
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label} column`}
      title="Drag to resize, double-click to reset"
      className="absolute top-0 right-0 z-10 h-full w-1.5 cursor-col-resize touch-none hover:bg-blue-400/50 active:bg-blue-500"
      onPointerDown={(e) => {
        e.preventDefault(); // don't start a text selection
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { startX: e.clientX, startWidth: width };
      }}
      onPointerMove={(e) => resizeTo(e.clientX)}
      onPointerUp={stopDrag}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onDoubleClick={onReset}
    />
  );
}
