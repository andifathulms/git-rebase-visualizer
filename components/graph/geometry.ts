/**
 * Pixels. The topology comes from lib/layout; this file only turns lanes and
 * rows into coordinates, so the layout stays testable without a DOM.
 */
/*
 * The box is two lines tall: the accession number, and the subject of the
 * commit under it. Reading a history meant hovering or guessing when only the
 * hash was on the box, and the subject is what tells a beginner which commit
 * they are looking at.
 */
export const ROW_HEIGHT = 76
export const LANE_WIDTH = 70
export const BOX_WIDTH = 132
export const BOX_HEIGHT = 48
export const MARGIN_X = 20
export const MARGIN_Y = 20
/** Gap between the widest lane and the column of catalogue cards. */
export const CARD_GUTTER = 64
export const CARD_WIDTH = 176
/** Characters of the subject that fit inside a box at 11px. */
export const SUBJECT_CHARS = 20

export function boxLeft(lane: number): number {
  return MARGIN_X + lane * LANE_WIDTH
}

export function boxTop(row: number): number {
  return MARGIN_Y + row * ROW_HEIGHT
}

export function centerX(lane: number): number {
  return boxLeft(lane) + BOX_WIDTH / 2
}

export function centerY(row: number): number {
  return boxTop(row) + BOX_HEIGHT / 2
}

export function cardLeft(lanes: number): number {
  return MARGIN_X + (lanes - 1) * LANE_WIDTH + BOX_WIDTH + CARD_GUTTER
}

export function canvasWidth(lanes: number): number {
  return cardLeft(lanes) + CARD_WIDTH + MARGIN_X
}

export function canvasHeight(rows: number): number {
  return MARGIN_Y * 2 + Math.max(rows, 1) * ROW_HEIGHT
}

/**
 * A parent edge. Same lane draws straight; a different lane takes a shallow S,
 * which is what makes a merge legible at a glance.
 */
export function edgePath(
  fromLane: number,
  fromRow: number,
  toLane: number,
  toRow: number,
): string {
  const x1 = centerX(fromLane)
  const y1 = boxTop(fromRow) + BOX_HEIGHT
  const x2 = centerX(toLane)
  const y2 = boxTop(toRow)

  if (fromLane === toLane) return `M ${x1} ${y1} L ${x2} ${y2}`

  const midpoint = y1 + (y2 - y1) / 2
  return `M ${x1} ${y1} C ${x1} ${midpoint}, ${x2} ${midpoint}, ${x2} ${y2}`
}
