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

export function FilledSquare(x: number, y: number, size: number, index: number): PixelPosition[] {
  let pixels: PixelPosition[] = []
  
  let center = Math.floor(size / 2)
  
  for (let dx = 0; dx < size; dx++) {
    for (let dy = 0; dy < size; dy++) {
      pixels.push({x: x + dx - center, y: y + dy - center, index})
    }
  }

  return pixels
}