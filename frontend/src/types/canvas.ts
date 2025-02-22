import type { PixelPosition } from './shapes'
import { zlibSync } from 'fflate'
import * as crc32 from 'crc-32'
import { Buffer } from 'buffer/'
import type { LoadedFile } from './file'
import { IndexedPNG } from './png'
import { clog } from '../globals/log'
import { ResizableBuffer } from './resizablebuffer'

/**
 * @type {Canvas}
 *
 * Canvas provides a way to store and manipulate 2D pixel data.
 */
export class Canvas {
  width: number
  height: number
  palette: Uint32Array // 32-bit RGBA palette
  fakePalette: Uint32Array // 32-bit RGBA palette
  pixels: Uint8Array // 8-bit indices into the palette
  otherChunks: Uint8Array[] = []
  public isIndexed: boolean = false
  canvas: HTMLCanvasElement
  imageData: ImageData

  constructor(width: number, height: number)
  constructor(png: IndexedPNG)
  constructor(width: number | IndexedPNG, height?: number) {
    let png: IndexedPNG
    if (width instanceof IndexedPNG) {
      png = width
      width = png.width
      height = png.height
    }
    this.width = width
    this.height = height
    this.pixels = new Uint8Array(width * height)
    this.palette = new Uint32Array(0)
    this.canvas = document.createElement('canvas')
    this.imageData = new ImageData(width, height)
    if (png) {
      if (png.colorType === 6 || png.colorType === 2) {
        // RGBA / RGB
        for (let i = 0; i < png.decodedPixels.length; i += 4) {
          let y = Math.floor(i / (png.width * 4))
          let x = (i / 4) % png.width
          this.setPixelRGBA(x, y, png.decodedPixels[i], png.decodedPixels[i + 1], png.decodedPixels[i + 2], png.decodedPixels[i + 3])
        }
        this.isIndexed = false
      } else if (png.colorType === 3) {
        // indexed
        this.setPaletteFromUint8Array(png.decodedPalette)
        this.setPixelsFromUint8Array(png.decodedPixels)
        this.isIndexed = true
      } else {
        throw new Error('unsupported pixel format')
      }
      // Store png's other chunks.
      this.otherChunks = png.otherChunks
      this.refreshCanvas()
    }
  }

  // fromData creates a new Canvas instance from the provided data.
  static fromData({ width, height, isIndexed, palette, pixels }: { width: number; height: number; isIndexed: boolean; palette: Uint32Array; pixels: Uint8Array }): Canvas {
    let canvas = new Canvas(width, height)
    canvas.isIndexed = isIndexed
    canvas.palette = palette
    canvas.pixels = pixels
    canvas.imageData = new ImageData(width, height)
    for (let i = 0; i < pixels.length; i++) {
      let color = palette[pixels[i]]
      canvas.imageData.data[i * 4 + 0] = color & 0xff
      canvas.imageData.data[i * 4 + 1] = (color >> 8) & 0xff
      canvas.imageData.data[i * 4 + 2] = (color >> 16) & 0xff
      canvas.imageData.data[i * 4 + 3] = (color >> 24) & 0xff
    }
    canvas.refreshCanvas()
    return canvas
  }

  static clone(canvas: Canvas): Canvas {
    let newCanvas = new Canvas(canvas.width, canvas.height)
    newCanvas.palette = new Uint32Array(canvas.palette)
    newCanvas.pixels = new Uint8Array(canvas.pixels)
    newCanvas.imageData = new ImageData(new Uint8ClampedArray(canvas.imageData.data), canvas.width, canvas.height)
    newCanvas.refreshCanvas()
    return newCanvas
  }

  // clear sets all pixels to 0.
  clear() {
    clog.debug('clear')
    for (let i = 0; i < this.pixels.length; i++) {
      this.pixels[i] = 0
    }
  }

  // refreshCanvas redraws the canvas with the current pixel data.
  refreshCanvas() {
    this.canvas.width = this.width
    this.canvas.height = this.height
    let ctx = this.canvas.getContext('2d')
    ctx.putImageData(this.imageData, 0, 0)
  }

