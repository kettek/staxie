import type { Canvas } from "./canvas"
import type { SelectionArea } from "./selection"

// Preview is a helper class that provides a preview HTMLCanvasElement that is built from a Selection and a Canvas.
export class Preview {
  public canvas: HTMLCanvasElement // A canvas sized to the minimum bounding box of the selection.
  // x and y should be used to position the Preview's canvas relative to the top-left of the Canvas.
  public x: number // x is the x offet from the left-most pixel in the selection.
  public y: number // y is the y offset from the top-most pixel in the selection.
  
  constructor() {
    this.canvas = document.createElement('canvas')
    this.x = 0
    this.y = 0
  }
  
  fromSelectionAndCanvas(selection: SelectionArea, canvas: Canvas) {
    // Get our selection mask. FIXME: We can probably just use the selection's pixelMaskCanvasPixels...
    let mask = selection.getMask()
    // Get minimum x position from mask.
    let minX = 9999999
    let minY = 9999999
    let maxX = -9999999
    let maxY = -9999999
    for (let pixel of mask) {
      minX = Math.min(minX, pixel.x)
      minY = Math.min(minY, pixel.y)
      maxX = Math.max(maxX, pixel.x)
      maxY = Math.max(maxY, pixel.y)
    }
    let width = maxX - minX + 1
    let height = maxY - minY + 1
    
    // Copy over the pixels from the canvas's image data to a preview image data.
    let imageData = new ImageData(width, height)
    for (let pixel of mask) {
      let p = canvas.getPixel(pixel.x, pixel.y)
      if (p !== -1) {
        let {r, g, b, a} = canvas.getPaletteAsRGBA(p)
        imageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 0] = r
        imageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 1] = g
        imageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 2] = b
        imageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 3] = a
      }
    }

    // Store for use in other calculations.
    this.x = minX
    this.y = minY

    // Draw it!
    this.canvas.width = width
    this.canvas.height = height
    let ctx = this.canvas.getContext('2d')
    ctx.putImageData(imageData, 0, 0)
  }
}