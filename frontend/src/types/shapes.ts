export interface PixelPosition {
  x: number
  y: number
  index: number
}

export function FilledCircle(x: number, y: number, radius: number, index: number): PixelPosition[] {
  let pixels: PixelPosition[] = []

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if (dx * dx + dy * dy <= radius * radius) {
        pixels.push({x: x + dx, y: y + dy, index})
      }
    }
  }

  return pixels
}