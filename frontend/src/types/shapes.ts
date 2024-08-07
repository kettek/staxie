// PixelPosition represents a coordinate and index.
export interface PixelPosition {
  x: number
  y: number
  index: number
}

export function NormalizeShape(shape: PixelPosition[], transform?: { x: number; y: number }): { shape: PixelPosition[]; minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let transformX = transform ? transform.x : 0
  let transformY = transform ? transform.y : 0

  for (let pixel of shape) {
    if (pixel.x < minX) minX = pixel.x
    if (pixel.y < minY) minY = pixel.y
    if (pixel.x > maxX) maxX = pixel.x
    if (pixel.y > maxY) maxY = pixel.y
  }

  return {
    shape: shape.map((pixel) => ({ x: pixel.x - minX + transformX, y: pixel.y - minY + transformY, index: pixel.index })),
    minX: minX + transformX,
    minY: minY + transformY,
    maxX: maxX + transformX,
    maxY: maxY + transformY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

// FilledCircle returns an array of PixelPositions that correspond to a filled circle.
export function FilledCircle(x: number, y: number, radius: number, index: number): PixelPosition[] {
  let pixels: PixelPosition[] = []

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if (dx * dx + dy * dy <= radius * radius) {
        pixels.push({ x: x + dx, y: y + dy, index })
      }
    }
  }

  return pixels
}

// FilledSquare returns an array of PixelPositions that correspond to a filled square.
export function FilledSquare(x: number, y: number, size: number, index: number): PixelPosition[] {
  let pixels: PixelPosition[] = []

  let center = Math.floor(size / 2)

  for (let dx = 0; dx < size; dx++) {
    for (let dy = 0; dy < size; dy++) {
      pixels.push({ x: x + dx - center, y: y + dy - center, index })
    }
  }

  return pixels
}

export function RectangleShape(x1: number, y1: number, x2: number, y2: number, fill: boolean, index: number): PixelPosition[] {
  let pixels: PixelPosition[] = []

  let xmin = Math.min(x1, x2)
  let xmax = Math.max(x1, x2)
  let ymin = Math.min(y1, y2)
  let ymax = Math.max(y1, y2)

  for (let x = xmin; x <= xmax; x++) {
    for (let y = ymin; y <= ymax; y++) {
      if (!fill && x > xmin && x < xmax && y > ymin && y < ymax) {
        continue
      }
      pixels.push({ x, y, index })
    }
  }

  return pixels
}

export function EllipseShape(x1: number, y1: number, x2: number, y2: number, fill: boolean, index: number): PixelPosition[] {
  let pixels: PixelPosition[] = []

  let xmin = Math.min(x1, x2)
  let xmax = Math.max(x1, x2)
  let ymin = Math.min(y1, y2)
  let ymax = Math.max(y1, y2)

  let xcenter = (xmin + xmax) / 2
  let ycenter = (ymin + ymax) / 2
  let xr = (xmax - xmin) / 2
  let yr = (ymax - ymin) / 2

  for (let x = xmin; x <= xmax; x++) {
    for (let y = ymin; y <= ymax; y++) {
      if (((x - xcenter) / xr) ** 2 + ((y - ycenter) / yr) ** 2 <= 1) {
        pixels.push({ x, y, index })
      }
    }
  }

  // FIXME: Let's blame this method of getting the edges of a filled ellipse to make an outlined ellipse a sympton of having the 'rona.
  if (!fill) {
    let outlinePixels: PixelPosition[] = []
    for (let pixel of pixels) {
      let adjacentCount = 0
      for (let pixel2 of pixels) {
        if (pixel2.x === pixel.x && pixel2.y === pixel.y) continue
        if (Math.abs(pixel2.x - pixel.x) <= 1 && Math.abs(pixel2.y - pixel.y) <= 1) {
          adjacentCount++
        }
      }
      if (adjacentCount < 8) {
        outlinePixels.push(pixel)
      }
    }
    pixels = outlinePixels
  }

  return pixels
}

// RandomSpray returns an array of PixelPositions that correspond to a random spray of pixels.
export function RandomSpray(x: number, y: number, radius: number, density: number, index: number): PixelPosition[] {
  let pixels: PixelPosition[] = []

  for (let i = 0; i < density; i++) {
    // Get dx/dy in a circle.
    let r = Math.sqrt(Math.random()) * radius
    let theta = Math.random() * 2 * Math.PI
    let dx = Math.floor(r * Math.cos(theta))
    let dy = Math.floor(r * Math.sin(theta))

    // Get dx/dy in a square.
    //let dx = Math.floor(Math.random() * radius * 2) - radius
    //let dy = Math.floor(Math.random() * radius * 2) - radius

    pixels.push({ x: x + dx, y: y + dy, index })
  }

  return pixels
}

export function ShapeToImageData(shape: PixelPosition[], ctx: CanvasRenderingContext2D, color: [number, number, number, number]): ImageData {
  let width = 0
  let height = 0
  for (let pixel of shape) {
    if (pixel.x > width) width = pixel.x
    if (pixel.y > height) height = pixel.y
  }
  // This feels wrong. If this isn't added, then normalized rectangular shapes get shrunken by 1... FIXME: should probably double check normalization.
  width += 1
  height += 1

  let imageData = ctx.createImageData(width, height)

  for (let pixel of shape) {
    const i = (pixel.y * width + pixel.x) * 4
    imageData.data[i + 0] = color[0]
    imageData.data[i + 1] = color[1]
    imageData.data[i + 2] = color[2]
    imageData.data[i + 3] = color[3]
  }
  return imageData
}
