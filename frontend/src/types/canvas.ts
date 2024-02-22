import type { PixelPosition } from "./shapes"

export class Canvas {
  width: number
  height: number
  palette: Uint32Array // 32-bit RGBA palette
  pixels: Uint8Array // 8-bit indices into the palette
  public isIndexed: boolean = false
  canvas: HTMLCanvasElement
  imageData: ImageData
  
  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.pixels = new Uint8Array(width * height)
    this.palette = new Uint32Array(0)
    this.canvas = document.createElement('canvas')
    this.imageData = new ImageData(width, height)
  }
  
  // fromData creates a new Canvas instance from the provided data.
  static fromData({width, height, isIndexed, palette, pixels}: {width: number, height: number, isIndexed: boolean, palette: Uint32Array, pixels: Uint8Array}): Canvas {
    let canvas = new Canvas(width, height)
    canvas.isIndexed = isIndexed
    canvas.palette = palette
    canvas.pixels = pixels
    canvas.imageData = new ImageData(width, height)
    for (let i = 0; i < pixels.length; i++) {
      let color = palette[pixels[i]]
      canvas.imageData.data[i * 4 + 0] = color & 0xFF
      canvas.imageData.data[i * 4 + 1] = (color >> 8) & 0xFF
      canvas.imageData.data[i * 4 + 2] = (color >> 16) & 0xFF
      canvas.imageData.data[i * 4 + 3] = (color >> 24) & 0xFF
    }
    return canvas
  }
  
  clear() {
    for (let i = 0; i < this.pixels.length; i++) {
      this.pixels[i] = 0
    }
  }
  
  refreshCanvas() {
    this.canvas.width = this.width
    this.canvas.height = this.height
    let ctx = this.canvas.getContext('2d')
    ctx.putImageData(this.imageData, 0, 0)
  }
  setPalette(palette: Uint32Array) {
    this.palette = palette
  }
  getPaletteAsRGBA(index: number): { r: number, g: number, b: number, a: number } {
    if (index < 0 || index >= this.palette.length) {
      return { r: 0, g: 0, b: 0, a: 0 }
    }
    let color = this.palette[index]
    return {
      r: color & 0xFF,
      g: (color >> 8) & 0xFF,
      b: (color >> 16) & 0xFF,
      a: (color >> 24) & 0xFF
    }
  }
  setPaletteFromUint8Array(palette: Uint8Array) {
    this.palette = new Uint32Array(palette.length / 4)
    for (let i = 0; i < palette.length; i += 4) {
      this.palette[i / 4] = new Uint32Array(palette.buffer.slice(i, i + 4))[0]
    }
  }
  setPixelsFromUint8Array(pixels: Uint8Array) {
    this.pixels = pixels
    this.imageData = new ImageData(this.width, this.height)
    for (let i = 0; i < pixels.length; i++) {
      let color = this.palette[pixels[i]]
      this.imageData.data[i * 4 + 0] = color & 0xFF
      this.imageData.data[i * 4 + 1] = (color >> 8) & 0xFF
      this.imageData.data[i * 4 + 2] = (color >> 16) & 0xFF
      this.imageData.data[i * 4 + 3] = (color >> 24) & 0xFF
    }
  }
  getPixel(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return -1
    }
    return this.pixels[y * this.width + x]
  }
  setPixel(x: number, y: number, index: number) {
    this.pixels[y * this.width + x] = index
    let color = this.palette[index]
    let r = color & 0xFF
    let g = (color >> 8) & 0xFF
    let b = (color >> 16) & 0xFF
    let a = (color >> 24) & 0xFF
    this.imageData.data[(y * this.width + x) * 4 + 0] = r
    this.imageData.data[(y * this.width + x) * 4 + 1] = g
    this.imageData.data[(y * this.width + x) * 4 + 2] = b
    this.imageData.data[(y * this.width + x) * 4 + 3] = a
  }
  setPixelRGBA(x: number, y: number, r: number, g: number, b: number, a: number) {
    this.pixels[y * this.width + x] = this.addPaletteColor(r, g, b, a)
    this.imageData.data[(y * this.width + x) * 4 + 0] = r
    this.imageData.data[(y * this.width + x) * 4 + 1] = g
    this.imageData.data[(y * this.width + x) * 4 + 2] = b
    this.imageData.data[(y * this.width + x) * 4 + 3] = a
  }
  addPaletteColor(r: number, g: number, b: number, a: number): number {
    // Check if the color is already in the palette
    for (let i = 0; i < this.palette.length; i++) {
      let v = new Uint32Array([(a << 24) | (b << 16) | (g << 8) | r])[0]
      if (this.palette.at(i) === v) {
        return i
      }
    }
    // Add the color to the palette
    const index = this.palette.length
    let v = new Uint32Array([(a << 24) | (b << 16) | (g << 8) | r])[0]
    
    let newPalette = new Uint32Array(this.palette.length + 1)
    newPalette.set(this.palette)
    newPalette[this.palette.length] = v
    this.palette = newPalette

    return index
  }
  getClosestPaletteColor(r: number, g: number, b: number, a: number): {r: number, g: number, b: number, a: number, index: number} {
    let similarityMap = this.palette.map((color) => {
      let r2 = color & 0xFF
      let g2 = (color >> 8) & 0xFF
      let b2 = (color >> 16) & 0xFF
      let a2 = (color >> 24) & 0xFF
      return Math.abs(r2 - r) + Math.abs(g2 - g) + Math.abs(b2 - b) + Math.abs(a2 - a)
    })
    let closestIndex = 0
    let closestValue = similarityMap[0]
    for (let i = 1; i < similarityMap.length; i++) {
      if (similarityMap[i] < closestValue) {
        closestValue = similarityMap[i]
        closestIndex = i
      }
    }
    return {
      r: this.palette[closestIndex] & 0xFF,
      g: (this.palette[closestIndex] >> 8) & 0xFF,
      b: (this.palette[closestIndex] >> 16) & 0xFF,
      a: (this.palette[closestIndex] >> 24) & 0xFF,
      index: closestIndex
    }
  }
  addNewPaletteColor(r: number, g: number, b: number, a: number) {
    this.palette = new Uint32Array([...this.palette, new Uint32Array([(a << 24) | (b << 16) | (g << 8) | r])[0]])
  }
  removePaletteColor(index: number) {
    if (index < 0) {
      index = this.palette.length - index
    }
    let newPalette = new Uint32Array(this.palette.length - 1)
    for (let i = 0; i < index; i++) {
      newPalette[i] = this.palette[i]
    }
    for (let i = index + 1; i < this.palette.length; i++) {
      newPalette[i - 1] = this.palette[i]
    }
    this.palette = newPalette
    for (let i = 0; i < this.pixels.length; i++) {
      if (this.pixels[i] === index) {
        this.pixels[i] = 0
      } else if (this.pixels[i] > index) {
        this.pixels[i]--
      }
    }
  }
  replacePaletteColor(index: number, r: number, g: number, b: number, a: number) {
    this.palette[index] = new Uint32Array([(a << 24) | (b << 16) | (g << 8) | r])[0]
  }
  hasPaletteColor(r: number, g: number, b: number, a: number): boolean {
    for (let color of this.palette) {
      if ((color & 0xFF) === r && ((color >> 8) & 0xFF) === g && ((color >> 16) & 0xFF) === b && ((color >> 24) & 0xFF) === a) {
        return true
      }
    }
    return false
  }
  swapPaletteColors(index1: number, index2: number) {
    let temp = this.palette[index1]
    this.palette[index1] = this.palette[index2]
    this.palette[index2] = temp
  }
  movePaletteColor(from: number, to: number) {
    let temp = this.palette[from]
    if (from < to) {
      for (let i = from; i < to; i++) {
        this.palette[i] = this.palette[i + 1]
      }
    } else {
      for (let i = from; i > to; i--) {
        this.palette[i] = this.palette[i - 1]
      }
    }
    this.palette[to] = temp
  }
  refreshImageData() {
    for (let i = 0; i < this.pixels.length; i++) {
      let color = this.palette[this.pixels[i]]
      this.imageData.data[i * 4 + 0] = color & 0xFF
      this.imageData.data[i * 4 + 1] = (color >> 8) & 0xFF
      this.imageData.data[i * 4 + 2] = (color >> 16) & 0xFF
      this.imageData.data[i * 4 + 3] = (color >> 24) & 0xFF
    }
  }
  
  // Returns the an ImageData containing the canvas contents clipped to the provided pixel mask.
  getImageDataFromMask(mask: PixelPosition[]): {imageData: ImageData, x: number, y: number, w: number, h: number} {
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
    
    let imageData = new ImageData(width, height)

    for (let pixel of mask) {
      let p = this.getPixel(pixel.x, pixel.y)
      if (p !== -1) {
        let color = this.palette[p]
        imageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 0] = color & 0xFF
        imageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 1] = (color >> 8) & 0xFF
        imageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 2] = (color >> 16) & 0xFF
        imageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 3] = (color >> 24) & 0xFF
      }
    }
    return {imageData, x: minX, y: minY, w: width, h: height}
  }

  // Clip the canvas to contain only the pixels in the provided mask. It returns the new left and top position that the canvas should be rendered to.
  clipToMask(mask: PixelPosition[]): ({x: number, y: number}) {
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
    
    let newPixels = new Uint8Array(width * height)
    let newImageData = new ImageData(width, height)
    
    for (let pixel of mask) {
      let p = this.getPixel(pixel.x, pixel.y)
      if (p !== -1) {
        newPixels[(pixel.y - minY) * width + (pixel.x - minX)] = p
        let color = this.palette[p]
        newImageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 0] = color & 0xFF
        newImageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 1] = (color >> 8) & 0xFF
        newImageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 2] = (color >> 16) & 0xFF
        newImageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 3] = (color >> 24) & 0xFF
      }
    }

    this.pixels = newPixels
    this.imageData = newImageData

    this.width = width
    this.height = height

    return {x: minX, y: minY}
  }
}