  // resizeCanvas resizes the canvas to the given width and height, copying old data as necessary.
  resizeCanvas(width: number, height: number) {
    clog.debug('resize', width, height)
    let newPixels = new Uint8Array(width * height)
    for (let i = 0; i < Math.min(height, this.height); i++) {
      for (let j = 0; j < Math.min(width, this.width); j++) {
        newPixels[i * width + j] = this.pixels[i * this.width + j]
      }
    }
    this.width = width
    this.height = height
    this.pixels = newPixels
    this.imageData = new ImageData(width, height)
    for (let i = 0; i < this.pixels.length; i++) {
      let color = this.palette[this.pixels[i]]
      this.imageData.data[i * 4 + 0] = color & 0xff
      this.imageData.data[i * 4 + 1] = (color >> 8) & 0xff
      this.imageData.data[i * 4 + 2] = (color >> 16) & 0xff
      this.imageData.data[i * 4 + 3] = (color >> 24) & 0xff
    }
  }

  // growCanvas grows the canvas by the given x and y amounts.
  growCanvas(x: number, y: number) {
    clog.debug('grow', x, y)
    let newWidth = this.width + x
    let newHeight = this.height + y
    let newPixels = new Uint8Array(newWidth * newHeight)
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        newPixels[i * newWidth + j] = this.pixels[i * this.width + j]
      }
    }
    this.width = newWidth
    this.height = newHeight
    this.pixels = newPixels
    this.imageData = new ImageData(newWidth, newHeight)
    for (let i = 0; i < this.pixels.length; i++) {
      let color = this.palette[this.pixels[i]]
      this.imageData.data[i * 4 + 0] = color & 0xff
      this.imageData.data[i * 4 + 1] = (color >> 8) & 0xff
      this.imageData.data[i * 4 + 2] = (color >> 16) & 0xff
      this.imageData.data[i * 4 + 3] = (color >> 24) & 0xff
    }
  }

  // shrinkCanvas shrinks the canvas by the given x and y amounts.
  shrinkCanvas(x: number, y: number) {
    clog.debug('shrink', x, y)
    let newWidth = this.width - x
    let newHeight = this.height - y
    let newPixels = new Uint8Array(newWidth * newHeight)
    for (let i = 0; i < newHeight; i++) {
      for (let j = 0; j < newWidth; j++) {
        newPixels[i * newWidth + j] = this.pixels[i * this.width + j]
      }
    }
    this.width = newWidth
    this.height = newHeight
    this.pixels = newPixels
    this.imageData = new ImageData(newWidth, newHeight)
    for (let i = 0; i < this.pixels.length; i++) {
      let color = this.palette[this.pixels[i]]
      this.imageData.data[i * 4 + 0] = color & 0xff
      this.imageData.data[i * 4 + 1] = (color >> 8) & 0xff
      this.imageData.data[i * 4 + 2] = (color >> 16) & 0xff
      this.imageData.data[i * 4 + 3] = (color >> 24) & 0xff
    }
  }

  // setPalette sets the palette to the provided value.
  setPalette(palette: Uint32Array) {
    clog.debug('setPalette', palette.length)
    this.palette = palette
  }

  // getPaletteAsRGBA returns the RGBA values of the palette color at the provided index.
  getPaletteAsRGBA(index: number): { r: number; g: number; b: number; a: number } {
    if (index < 0 || index >= this.palette.length) {
      return { r: 0, g: 0, b: 0, a: 0 }
    }
    let color = this.palette[index]
    return {
      r: color & 0xff,
      g: (color >> 8) & 0xff,
      b: (color >> 16) & 0xff,
      a: (color >> 24) & 0xff,
    }
  }

  getPaletteColor(index: number): number {
    if (this.fakePalette) {
      return this.fakePalette[index]
    }
    return this.palette[index]
  }

  // setPaletteFromUint8Array sets the palette to the provided value.
  setPaletteFromUint8Array(palette: Uint8Array) {
    clog.debug('setPaletteFromUint8Array', palette.length)
    this.palette = new Uint32Array(palette.length / 4)
    for (let i = 0; i < palette.length; i += 4) {
      this.palette[i / 4] = new Uint32Array(palette.buffer.slice(i, i + 4))[0]
    }
  }

  // setPixelsFromUint8Array sets the pixel data to the provided value.
  setPixelsFromUint8Array(pixels: Uint8Array) {
    clog.debug('setPixelsFromUint8Array', pixels.length)
    this.pixels = pixels
    this.imageData = new ImageData(this.width, this.height)
    for (let i = 0; i < pixels.length; i++) {
      let color = this.palette[pixels[i]]
      this.imageData.data[i * 4 + 0] = color & 0xff
      this.imageData.data[i * 4 + 1] = (color >> 8) & 0xff
      this.imageData.data[i * 4 + 2] = (color >> 16) & 0xff
      this.imageData.data[i * 4 + 3] = (color >> 24) & 0xff
    }
  }

  // getPixel gets the index at the provided pixel position.
  getPixel(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return -1
    }
    return this.pixels[y * this.width + x]
  }

  // getPixelDirect returns the index without any bounds checking.
  getPixelDirect(x: number, y: number): number {
    return this.pixels[y * this.width + x]
  }

  // setPixel sets the index at the provided pixel position.
  setPixel(x: number, y: number, index: number, noRefresh?: boolean) {
    //clog.debug('setPixel', x, y, index)
    this.pixels[y * this.width + x] = index
    if (noRefresh) return
    let color = this.palette[index]
    let r = color & 0xff
    let g = (color >> 8) & 0xff
    let b = (color >> 16) & 0xff
    let a = (color >> 24) & 0xff
    this.imageData.data[(y * this.width + x) * 4 + 0] = r
    this.imageData.data[(y * this.width + x) * 4 + 1] = g
    this.imageData.data[(y * this.width + x) * 4 + 2] = b
    this.imageData.data[(y * this.width + x) * 4 + 3] = a
  }

  // setPixelRGBA sets the given pixel position to the provided RGBA values. If the RGBA values do not exist in the palette, they are automatically added.
  setPixelRGBA(x: number, y: number, r: number, g: number, b: number, a: number) {
    //clog.debug('setPixelRGBA', x, y, r, g, b, a)
    this.pixels[y * this.width + x] = this.addPaletteColor(r, g, b, a)
    this.imageData.data[(y * this.width + x) * 4 + 0] = r
    this.imageData.data[(y * this.width + x) * 4 + 1] = g
    this.imageData.data[(y * this.width + x) * 4 + 2] = b
    this.imageData.data[(y * this.width + x) * 4 + 3] = a
  }

  getPixelsColors(x: number, y: number, w: number, h: number): Uint32Array {
    let palette = this.palette
    if (this.fakePalette) {
      palette = this.fakePalette
    }
    let colors = new Uint32Array(w * h)
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        colors[i * w + j] = palette[this.pixels[(y + i) * this.width + (x + j)]]
      }
    }
    return colors
  }

  getPixels(x: number, y: number, w: number, h: number): Uint8Array {
    let pixels = new Uint8Array(w * h)
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        pixels[i * w + j] = this.pixels[(y + i) * this.width + (x + j)]
      }
    }
    return pixels
  }

  setPixels(x: number, y: number, w: number, h: number, pixels: Uint8Array, noRefresh?: boolean) {
    clog.debug('setPixels', x, y, w, h, pixels.length)
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        this.pixels[(y + i) * this.width + (x + j)] = pixels[i * w + j]
      }
    }
    if (noRefresh) return
    this.refreshImageData() // FIXME: It might be more efficient to set imageData above.
  }

  clearPixels(x: number, y: number, w: number, h: number) {
    clog.debug('clearPixels', x, y, w, h)
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        this.pixels[(y + i) * this.width + (x + j)] = 0
      }
    }
    this.refreshImageData() // FIXME: It might be more efficient to set imageData above.
  }

  // addPaletteColor adds the provided RGBA values to the palette if it does not already exist, and returns the index of the color in the palette.
  addPaletteColor(r: number, g: number, b: number, a: number): number {
    //clog.debug('addPaletteColor', r, g, b, a)
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

  // getClosestPaletteColor returns the RGBA and index values of the closest color in the palette to the provided RGBA values.
  getClosestPaletteColor(r: number, g: number, b: number, a: number): { r: number; g: number; b: number; a: number; index: number } {
    let similarityMap = this.palette.map((color) => {
      let r2 = color & 0xff
      let g2 = (color >> 8) & 0xff
      let b2 = (color >> 16) & 0xff
      let a2 = (color >> 24) & 0xff
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
      r: this.palette[closestIndex] & 0xff,
      g: (this.palette[closestIndex] >> 8) & 0xff,
      b: (this.palette[closestIndex] >> 16) & 0xff,
      a: (this.palette[closestIndex] >> 24) & 0xff,
      index: closestIndex,
    }
  }

  // addNewPaletteColor adds the provided RGBA values to the palette.
  addNewPaletteColor(r: number, g: number, b: number, a: number) {
    clog.debug('addNewPaletteColor', r, g, b, a)
    this.palette = new Uint32Array([...this.palette, new Uint32Array([(a << 24) | (b << 16) | (g << 8) | r])[0]])
  }

  // insertPaletteColor inserts the provided RGBA values into the palette at the provided index.
  insertPaletteColor(index: number, r: number, g: number, b: number, a: number, shiftPixels?: boolean) {
    clog.debug('insertPaletteColor', index, r, g, b, a)
    let newPalette = new Uint32Array(this.palette.length + 1)
    for (let i = 0; i < index; i++) {
      newPalette[i] = this.palette[i]
    }
    newPalette[index] = new Uint32Array([(a << 24) | (b << 16) | (g << 8) | r])[0]
    for (let i = index; i < this.palette.length; i++) {
      newPalette[i + 1] = this.palette[i]
    }
    this.palette = newPalette
    if (shiftPixels) {
      for (let i = 0; i < this.pixels.length; i++) {
        if (this.pixels[i] >= index) {
          this.pixels[i]++
        }
      }
    }
  }

  // removePaletteIndex removes the palette entry at the provided index. This also updates the pixel data to reflect the change.
  removePaletteIndex(index: number, shiftPixels?: boolean) {
    clog.debug('removePaletteIndex', index)
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
    if (shiftPixels) {
      for (let i = 0; i < this.pixels.length; i++) {
        if (this.pixels[i] > index) {
          this.pixels[i]--
        }
      }
    }
  }

  // replacePaletteColor replaces the palette entry at the provided index with the provided RGBA values.
  replacePaletteColor(index: number, r: number, g: number, b: number, a: number) {
    clog.debug('replacePaletteColor', index, r, g, b, a)
    this.palette[index] = new Uint32Array([(a << 24) | (b << 16) | (g << 8) | r])[0]
  }

  // hasPaletteColor returns whether the palette contains the provided RGBA values.
  hasPaletteColor(r: number, g: number, b: number, a: number): boolean {
    for (let color of this.palette) {
      if ((color & 0xff) === r && ((color >> 8) & 0xff) === g && ((color >> 16) & 0xff) === b && ((color >> 24) & 0xff) === a) {
        return true
      }
    }
    return false
  }

  // swapPaletteColors swaps the palette entries at the provided indices.
  swapPaletteColors(index1: number, index2: number) {
    clog.debug('swapPaletteColors', index1, index2)
    let temp = this.palette[index1]
    this.palette[index1] = this.palette[index2]
    this.palette[index2] = temp
  }

  // movePaletteColor moves the palette entry at the provided index to the new index.
  movePaletteColor(from: number, to: number) {
    clog.debug('movePaletteColor', from, to)
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

  // setFakePalette updates the fake palette to the provided value.
  setFakePalette(palette: Uint32Array | undefined) {
    clog.debug('setFakePalette', palette?.length)
    this.fakePalette = palette
  }

  // refreshImageData updates the ImageData with the current pixel data.
  refreshImageData() {
    let palette = this.palette
    if (this.fakePalette) {
      palette = this.fakePalette
    }
    for (let i = 0; i < this.pixels.length; i++) {
      let color: number = 0
      if (this.pixels[i] < palette.length) {
        color = palette[this.pixels[i]]
      }
      this.imageData.data[i * 4 + 0] = color & 0xff
      this.imageData.data[i * 4 + 1] = (color >> 8) & 0xff
      this.imageData.data[i * 4 + 2] = (color >> 16) & 0xff
      this.imageData.data[i * 4 + 3] = (color >> 24) & 0xff
    }
  }

  // getImageDataFromMask the ImageData containing the canvas contents clipped to the provided pixel mask.
  getImageDataFromMask(mask: PixelPosition[]): { imageData: ImageData; x: number; y: number; w: number; h: number } {
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
        imageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 0] = color & 0xff
        imageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 1] = (color >> 8) & 0xff
        imageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 2] = (color >> 16) & 0xff
        imageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 3] = (color >> 24) & 0xff
      }
    }
    return { imageData, x: minX, y: minY, w: width, h: height }
  }

  // Clip the canvas to contain only the pixels in the provided mask. It returns the new left and top position that the canvas should be rendered to.
  clipToMask(mask: PixelPosition[]): { x: number; y: number } {
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
        newImageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 0] = color & 0xff
        newImageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 1] = (color >> 8) & 0xff
        newImageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 2] = (color >> 16) & 0xff
        newImageData.data[((pixel.y - minY) * width + (pixel.x - minX)) * 4 + 3] = (color >> 24) & 0xff
      }
    }

    this.pixels = newPixels
    this.imageData = newImageData

    this.width = width
    this.height = height

    return { x: minX, y: minY }
  }

  async toPNG(file: LoadedFile): Promise<Uint8Array> {
    // Do some lazy indexed PNG generation. FIXME: This is ham-fisted and not the proper way to encode PNGs...
    return new Promise((resolve, reject) => {
      let out = Buffer.alloc(0)

      let buffer = Buffer.alloc(21)
      let bufferOffset = 0
      let chunkStart = 0
      let chunkEnd = 0
      let deflatedData: Uint8Array
      // Write header
      buffer = Buffer.alloc(8)
      bufferOffset = buffer.writeUInt8(0x89, bufferOffset)
      bufferOffset = buffer.writeUInt8(0x50, bufferOffset)
      bufferOffset = buffer.writeUInt8(0x4e, bufferOffset)
      bufferOffset = buffer.writeUInt8(0x47, bufferOffset)
      bufferOffset = buffer.writeUInt8(0x0d, bufferOffset)
      bufferOffset = buffer.writeUInt8(0x0a, bufferOffset)
      bufferOffset = buffer.writeUInt8(0x1a, bufferOffset)
      bufferOffset = buffer.writeUInt8(0x0a, bufferOffset)
      out = Buffer.concat([out, buffer])

      // TODO: Replace this manual buffer writing with something like `new Chunk('IHDR')`, then writing bytes as desired, then issuing `out = Buffer.concat([out, chunk.finish()])` or something similar. It might be convenient have chunk.write(...), chunk.done(), then one would have chunk.length, chunk.type, chunk.data, and chunk.crc, all of which could be written to out.

      // Chunk o'clock (length, type, data, crc. crc = network-order CRC-32 of type + data)
      // Write IHDR
      ;(buffer = Buffer.alloc(12 + 13)), (bufferOffset = 0)
      bufferOffset = buffer.writeUInt32BE(13, bufferOffset)
      chunkStart = bufferOffset
      bufferOffset += buffer.write('IHDR', bufferOffset)
      bufferOffset = buffer.writeUInt32BE(this.width, bufferOffset)
      bufferOffset = buffer.writeUInt32BE(this.height, bufferOffset)
      bufferOffset = buffer.writeUInt8(this.isIndexed ? 8 : 8, bufferOffset) // Indexed 8-bit depth for palette entries
      bufferOffset = buffer.writeUInt8(this.isIndexed ? 3 : 6, bufferOffset) // Color type of indexed or RGBA
      bufferOffset = buffer.writeUInt8(0, bufferOffset) // Compression method DEFLATE
      bufferOffset = buffer.writeUInt8(0, bufferOffset) // Filter method of 0
      bufferOffset = buffer.writeUInt8(0, bufferOffset) // No interlace method
      chunkEnd = bufferOffset
      bufferOffset = buffer.writeInt32BE(crc32.buf(buffer.slice(chunkStart, chunkEnd)), bufferOffset)
      out = Buffer.concat([out, buffer])

      // Write out our stAx chunk. TODO: Move this to its own function.
      let dbuffer = new ResizableBuffer()
      dbuffer.writeUInt8(0) // Write version 0 stAx
      dbuffer.writeUInt16BE(file.frameWidth) // write frame width
      dbuffer.writeUInt16BE(file.frameHeight) // write frame height
      dbuffer.writeUInt16BE(file.stacks.length) // write stack count
      // Write our stacks.
      for (let i = 0; i < file.stacks.length; i++) {
        let stack = file.stacks[i]
        // Write our stack name's length and name data.
        dbuffer.writeUInt8(stack.name.length)
        for (let j = 0; j < stack.name.length; j++) {
          dbuffer.writeUInt8(stack.name.charCodeAt(j))
        }
        // Write layer count in the stack.
        dbuffer.writeUInt16BE(stack.sliceCount)
        // Write animation count and animations.
        dbuffer.writeUInt16BE(stack.animations.length)
        for (let j = 0; j < stack.animations.length; j++) {
          let animation = stack.animations[j]
          // Write animation name's length and name data.
          dbuffer.writeUInt8(animation.name.length)
          for (let k = 0; k < animation.name.length; k++) {
            dbuffer.writeUInt8(animation.name.charCodeAt(k))
          }
          // Write frame time.
          dbuffer.writeUInt32BE(animation.frameTime)
          // Write frame count.
          dbuffer.writeUInt16BE(animation.frames.length)
          // Write frames.
          for (let k = 0; k < animation.frames.length; k++) {
            let frame = animation.frames[k]
            // Write the frame's layer data (only shading data atm).
            for (let l = 0; l < frame.slices.length; l++) {
              dbuffer.writeUInt8(frame.slices[l].shading)
            }
          }
        }
      }
      ;(buffer = Buffer.alloc(8 + dbuffer.buffer.length + 4)), (bufferOffset = 0)
      bufferOffset = buffer.writeUInt32BE(dbuffer.buffer.length, 0)
      chunkStart = bufferOffset
      bufferOffset += buffer.write('stAx', bufferOffset)
      bufferOffset += dbuffer.buffer.copy(buffer, bufferOffset)
      chunkEnd = bufferOffset
      bufferOffset = buffer.writeInt32BE(crc32.buf(buffer.slice(chunkStart, chunkEnd)), bufferOffset)
      out = Buffer.concat([out, buffer])

      // Write stored other chunks.
      for (let chunk of this.otherChunks) {
        const chunkLength = chunk.length - 4 // Chunk - type
        ;(buffer = Buffer.alloc(12 + chunkLength)), (bufferOffset = 0)
        bufferOffset = buffer.writeUInt32BE(chunkLength, bufferOffset)
        chunkStart = bufferOffset
        bufferOffset += Buffer.from(chunk).copy(buffer, bufferOffset)
        chunkEnd = bufferOffset
        bufferOffset = buffer.writeInt32BE(crc32.buf(buffer.slice(chunkStart, chunkEnd)), bufferOffset)
        out = Buffer.concat([out, buffer])
      }

      if (this.isIndexed) {
        // Write PLTE
        let palettesSize = this.palette.length * 3
        ;(buffer = Buffer.alloc(12 + palettesSize)), (bufferOffset = 0)
        bufferOffset = buffer.writeUInt32BE(palettesSize, bufferOffset)
        chunkStart = bufferOffset
        bufferOffset += buffer.write('PLTE', bufferOffset)
        for (let i = 0; i < this.palette.length; i++) {
          bufferOffset = buffer.writeUInt8(this.palette[i] & 0xff, bufferOffset)
          bufferOffset = buffer.writeUInt8((this.palette[i] >> 8) & 0xff, bufferOffset)
          bufferOffset = buffer.writeUInt8((this.palette[i] >> 16) & 0xff, bufferOffset)
          // Alpha is skipped.
        }
        chunkEnd = bufferOffset
        bufferOffset = buffer.writeInt32BE(crc32.buf(buffer.slice(chunkStart, chunkEnd)), bufferOffset)
        out = Buffer.concat([out, buffer])
        // Write tRNS
        palettesSize = this.palette.length
        ;(buffer = Buffer.alloc(12 + palettesSize)), (bufferOffset = 0)
        bufferOffset = buffer.writeUInt32BE(palettesSize, bufferOffset)
        chunkStart = bufferOffset
        bufferOffset += buffer.write('tRNS', bufferOffset)
        for (let i = 0; i < this.palette.length; i++) {
          bufferOffset = buffer.writeUInt8((this.palette[i] >> 24) & 0xff, bufferOffset)
        }
        chunkEnd = bufferOffset
        bufferOffset = buffer.writeInt32BE(crc32.buf(buffer.slice(chunkStart, chunkEnd)), bufferOffset)
        out = Buffer.concat([out, buffer])
        // Build our deflate data
        let data = Buffer.alloc(this.pixels.length + this.height)
        let dataOffset = 0
        for (let i = 0; i < this.height; i++) {
          dataOffset = data.writeUInt8(0, dataOffset) // No Filter
          for (let j = 0, end = this.width; j < end; j++) {
            dataOffset = data.writeUInt8(this.pixels[i * this.width + j], dataOffset)
          }
        }
        deflatedData = zlibSync(data, { level: 9 })
      } else {
        // Build our RGBA deflate data
        let data = Buffer.alloc(this.pixels.length * 4 + this.height)
        let dataOffset = 0
        for (let i = 0; i < this.height; i++) {
          dataOffset = data.writeUInt8(0, dataOffset) // No Filter
          for (let j = 0, end = this.width; j < end; j++) {
            let color = this.palette[this.pixels[i * this.width + j]]
            let r = color & 0xff
            let g = (color >> 8) & 0xff
            let b = (color >> 16) & 0xff
            let a = (color >> 24) & 0xff
            dataOffset = data.writeUInt8(r, dataOffset)
            dataOffset = data.writeUInt8(g, dataOffset)
            dataOffset = data.writeUInt8(b, dataOffset)
            dataOffset = data.writeUInt8(a, dataOffset)
          }
        }
        deflatedData = zlibSync(data, { level: 9 })
      }
      // Write IDAT // Our DEFLATE and 0->raw scanline data
      ;(buffer = Buffer.alloc(8)), (bufferOffset = 0)
      bufferOffset = buffer.writeUInt32BE(deflatedData.length, bufferOffset)
      chunkStart = bufferOffset
      bufferOffset += buffer.write('IDAT', bufferOffset)
      buffer = Buffer.concat([buffer, deflatedData, Buffer.alloc(4)])
      bufferOffset = bufferOffset + deflatedData.length
      chunkEnd = bufferOffset
      bufferOffset = buffer.writeInt32BE(crc32.buf(buffer.slice(chunkStart, chunkEnd)), bufferOffset)
      out = Buffer.concat([out, buffer])
      // Write IEND
      ;(buffer = Buffer.alloc(12)), (bufferOffset = 0)
      bufferOffset = buffer.writeUInt32BE(0, bufferOffset)
      chunkStart = bufferOffset
      bufferOffset += buffer.write('IEND', bufferOffset)
      chunkEnd = bufferOffset
      bufferOffset = buffer.writeInt32BE(crc32.buf(buffer.slice(chunkStart, chunkEnd)), bufferOffset)
      out = Buffer.concat([out, buffer])
      resolve(new Uint8Array(out))
    })
  }
}
