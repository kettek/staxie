import type { PixelPosition } from "./shapes"
import { unzlibSync, zlibSync } from 'fflate'
import { crc32 } from 'easy-crc'
import { SaveFileBytes } from "../../wailsjs/go/main/App.js"

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
  
  // clear sets all pixels to 0.
  clear() {
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

  // setPalette sets the palette to the provided value.
  setPalette(palette: Uint32Array) {
    this.palette = palette
  }
  
  // getPaletteAsRGBA returns the RGBA values of the palette color at the provided index.
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
  
  // setPaletteFromUint8Array sets the palette to the provided value.
  setPaletteFromUint8Array(palette: Uint8Array) {
    this.palette = new Uint32Array(palette.length / 4)
    for (let i = 0; i < palette.length; i += 4) {
      this.palette[i / 4] = new Uint32Array(palette.buffer.slice(i, i + 4))[0]
    }
  }
  
  // setPixelsFromUint8Array sets the pixel data to the provided value.
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
  
  // getPixel gets the index at the provided pixel position.
  getPixel(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return -1
    }
    return this.pixels[y * this.width + x]
  }
  
  // setPixel sets the index at the provided pixel position.
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
  
  // setPixelRGBA sets the given pixel position to the provided RGBA values. If the RGBA values do not exist in the palette, they are automatically added.
  setPixelRGBA(x: number, y: number, r: number, g: number, b: number, a: number) {
    this.pixels[y * this.width + x] = this.addPaletteColor(r, g, b, a)
    this.imageData.data[(y * this.width + x) * 4 + 0] = r
    this.imageData.data[(y * this.width + x) * 4 + 1] = g
    this.imageData.data[(y * this.width + x) * 4 + 2] = b
    this.imageData.data[(y * this.width + x) * 4 + 3] = a
  }
  
  // addPaletteColor adds the provided RGBA values to the palette if it does not already exist, and returns the index of the color in the palette.
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
  
  // getClosestPaletteColor returns the RGBA and index values of the closest color in the palette to the provided RGBA values.
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
  
  // addNewPaletteColor adds the provided RGBA values to the palette.
  addNewPaletteColor(r: number, g: number, b: number, a: number) {
    this.palette = new Uint32Array([...this.palette, new Uint32Array([(a << 24) | (b << 16) | (g << 8) | r])[0]])
  }
  
  // insertPaletteColor inserts the provided RGBA values into the palette at the provided index.
  insertPaletteColor(index: number, r: number, g: number, b: number, a: number) {
    let newPalette = new Uint32Array(this.palette.length + 1)
    for (let i = 0; i < index; i++) {
      newPalette[i] = this.palette[i]
    }
    newPalette[index] = new Uint32Array([(a << 24) | (b << 16) | (g << 8) | r])[0]
    for (let i = index; i < this.palette.length; i++) {
      newPalette[i + 1] = this.palette[i]
    }
    this.palette = newPalette
  }
  
  // removePaletteIndex removes the palette entry at the provided index. This also updates the pixel data to reflect the change.
  removePaletteIndex(index: number) {
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
  
  // replacePaletteColor replaces the palette entry at the provided index with the provided RGBA values.
  replacePaletteColor(index: number, r: number, g: number, b: number, a: number) {
    this.palette[index] = new Uint32Array([(a << 24) | (b << 16) | (g << 8) | r])[0]
  }
  
  // hasPaletteColor returns whether the palette contains the provided RGBA values.
  hasPaletteColor(r: number, g: number, b: number, a: number): boolean {
    for (let color of this.palette) {
      if ((color & 0xFF) === r && ((color >> 8) & 0xFF) === g && ((color >> 16) & 0xFF) === b && ((color >> 24) & 0xFF) === a) {
        return true
      }
    }
    return false
  }
  
  // swapPaletteColors swaps the palette entries at the provided indices.
  swapPaletteColors(index1: number, index2: number) {
    let temp = this.palette[index1]
    this.palette[index1] = this.palette[index2]
    this.palette[index2] = temp
  }
  
  // movePaletteColor moves the palette entry at the provided index to the new index.
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
  
  // setFakePalette updates the fake palette to the provided value.
  setFakePalette(palette: Uint32Array | undefined) {
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
      this.imageData.data[i * 4 + 0] = color & 0xFF
      this.imageData.data[i * 4 + 1] = (color >> 8) & 0xFF
      this.imageData.data[i * 4 + 2] = (color >> 16) & 0xFF
      this.imageData.data[i * 4 + 3] = (color >> 24) & 0xFF
    }
  }
  
  // getImageDataFromMask the ImageData containing the canvas contents clipped to the provided pixel mask.
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
  
  async toPNG(): Promise<Uint8Array> {
    // Just use the canvas rendered to a PNG if non-indexed.
    if (!this.isIndexed) {
      return new Promise((resolve, reject) => {
        this.canvas.toBlob((blob) => {
          blob.arrayBuffer().then((buffer) => {
            resolve(new Uint8Array(buffer))
          }).catch(reject)
        })
      })
    }
    
    throw new Error('indexed export not yet implemented')

    // Otherwise do some lazy indexed PNG generation.
    let out = Buffer.alloc(0)
    
    let buffer = Buffer.alloc(21)
    let bufferOffset = 0
    let chunkStart = 0
    let chunkEnd = 0
    
    // Write header
    buffer = Buffer.alloc(8)
    bufferOffset = buffer.writeUInt8(0x89, bufferOffset)
    bufferOffset = buffer.writeUInt8(0x50, bufferOffset)
    bufferOffset = buffer.writeUInt8(0x4E, bufferOffset)
    bufferOffset = buffer.writeUInt8(0x47, bufferOffset)
    bufferOffset = buffer.writeUInt8(0x0D, bufferOffset)
    bufferOffset = buffer.writeUInt8(0x0A, bufferOffset)
    bufferOffset = buffer.writeUInt8(0x1A, bufferOffset)
    bufferOffset = buffer.writeUInt8(0x0A, bufferOffset)
    out = Buffer.concat([out, buffer])
    
    // Chunk o'clock (length, type, data, crc. crc = network-order CRC-32 of type + data)
    // Write IHDR
    buffer = Buffer.alloc(12 + 13), bufferOffset = 0
    bufferOffset = buffer.writeUInt32BE(13, bufferOffset)
    chunkStart = bufferOffset
    bufferOffset += buffer.write('IHDR', bufferOffset, 'latin1')
    bufferOffset = buffer.writeUInt32BE(this.width, bufferOffset)
    bufferOffset = buffer.writeUInt32BE(this.height, bufferOffset)
    bufferOffset = buffer.writeUInt8(8, bufferOffset) // Indexed 8-bit depth for palette entries
    bufferOffset = buffer.writeUInt8(3, bufferOffset) // Color type of indexed
    bufferOffset = buffer.writeUInt8(0, bufferOffset) // Compression method DEFLATE
    bufferOffset = buffer.writeUInt8(0, bufferOffset) // Filter method of 0
    bufferOffset = buffer.writeUInt8(0, bufferOffset) // No interlace method
    chunkEnd = bufferOffset
    bufferOffset = buffer.writeUInt32BE(crc32('CRC-32', buffer.slice(chunkStart, chunkEnd)), bufferOffset)
    out = Buffer.concat([out, buffer])
    
    // TODO: Actually implement this code ripped from my own garbage encoder simple-indexed-png-encode.
    
    // Write PLTE
    /*let palettesSize = this.palette.length - this.palette.length/4
    buffer = Buffer.alloc(12 + palettesSize), bufferOffset = 0
    bufferOffset = buffer.writeUInt32BE(palettesSize, bufferOffset)
    chunkStart = bufferOffset
    bufferOffset += buffer.write('PLTE', bufferOffset, 'latin1')
    for (let i = 0; i < palettes.length; i++) {
      bufferOffset = buffer.writeUInt8(palettes[i++], bufferOffset) // R
      bufferOffset = buffer.writeUInt8(palettes[i++], bufferOffset) // G
      bufferOffset = buffer.writeUInt8(palettes[i++], bufferOffset) // B
      // Alpha is skipped.
    }
    chunkEnd = bufferOffset
    bufferOffset = buffer.writeUInt32BE(crc32('CRC-32', buffer.slice(chunkStart, chunkEnd)), bufferOffset)
    out = Buffer.concat([out, buffer])
    // Write tRNS
    palettesSize = palettes.length/4
    buffer = Buffer.alloc(12 + palettesSize), bufferOffset = 0
    bufferOffset = buffer.writeUInt32BE(palettesSize, bufferOffset)
    chunkStart = bufferOffset
    bufferOffset += buffer.write('tRNS', bufferOffset, 'latin1')
    for (let i = 3; i < palettes.length; i += 4) {
      bufferOffset = buffer.writeUInt8(palettes[i], bufferOffset) // A
    }
    chunkEnd = bufferOffset
    bufferOffset = buffer.writeUInt32BE(crc32('CRC-32', buffer.slice(chunkStart, chunkEnd)), bufferOffset)
    out = Buffer.concat([out, buffer])
    // Build our deflate data
    let data = Buffer.alloc(pixels.length + height)
    let dataOffset = 0
    for (let i = 0; i < height; i++) {
      dataOffset = data.writeUInt8(0, dataOffset) // No Filter
      for (let j = 0, end = width; j < end; j++) {
        dataOffset = data.writeUInt8(pixels[i*width+j], dataOffset)
      }
    }
    let deflatedData = await deflateAsync(data)
    // Write IDAT // Our DEFLATE and 0->raw scanline data
    buffer = Buffer.alloc(8), bufferOffset = 0
    bufferOffset = buffer.writeUInt32BE(deflatedData.length, bufferOffset)
    chunkStart = bufferOffset
    bufferOffset += buffer.write('IDAT', bufferOffset, 'latin1')
    buffer = Buffer.concat([buffer, deflatedData, Buffer.alloc(4)])
    bufferOffset = bufferOffset + deflatedData.length
    chunkEnd = bufferOffset
    bufferOffset = buffer.writeUInt32BE(crc32('CRC-32', buffer.slice(chunkStart, chunkEnd)), bufferOffset)
    out = Buffer.concat([out, buffer])
    // Write IEND
    buffer = Buffer.alloc(12), bufferOffset = 0
    bufferOffset = buffer.writeUInt32BE(0, bufferOffset)
    chunkStart = bufferOffset
    bufferOffset += buffer.write('IEND', bufferOffset, 'latin1')
    chunkEnd = bufferOffset
    bufferOffset = buffer.writeUInt32BE(crc32('CRC-32', buffer.slice(chunkStart, chunkEnd)), bufferOffset)
    out = Buffer.concat([out, buffer])*/
  }
}