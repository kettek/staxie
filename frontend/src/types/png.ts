import { unzlibSync } from 'fflate'

const range = (left, right, inclusive) => {
  let range = []
  let ascending = left < right
  let end = !inclusive ? right : ascending ? right + 1 : right - 1

  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i)
  }

  return range
}

export type StaxSlice = {
  shading: number
  x: number
  y: number
}

export type StaxFrame = {
  slices: StaxSlice[]
}

export type StaxAnimation = {
  name: string
  frames: StaxFrame[]
  frameTime: number
}

export type StaxStack = {
  animations: StaxAnimation[]
  name: string
  sliceCount: number
}

export class IndexedPNG {
  private data: Uint8Array
  private pos: number

  private palette: number[]
  private imgData: Uint8Array
  private transparency: { indexed?: number[]; grayscale?: number; rgb?: number[] }
  private text: { [key: string]: string }

  public width: number
  public height: number
  private bits: number
  public colorType: number
  private compressionMethod: number
  private filterMethod: number
  private interlaceMethod: number

  private colors: number
  private hasAlphaChannel: boolean
  public pixelBitlength: number
  private colorSpace: string

  public decodedPalette: Uint8Array
  public decodedPixels: Uint8Array

  public frameWidth: number
  public frameHeight: number
  public stacks: StaxStack[]

  public otherChunks: Uint8Array[]

  constructor(data?: Uint8Array) {
    if (data) {
      this.data = data
      this.pos = 8 // Skip the default header
    }

    this.palette = []
    this.otherChunks = []
    this.transparency = {}
    this.text = {}

    if (data) {
      this.process()
    }
  }

  clone(): IndexedPNG {
    return new IndexedPNG(this.data)
  }

  process() {
    const imgDataBuf = []
    let i: number
    while (true) {
      let end: number
      const chunkSize = this.readUInt32()
      const section = (() => {
        const result = []
        for (i = 0; i < 4; i++) {
          result.push(String.fromCharCode(this.data[this.pos++]))
        }
        return result
      })().join('')

      switch (section) {
        case 'IHDR':
          // we can grab  interesting values from here (like width, height, etc)
          this.width = this.readUInt32()
          this.height = this.readUInt32()
          this.bits = this.data[this.pos++]
          this.colorType = this.data[this.pos++]
          this.compressionMethod = this.data[this.pos++]
          this.filterMethod = this.data[this.pos++]
          this.interlaceMethod = this.data[this.pos++]
          break

        case 'PLTE':
          this.palette = this.read(chunkSize)
          break

        case 'IDAT':
          for (i = 0, end = chunkSize; i < end; i++) {
            imgDataBuf.push(this.data[this.pos++])
          }
          break

        case 'tRNS':
          // This chunk can only occur once and it must occur after the
          // PLTE chunk and before the IDAT chunk.
          this.transparency = {}
          switch (this.colorType) {
            case 3:
              // Indexed color, RGB. Each byte in this chunk is an alpha for
              // the palette index in the PLTE ("palette") chunk up until the
              // last non-opaque entry. Set up an array, stretching over all
              // palette entries which will be 0 (opaque) or 1 (transparent).
              this.transparency.indexed = this.read(chunkSize)
              //var short = 255 - this.transparency.indexed.length;
              var short = this.transparency.indexed.length - 1
              if (short > 0) {
                var asc: boolean
                var end1: number
                for (i = 0, end1 = short, asc = 0 <= end1; asc ? i < end1 : i > end1; asc ? i++ : i--) {
                  this.transparency.indexed.push(255)
                }
              }
              break
            case 0:
              // Greyscale. Corresponding to entries in the PLTE chunk.
              // Grey is two bytes, range 0 .. (2 ^ bit-depth) - 1
              this.transparency.grayscale = this.read(chunkSize)[0]
              break
            case 2:
              // True color with proper alpha channel.
              this.transparency.rgb = this.read(chunkSize)
              break
          }
          break

        case 'stAx':
          // Read in our special stAx chunk.
          const version = this.data[this.pos++]
          if (version !== 0) {
            throw new Error(`stAx version is ${version}, expected 0`)
          }
          const frameWidth = this.readUInt16()
          const frameHeight = this.readUInt16()
          const stackCount = this.readUInt16()
          const stacks: StaxStack[] = []

          // Read stacks.
          for (let i = 0; i < stackCount; i++) {
            let stack: StaxStack = {
              name: 'missing',
              animations: [],
              sliceCount: 0,
            }
            // Read stack name.
            const nameLength = this.data[this.pos++]
            let name = ''
            for (let i = 0; i < nameLength; i++) {
              name += String.fromCharCode(this.data[this.pos++])
            }
            stack.name = name
            // Read slice count.
            const sliceCount = this.readUInt16()
            stack.sliceCount = sliceCount
            // Read animation count.
            const animationCount = this.readUInt16()
            const animations: StaxAnimation[] = []
            // Read animations.
            for (let j = 0; j < animationCount; j++) {
              let animation: StaxAnimation = {
                name: 'missing',
                frames: [],
                frameTime: 0,
              }
              const nameLength = this.data[this.pos++]
              let name = ''
              for (let i = 0; i < nameLength; i++) {
                name += String.fromCharCode(this.data[this.pos++])
              }
              animation.name = name
              const frameTime = this.readUInt32()
              animation.frameTime = frameTime
              const frameCount = this.readUInt16()
              animation.frames = []
              for (let k = 0; k < frameCount; k++) {
                let frame: StaxFrame = {
                  slices: [],
                }
                for (let l = 0; l < sliceCount; l++) {
                  let slice: StaxSlice = {
                    shading: this.data[this.pos++],
                    x: 0,
                    y: 0,
                  }
                  frame.slices.push(slice)
                }
                animation.frames.push(frame)
              }
              animations.push(animation)
            }
            stack.animations = animations
            stacks.push(stack)
          }
          this.frameWidth = frameWidth
          this.frameHeight = frameHeight
          this.stacks = stacks

          break

        case 'tEXt':
          var text = this.read(chunkSize)
          var index = text.indexOf(0)
          var key = String.fromCharCode(...Array.from(text.slice(0, index) || []))
          this.text[key] = String.fromCharCode(...Array.from(text.slice(index + 1) || []))
          break

        case 'IEND':
          // we've got everything we need!
          this.colors = (() => {
            switch (this.colorType) {
              case 0:
              case 3:
              case 4:
                return 1
              case 2:
              case 6:
                return 3
            }
          })()

          this.hasAlphaChannel = [4, 6].includes(this.colorType)
          var colors = this.colors + (this.hasAlphaChannel ? 1 : 0)
          this.pixelBitlength = this.bits * colors

          this.colorSpace = (() => {
            switch (this.colors) {
              case 1:
                return 'DeviceGray'
              case 3:
                return 'DeviceRGB'
            }
          })()

          this.imgData = new Uint8Array(imgDataBuf)
          return
          break

        default:
          // Store unhandled section to write later.
          if (section.charCodeAt(3) >= 97) {
            let ar = new Uint8Array([...section.split('').map((c) => c.charCodeAt(0)), ...this.read(chunkSize)])
            this.otherChunks.push(ar)
          } else {
            this.pos += chunkSize
          }
      }

      this.pos += 4 // Skip the CRC

      if (this.pos > this.data.length) {
        throw new Error('Incomplete or corrupt IndexedPNG file')
      }
    }
  }

