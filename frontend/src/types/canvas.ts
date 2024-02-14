export class Canvas {
  width: number
  height: number
  palette: Uint32Array // 32-bit RGBA palette
  pixels: Uint8Array // 8-bit indices into the palette
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
}