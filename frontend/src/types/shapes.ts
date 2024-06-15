// PixelPosition represents a coordinate and index.
export interface PixelPosition {
  x: number
  y: number
  index: number
}

// FilledCircle returns an array of PixelPositions that correspond to a filled circle.
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

export function FilledOval(x: number, y: number, radiusX: number, radiusY: number, index: number): PixelPosition[] {
  let pixels: PixelPosition[] = []
  
  // TODO

  return pixels
}

export function OutlinedOval(x: number, y: number, radiusX: number, radiusY: number, index: number): PixelPosition[] {
  let pixels: PixelPosition[] = []
  
  // TODO

  return pixels
}

// FilledSquare returns an array of PixelPositions that correspond to a filled square.
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
    
    pixels.push({x: x + dx, y: y + dy, index})
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