  read(bytes) {
    return range(0, bytes, false).map((i) => this.data[this.pos++])
  }

  readUInt32() {
    const b1 = this.data[this.pos++] << 24
    const b2 = this.data[this.pos++] << 16
    const b3 = this.data[this.pos++] << 8
    const b4 = this.data[this.pos++]
    return b1 | b2 | b3 | b4
  }

  readUInt16() {
    const b1 = this.data[this.pos++] << 8
    const b2 = this.data[this.pos++]
    return b1 | b2
  }

  async decodePixels() {
    let data: Uint8Array
    try {
      data = unzlibSync(this.imgData)
    } catch (err) {
      throw err
    }
    const pixelBytes = this.pixelBitlength / 8
    const scanlineLength = pixelBytes * this.width

    const pixels = new Uint8Array(scanlineLength * this.height)
    const { length } = data
    let row = 0
    let pos = 0
    let c = 0

    while (pos < length) {
      var byte, col, i, left, upper
      var end
      var end1
      var end2
      var end3
      var end4
      switch (data[pos++]) {
        case 0: // None
          for (i = 0, end = scanlineLength; i < end; i++) {
            pixels[c++] = data[pos++]
          }
          break

        case 1: // Sub
          for (i = 0, end1 = scanlineLength; i < end1; i++) {
            byte = data[pos++]
            left = i < pixelBytes ? 0 : pixels[c - pixelBytes]
            pixels[c++] = (byte + left) % 256
          }
          break

        case 2: // Up
          for (i = 0, end2 = scanlineLength; i < end2; i++) {
            byte = data[pos++]
            col = (i - (i % pixelBytes)) / pixelBytes
            upper = row && pixels[(row - 1) * scanlineLength + col * pixelBytes + (i % pixelBytes)]
            pixels[c++] = (upper + byte) % 256
          }
          break

        case 3: // Average
          for (i = 0, end3 = scanlineLength; i < end3; i++) {
            byte = data[pos++]
            col = (i - (i % pixelBytes)) / pixelBytes
            left = i < pixelBytes ? 0 : pixels[c - pixelBytes]
            upper = row && pixels[(row - 1) * scanlineLength + col * pixelBytes + (i % pixelBytes)]
            pixels[c++] = (byte + Math.floor((left + upper) / 2)) % 256
          }
          break

        case 4: // Paeth
          for (i = 0, end4 = scanlineLength; i < end4; i++) {
            var paeth, upperLeft
            byte = data[pos++]
            col = (i - (i % pixelBytes)) / pixelBytes
            left = i < pixelBytes ? 0 : pixels[c - pixelBytes]

            if (row === 0) {
              upper = upperLeft = 0
            } else {
              upper = pixels[(row - 1) * scanlineLength + col * pixelBytes + (i % pixelBytes)]
              upperLeft = col && pixels[(row - 1) * scanlineLength + (col - 1) * pixelBytes + (i % pixelBytes)]
            }

            const p = left + upper - upperLeft
            const pa = Math.abs(p - left)
            const pb = Math.abs(p - upper)
            const pc = Math.abs(p - upperLeft)

            if (pa <= pb && pa <= pc) {
              paeth = left
            } else if (pb <= pc) {
              paeth = upper
            } else {
              paeth = upperLeft
            }

            pixels[c++] = (byte + paeth) % 256
          }
          break

        default:
          throw new Error(`Invalid filter algorithm: ${data[pos - 1]}`)
      }

      row++
    }

    return pixels
  }

