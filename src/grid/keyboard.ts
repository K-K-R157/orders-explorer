// Where the focused cell moves for each navigation key. Pure, so it's easy to test.

export type CellPos = { row: number; col: number };

type Bounds = {
  rowCount: number;
  colCount: number;
  pageSize: number; // rows that fit on screen, for PageUp/PageDown
  jump: boolean; // Ctrl/Cmd held: jump to the edge
};

export function moveFocus(pos: CellPos, key: string, bounds: Bounds): CellPos | null {
  const { rowCount, colCount, pageSize, jump } = bounds;
  const row = (r: number) => Math.max(0, Math.min(rowCount - 1, r));
  const col = (c: number) => Math.max(0, Math.min(colCount - 1, c));

  switch (key) {
    case 'ArrowUp':
      return { row: row(jump ? 0 : pos.row - 1), col: pos.col };
    case 'ArrowDown':
      return { row: row(jump ? rowCount - 1 : pos.row + 1), col: pos.col };
    case 'ArrowLeft':
      return { row: pos.row, col: col(jump ? 0 : pos.col - 1) };
    case 'ArrowRight':
      return { row: pos.row, col: col(jump ? colCount - 1 : pos.col + 1) };
    case 'PageUp':
      return { row: row(pos.row - pageSize), col: pos.col };
    case 'PageDown':
      return { row: row(pos.row + pageSize), col: pos.col };
    case 'Home':
      return { row: jump ? 0 : pos.row, col: 0 };
    case 'End':
      return { row: jump ? rowCount - 1 : pos.row, col: colCount - 1 };
    default:
      return null;
  }
}