  decodePalette() {
    const { palette } = this
    const transparency = this.transparency.indexed || []
    const ret = new Uint8Array((palette.length / 3) * 4)
    let pos = 0
    let c = 0

    for (let i = 0, end = palette.length; i < end; i += 3) {
      var left
      ret[pos++] = palette[i]
      ret[pos++] = palette[i + 1]
      ret[pos++] = palette[i + 2]
      ret[pos++] = (left = transparency[c++]) != null ? left : 255
    }

    return ret
  }

  async toPNGData(options) {
    const palette = options.palette || this.decodedPalette
    if (!this.decodedPixels) {
      await this.decode()
    }
    if (options.clip) {
      // Ensure some sane defaults
      if (options.clip.x == undefined) options.clip.x = 0
      if (options.clip.y == undefined) options.clip.y = 0
      if (options.clip.w == undefined) options.clip.w = this.width - options.clip.x
      if (options.clip.h == undefined) options.clip.h = this.height - options.clip.y
      // Now check for user errors.
      if (options.clip.x < 0 || options.clip.x >= this.width) throw new Error('clip.x is out of bounds')
      if (options.clip.y < 0 || options.clip.y >= this.height) throw new Error('clip.y is out of bounds')
      if (options.clip.w <= 0 || options.clip.w > this.width) throw new Error('clip.w is out of bounds')
      if (options.clip.h <= 0 || options.clip.h > this.height) throw new Error('clip.h is out of bounds')
      // Now we can get our clipped array.
      const pixels = new Uint8ClampedArray(options.clip.w * options.clip.h * 4)
      for (let x = 0; x < options.clip.w; x++) {
        for (let y = 0; y < options.clip.h; y++) {
          let i = (x + y * options.clip.w) * 4
          let index = this.decodedPixels[x + options.clip.x + (y + options.clip.y) * this.width] * 4
          pixels[i++] = palette[index]
          pixels[i++] = palette[index + 1]
          pixels[i++] = palette[index + 2]
          pixels[i++] = palette[index + 3]
        }
      }
      return { pixels: pixels, width: options.clip.w }
    } else {
      // Allocate RGBA buffer
      const pixels = new Uint8ClampedArray(this.decodedPixels.length * 4)
      let j = 0
      for (let i = 0; i < this.decodedPixels.length; i++) {
        let index = this.decodedPixels[i] * 4
        pixels[j++] = palette[index] // R
        pixels[j++] = palette[index + 1] // G
        pixels[j++] = palette[index + 2] // B
        pixels[j++] = palette[index + 3] // A
      }
      return { pixels: pixels, width: this.width }
    }
  }

  async toImageData(options) {
    let data = await this.toPNGData(options)
    return new ImageData(data.pixels, data.width)
  }

  async decode() {
    this.decodedPalette = this.decodePalette()
    this.decodedPixels = await this.decodePixels()
  }

  hasStax(): boolean {
    return this.stacks && this.stacks.length > 0
  }
}
