import { LoadedFile } from '../file'
import { type Undoable } from '../undo'
import { type StaxFrame, type StaxStack, type StaxSlice } from '../png'
import type { SelectionArea } from '../selection'
import type { CanvasView } from '../canvasview'
import { Canvas } from '../canvas'

export class PixelPlaceUndoable implements Undoable<LoadedFile> {
  x: number
  y: number
  oldIndex: number
  newIndex: number
  constructor(x: number, y: number, oldIndex: number, newIndex: number) {
    this.x = x
    this.y = y
    this.oldIndex = oldIndex
    this.newIndex = newIndex
  }
  apply(file: LoadedFile) {
    file.canvas.setPixel(this.x, this.y, this.newIndex)
  }
  unapply(file: LoadedFile) {
    file.canvas.setPixel(this.x, this.y, this.oldIndex)
  }
  clone(): PixelPlaceUndoable {
    return new PixelPlaceUndoable(this.x, this.y, this.oldIndex, this.newIndex)
  }
}

export class PixelsPlaceUndoable implements Undoable<LoadedFile> {
  private oldPixels: { x: number; y: number; index: number }[]
  public pixels: { x: number; y: number; index: number }[]
  constructor(pixels: { x: number; y: number; index: number }[]) {
    this.oldPixels = []
    this.pixels = pixels
  }
  apply(file: LoadedFile) {
    for (let pixel of this.pixels) {
      let p = file.canvas.getPixel(pixel.x, pixel.y)
      this.oldPixels.push({ x: pixel.x, y: pixel.y, index: p })
    }
    for (let pixel of this.pixels) {
      file.canvas.setPixel(pixel.x, pixel.y, pixel.index)
    }
  }
  unapply(file: LoadedFile) {
    for (let pixel of this.oldPixels) {
      file.canvas.setPixel(pixel.x, pixel.y, pixel.index)
    }
  }
  clone(): PixelsPlaceUndoable {
    return new PixelsPlaceUndoable(this.pixels)
  }
}

export class PixelsFlipUndoable implements Undoable<LoadedFile> {
  private flippedPixels: { x: number; y: number; index: number }[] = []
  private oldPixels: { x: number; y: number; index: number }[]
  private selection: SelectionArea
  private view: CanvasView
  private vertical: boolean = false
  constructor(vertical: boolean, selection: SelectionArea, view: CanvasView) {
    this.oldPixels = []
    this.selection = selection
    this.view = view
    this.vertical = vertical
  }
  apply(file: LoadedFile) {
    let minX = this.view.x
    let minY = this.view.y
    let maxX = this.view.x + this.view.width + 1
    let maxY = this.view.y + this.view.height + 1
    if (this.selection.active) {
      const { x1, y1, x2, y2 } = this.selection.minmax()
      minX = x1
      minY = y1
      maxX = x2
      maxY = y2
    }

    // Collect our pixels.
    if (!this.oldPixels.length) {
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          this.oldPixels.push({ x, y, index: file.canvas.getPixel(x, y) })
        }
      }
    }
    //
    this.flippedPixels = []
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (!this.selection.isPixelMarked(x, y)) continue
        let px = x
        let py = y
        // Flip in place.
        if (this.vertical) {
          py = minY + maxY - y
        } else {
          px = minX + maxX - x
        }

        this.flippedPixels.push({ x: px, y: py, index: file.canvas.getPixel(x, y) })
      }
    }
    for (let pixel of this.flippedPixels) {
      file.canvas.setPixel(pixel.x, pixel.y, pixel.index)
    }
  }
  unapply(t: LoadedFile): void {
    for (let pixel of this.flippedPixels) {
      t.canvas.setPixel(pixel.x, pixel.y, 0)
    }
    for (let pixel of this.oldPixels) {
      t.canvas.setPixel(pixel.x, pixel.y, pixel.index)
    }
  }
}

export class PixelsRotateUndoable implements Undoable<LoadedFile> {
  private clockwise: boolean
  private selection: SelectionArea
  private view: CanvasView
  private oldPixels: { x: number; y: number; index: number }[] = []
  private rotatedPixels: { x: number; y: number; index: number }[] = []
  constructor(clockwise: boolean, selection: SelectionArea, view: CanvasView) {
    this.clockwise = clockwise
    this.selection = selection
    this.view = view
  }
  apply(file: LoadedFile): void {
    let minX = this.view.x
    let minY = this.view.y
    let maxX = this.view.x + this.view.width + 1
    let maxY = this.view.y + this.view.height + 1
    if (this.selection.active) {
      const { x1, y1, x2, y2 } = this.selection.minmax()
      minX = x1
      minY = y1
      maxX = x2
      maxY = y2
    }

    // Collect our pixels.
    let shouldCollect = !this.oldPixels.length

    this.rotatedPixels = []
    const centerX = (maxX - minX) / 2
    const centerY = (maxY - minY) / 2
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (!this.selection.isPixelMarked(x, y)) continue
        let px = x
        let py = y
        px -= minX
        py -= minY
        px -= centerX
        py -= centerY

        if (this.clockwise) {
          let temp = px
          px = -py
          py = temp
        } else {
          let temp = px
          px = py
          py = -temp
        }

        px += centerX
        py += centerY
        px += minX
        py += minY

        px = Math.round(px)
        py = Math.round(py)

        if (shouldCollect) {
          this.oldPixels.push({ x: x, y: y, index: file.canvas.getPixel(x, y) })
          this.oldPixels.push({ x: px, y: py, index: file.canvas.getPixel(px, py) })
        }
        this.rotatedPixels.push({ x: px, y: py, index: file.canvas.getPixel(x, y) })
      }
    }

    // Out with the old.
    for (const pixel of this.oldPixels) {
      file.canvas.setPixel(pixel.x, pixel.y, 0)
    }

    // In with the new.
    for (const pixel of this.rotatedPixels) {
      file.canvas.setPixel(pixel.x, pixel.y, pixel.index)
    }
  }
  unapply(file: LoadedFile): void {
    for (let pixel of this.oldPixels) {
      file.canvas.setPixel(pixel.x, pixel.y, pixel.index)
    }
  }
}

export class SelectionSetUndoable implements Undoable<LoadedFile> {
  private oldPixels: { x: number; y: number; marked: boolean }[] = []
  public pixels: { x: number; y: number; marked: boolean }[]
  private clear: boolean

  constructor(pixels: { x: number; y: number; marked: boolean }[], clear: boolean) {
    this.pixels = pixels
    this.clear = clear
  }
  apply(file: LoadedFile) {
    if (!this.oldPixels) {
      this.oldPixels = []
      for (let y = 0; y < file.selection.pixelMaskCanvasPixels.height; y++) {
        for (let x = 0; x < file.selection.pixelMaskCanvasPixels.width; x++) {
          this.oldPixels.push({
            x,
            y,
            marked: file.selection.pixelMaskCanvasPixels.data[(y * file.selection.pixelMaskCanvasPixels.width + x) * 4 + 3] !== 0,
          })
        }
      }
    }
    if (this.clear) {
      file.selection.clear()
    }
    for (let pixel of this.pixels) {
      file.selection.setPixel(pixel.x, pixel.y, pixel.marked)
    }
  }
  unapply(file: LoadedFile) {
    for (let pixel of this.oldPixels) {
      file.selection.setPixel(pixel.x, pixel.y, pixel.marked)
    }
  }
  clone(): SelectionSetUndoable {
    return new SelectionSetUndoable(this.pixels, this.clear)
  }
}

export class SelectionMoveUndoable implements Undoable<LoadedFile> {
  private oldPixels: { x: number; y: number; marked: boolean }[] = []

  private dx: number
  private dy: number

  constructor(dx: number, dy: number) {
    this.dx = dx
    this.dy = dy
  }
  apply(file: LoadedFile) {
    if (!this.oldPixels) {
      this.oldPixels = []
      for (let y = 0; y < file.selection.pixelMaskCanvasPixels.height; y++) {
        for (let x = 0; x < file.selection.pixelMaskCanvasPixels.width; x++) {
          this.oldPixels.push({
            x,
            y,
            marked: file.selection.pixelMaskCanvasPixels.data[(y * file.selection.pixelMaskCanvasPixels.width + x) * 4 + 3] !== 0,
          })
        }
      }
    }
    // FIXME: We _must_ store the selection as part of the undoable state!
    file.selection.move(this.dx, this.dy)
  }
  unapply(file: LoadedFile) {
    // FIXME: We _must_ store the selection as part of the undoable state!
    file.selection.clear()
    for (let pixel of this.oldPixels) {
      file.selection.setPixel(pixel.x, pixel.y, pixel.marked)
    }
  }
  clone(): SelectionMoveUndoable {
    return new SelectionMoveUndoable(this.dx, this.dy)
  }
}

export class SelectionClearUndoable implements Undoable<LoadedFile> {
  private oldPixels: { x: number; y: number; marked: boolean }[]
  private oldActive: boolean = false
  constructor() {
    this.oldPixels = []
  }
  apply(file: LoadedFile) {
    this.oldActive = file.selection.active
    for (let y = 0; y < file.selection.pixelMaskCanvasPixels.height; y++) {
      for (let x = 0; x < file.selection.pixelMaskCanvasPixels.width; x++) {
        this.oldPixels.push({
          x,
          y,
          marked: file.selection.pixelMaskCanvasPixels.data[(y * file.selection.pixelMaskCanvasPixels.width + x) * 4 + 3] !== 0,
        })
      }
    }
    file.selection.clear()
    file.selection.active = false
  }
  unapply(file: LoadedFile) {
    for (let pixel of this.oldPixels) {
      file.selection.setPixel(pixel.x, pixel.y, pixel.marked)
    }
    file.selection.active = this.oldActive
  }
  clone(): SelectionClearUndoable {
    return new SelectionClearUndoable()
  }
}

export class SelectionReplacePixelIndicesUndoable implements Undoable<LoadedFile> {
  private oldPixels: { x: number; y: number; index: number }[] = []
  private newPixels: { x: number; y: number }[]
  private oldIndex: number
  private newIndex: number
  constructor(pixels: { x: number; y: number }[], oldIndex: number, newIndex: number) {
    this.newPixels = pixels
    this.oldIndex = oldIndex
    this.newIndex = newIndex
  }
  apply(file: LoadedFile) {
    if (this.newPixels.length === 0) {
      for (let x = 0; x < file.canvas.width; x++) {
        for (let y = 0; y < file.canvas.height; y++) {
          if (file.canvas.getPixel(x, y) === this.oldIndex) {
            this.oldPixels.push({ x, y, index: this.oldIndex })
            file.canvas.setPixel(x, y, this.newIndex)
          }
        }
      }
    } else {
      for (let pixel of this.newPixels) {
        if (file.canvas.getPixel(pixel.x, pixel.y) === this.oldIndex) {
          this.oldPixels.push({ x: pixel.x, y: pixel.y, index: this.oldIndex })
          file.canvas.setPixel(pixel.x, pixel.y, this.newIndex)
        }
      }
    }
  }
  unapply(file: LoadedFile) {
    for (let pixel of this.oldPixels) {
      file.canvas.setPixel(pixel.x, pixel.y, pixel.index)
    }
    this.oldPixels = []
  }
  clone(): SelectionReplacePixelIndicesUndoable {
    return new SelectionReplacePixelIndicesUndoable(this.newPixels, this.oldIndex, this.newIndex)
  }
}

export class ReplacePaletteUndoable implements Undoable<LoadedFile> {
  private oldPalette: Uint32Array = new Uint32Array([])
  private newPalette: Uint32Array
  constructor(newPalette: Uint32Array) {
    this.newPalette = newPalette
  }
  apply(file: LoadedFile) {
    this.oldPalette = new Uint32Array([...file.canvas.palette])
    file.canvas.palette = this.newPalette
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  unapply(file: LoadedFile) {
    file.canvas.palette = this.oldPalette
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
}

export class ReplaceSwatchUndoable implements Undoable<LoadedFile> {
  private index: number

  private red: number
  private green: number
  private blue: number
  private alpha: number

  private oldRed: number = 0
  private oldGreen: number = 0
  private oldBlue: number = 0
  private oldAlpha: number = 0

  constructor(index: number, red: number, green: number, blue: number, alpha: number) {
    this.index = index
    this.red = red
    this.green = green
    this.blue = blue
    this.alpha = alpha
  }
  apply(file: LoadedFile) {
    let r = file.canvas.palette[this.index] & 0xff
    let g = (file.canvas.palette[this.index] >> 8) & 0xff
    let b = (file.canvas.palette[this.index] >> 16) & 0xff
    let a = (file.canvas.palette[this.index] >> 24) & 0xff
    this.oldRed = r
    this.oldGreen = g
    this.oldBlue = b
    this.oldAlpha = a
    file.canvas.replacePaletteColor(this.index, this.red, this.green, this.blue, this.alpha)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  unapply(file: LoadedFile) {
    file.canvas.replacePaletteColor(this.index, this.oldRed, this.oldGreen, this.oldBlue, this.oldAlpha)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
}

export class AddSwatchUndoable implements Undoable<LoadedFile> {
  private red: number
  private green: number
  private blue: number
  private alpha: number
  constructor(red: number, green: number, blue: number, alpha: number) {
    this.red = red
    this.green = green
    this.blue = blue
    this.alpha = alpha
  }
  apply(file: LoadedFile) {
    file.canvas.addNewPaletteColor(this.red, this.green, this.blue, this.alpha)
  }
  unapply(file: LoadedFile) {
    file.canvas.removePaletteIndex(-1)
  }
}

export class DuplicateSwatchUndoable implements Undoable<LoadedFile> {
  private index: number
  constructor(index: number) {
    this.index = index
  }
  apply(file: LoadedFile) {
    let r = file.canvas.palette[this.index] & 0xff
    let g = (file.canvas.palette[this.index] >> 8) & 0xff
    let b = (file.canvas.palette[this.index] >> 16) & 0xff
    let a = (file.canvas.palette[this.index] >> 24) & 0xff
    file.canvas.insertPaletteColor(this.index, r, g, b, a, true)
  }
  unapply(t: LoadedFile): void {
    t.canvas.removePaletteIndex(this.index, true)
  }
}

export class RemoveSwatchUndoable implements Undoable<LoadedFile> {
  private index: number
  private replaceIndex: number = -1
  private shiftPixels: boolean = false

  private oldRed: number = 0
  private oldGreen: number = 0
  private oldBlue: number = 0
  private oldAlpha: number = 0

  private oldPixels: { x: number; y: number; index: number }[]

  constructor(index: number, replaceIndex?: number, shiftPixels?: boolean) {
    this.index = index
    if (replaceIndex !== undefined) {
      this.replaceIndex = replaceIndex
    }
    if (shiftPixels !== undefined) {
      this.shiftPixels = shiftPixels
    }
    this.oldPixels = []
  }
  apply(file: LoadedFile) {
    let r = file.canvas.palette[this.index] & 0xff
    let g = (file.canvas.palette[this.index] >> 8) & 0xff
    let b = (file.canvas.palette[this.index] >> 16) & 0xff
    let a = (file.canvas.palette[this.index] >> 24) & 0xff
    this.oldRed = r
    this.oldGreen = g
    this.oldBlue = b
    this.oldAlpha = a

    if (this.replaceIndex >= 0) {
      // Collect our pixels as we replace them so we can undo them.
      for (let y = 0; y < file.canvas.height; y++) {
        for (let x = 0; x < file.canvas.width; x++) {
          let p = file.canvas.getPixel(x, y)
          if (p === this.index) {
            this.oldPixels.push({ x, y, index: p })
            file.canvas.setPixel(x, y, this.replaceIndex)
          }
        }
      }
    }

    file.canvas.removePaletteIndex(this.index, this.shiftPixels)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  unapply(file: LoadedFile) {
    file.canvas.insertPaletteColor(this.index, this.oldRed, this.oldGreen, this.oldBlue, this.oldAlpha, this.shiftPixels)

    if (this.replaceIndex >= 0) {
      for (let pixel of this.oldPixels) {
        file.canvas.setPixel(pixel.x, pixel.y, pixel.index)
      }
    }
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
}

export class SwapSwatchUndoable implements Undoable<LoadedFile> {
  private index1: number
  private index2: number
  private updatePixels: boolean
  constructor(index1: number, index2: number, updatePixels: boolean = true) {
    this.index1 = index1
    this.index2 = index2
    this.updatePixels = updatePixels
  }
  apply(file: LoadedFile) {
    if (this.updatePixels) {
      for (let y = 0; y < file.canvas.height; y++) {
        for (let x = 0; x < file.canvas.width; x++) {
          let p = file.canvas.getPixel(x, y)
          if (p === this.index1) {
            file.canvas.setPixel(x, y, this.index2)
          } else if (p === this.index2) {
            file.canvas.setPixel(x, y, this.index1)
          }
        }
      }
    }
    file.canvas.swapPaletteColors(this.index1, this.index2)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  unapply(file: LoadedFile) {
    if (this.updatePixels) {
      for (let y = 0; y < file.canvas.height; y++) {
        for (let x = 0; x < file.canvas.width; x++) {
          let p = file.canvas.getPixel(x, y)
          if (p === this.index1) {
            file.canvas.setPixel(x, y, this.index2)
          } else if (p === this.index2) {
            file.canvas.setPixel(x, y, this.index1)
          }
        }
      }
    }
    file.canvas.swapPaletteColors(this.index2, this.index1)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
}

export class MoveSwatchUndoable implements Undoable<LoadedFile> {
  private index: number
  private newIndex: number
  private updatePixels: boolean
  private oldPixels: { x: number; y: number; index: number }[] = []
  constructor(index: number, newIndex: number, updatePixels: boolean = true) {
    this.index = index
    this.newIndex = newIndex
    this.updatePixels = updatePixels
  }
  apply(file: LoadedFile) {
    if (this.updatePixels) {
      for (let y = 0; y < file.canvas.height; y++) {
        for (let x = 0; x < file.canvas.width; x++) {
          let p = file.canvas.getPixel(x, y)
          if (p >= this.newIndex && p < this.index) {
            file.canvas.setPixel(x, y, p + 1)
          } else if (p === this.index) {
            file.canvas.setPixel(x, y, this.newIndex)
          }
        }
      }
    }

    file.canvas.movePaletteColor(this.index, this.newIndex)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  unapply(file: LoadedFile) {
    if (this.updatePixels) {
      for (let y = 0; y < file.canvas.height; y++) {
        for (let x = 0; x < file.canvas.width; x++) {
          let p = file.canvas.getPixel(x, y)
          if (p === this.newIndex) {
            file.canvas.setPixel(x, y, this.index)
          } else if (p > this.newIndex && p <= this.index) {
            file.canvas.setPixel(x, y, p - 1)
          }
        }
      }
    }

    file.canvas.movePaletteColor(this.newIndex, this.index)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
}

export class ChangeColorModeUndoable implements Undoable<LoadedFile> {
  private newIndexed: boolean
  private oldIndexed: boolean = false
  constructor(value: boolean) {
    this.newIndexed = value
  }
  apply(file: LoadedFile) {
    this.oldIndexed = file.canvas.isIndexed
    file.canvas.isIndexed = this.newIndexed
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  unapply(t: LoadedFile): void {
    t.canvas.isIndexed = this.oldIndexed
    t.canvas.refreshImageData()
    t.canvas.refreshCanvas()
  }
}

export class ChangeFrameTimeUndoable implements Undoable<LoadedFile> {
  private stack: string
  private animation: string
  private frameTime: number
  private previousFrameTime: number = 100
  constructor(stack: string, animation: string, frameTime: number) {
    this.stack = stack
    this.animation = animation
    this.frameTime = frameTime
  }
  apply(file: LoadedFile) {
    let a = file.getAnimation(this.stack, this.animation)
    if (a) {
      this.previousFrameTime = a.frameTime
      a.frameTime = this.frameTime
    }
  }
  unapply(file: LoadedFile) {
    let a = file.getAnimation(this.stack, this.animation)
    if (a) {
      a.frameTime = this.previousFrameTime
    }
  }
}

/** BEGIN STAX-RELATED CANVAS RESIZE TYPE Undoables */
export class ResizeSlicesUndoable implements Undoable<LoadedFile> {
  private oldWidth: number = -1
  private newWidth: number
  private oldHeight: number = -1
  private newHeight: number
  private oldCanvas: Canvas = new Canvas(1, 1)
  constructor(width: number, height: number) {
    this.newWidth = width
    this.newHeight = height
  }
  apply(file: LoadedFile) {
    this.oldWidth = file.frameWidth
    this.oldHeight = file.frameHeight

    const widthRatio = this.newWidth / this.oldWidth
    const heightRatio = this.newHeight / this.oldHeight

    // Save the whole canvas.
    this.oldCanvas = Canvas.clone(file.canvas)

    // Resize the canvas.
    const newWidth = Math.round(file.canvas.width * widthRatio)
    const newHeight = Math.round(file.canvas.height * heightRatio)
    file.canvas.resizeCanvas(newWidth, newHeight)

    // Clear the whole canvas.
    file.canvas.clear()
    file.canvas.refreshCanvas()
    file.canvas.refreshImageData()

    file.frameWidth = this.newWidth
    file.frameHeight = this.newHeight

    for (let stack of file.stacks) {
      for (let animation of stack.animations) {
        for (let frame of animation.frames) {
          for (let slice of frame.slices) {
            let maxWidth = Math.min(this.oldWidth, this.newWidth)
            let maxHeight = Math.min(this.oldHeight, this.newHeight)

            // Get old pixels.
            const oldSlicePixels = this.oldCanvas.getPixels(slice.x, slice.y, this.oldWidth, this.oldHeight)
            // Get space for new pixels.
            const newSlicePixels = new Uint8Array(this.newWidth * this.newHeight)

            // Copy them pixels over, ensuring bounds and centering.
            const offsetX = this.oldWidth > this.newWidth ? Math.round((maxWidth - this.oldWidth) / 2) : Math.round((this.newWidth - this.oldWidth) / 2)
            const offsetY = this.oldHeight > this.newHeight ? Math.round((maxHeight - this.oldHeight) / 2) : Math.round((this.newHeight - this.oldHeight) / 2)
            for (let y = 0; y < this.oldHeight; y++) {
              for (let x = 0; x < this.oldWidth; x++) {
                const newX = x + offsetX
                const newY = y + offsetY
                if (newX >= 0 && newX < this.newWidth && newY >= 0 && newY < this.newHeight) {
                  newSlicePixels[newY * this.newWidth + newX] = oldSlicePixels[y * this.oldWidth + x]
                }
              }
            }
            file.canvas.setPixels(Math.round(slice.x * widthRatio), Math.round(slice.y * heightRatio), this.newWidth, this.newHeight, newSlicePixels, true)
          }
        }
      }
    }
    file.canvas.refreshImageData()
    file.cacheSlicePositions()
  }
  unapply(file: LoadedFile) {
    // Resize the canvas back to the old size.
    file.canvas.resizeCanvas(this.oldCanvas.width, this.oldCanvas.height)

    // Copy over the old canvas.
    file.canvas.setPixels(0, 0, this.oldCanvas.width, this.oldCanvas.height, this.oldCanvas.pixels)

    // Update the frame width and height.
    file.frameWidth = this.oldWidth
    file.frameHeight = this.oldHeight

    // Update the slice positions.
    file.cacheSlicePositions()
  }
}

export class AddStackUndoable implements Undoable<LoadedFile> {
  private stack: string = ''
  constructor() { }
  apply(file: LoadedFile) {
    let name = 'stack 0'
    for (let count = 0; file.stacks.find((g) => g.name === name); name = `stack ${count++}`) { }
    this.stack = name
    file.stacks.push({
      name: this.stack,
      animations: [
        {
          name: 'animation',
          frameTime: 100,
          frames: [
            {
              slices: Array.from({ length: 1 }, (_) => ({
                shading: 1,
                x: 0,
                y: 0,
              })),
            },
          ],
        },
      ],
      sliceCount: 1,
    })
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.

    // Grow our canvas by 1 frameHeight
    let { x, y, width, height } = file.getStackArea(this.stack)
    let newHeight = file.canvas.height + height
    let fullWidth = Math.max(file.canvas.width, width)

    // Grow our canvas.
    file.canvas.resizeCanvas(fullWidth, newHeight)

    // Shift all pixels all the pixels after stack's Y down.
    let followingPixelsHeight = file.canvas.height - (y + height)
    if (followingPixelsHeight > 0) {
      let pixels = file.canvas.getPixels(x, y, fullWidth, followingPixelsHeight)
      file.canvas.setPixels(x, y + height, fullWidth, followingPixelsHeight, pixels)
    }

    // Clear our new area.
    file.canvas.clearPixels(x, y, fullWidth, height)
  }
  unapply(file: LoadedFile) {
    let { x, y, width, height } = file.getStackArea(this.stack)
    let newHeight = file.canvas.height - height
    let fullWidth = Math.max(file.canvas.width, width)

    // Shift all our pixels back up.
    let followingPixelsHeight = file.canvas.height - (y + height)
    if (followingPixelsHeight > 0) {
      let pixels = file.canvas.getPixels(x, y + height, fullWidth, followingPixelsHeight)
      file.canvas.setPixels(x, y, fullWidth, followingPixelsHeight, pixels)
    }

    // Shrink canvas.
    file.canvas.resizeCanvas(fullWidth, newHeight)

    // Iterate from end to beginning, as we add stacks to the end.
    for (let i = file.stacks.length - 1; i >= 0; i--) {
      if (file.stacks[i].name === this.stack) {
        file.stacks.splice(i, 1)
        break
      }
    }
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class RemoveStackUndoable implements Undoable<LoadedFile> {
  private stackName: string
  private stack: StaxStack
  private stackIndex: number
  private x: number
  private y: number
  private width: number
  private height: number
  private fromY: number
  private fromHeight: number
  private pixels: Uint8Array
  constructor(stackName: string) {
    this.stackName = stackName
  }
  apply(file: LoadedFile) {
    this.stackIndex = file.stacks.findIndex((g) => g.name === this.stackName)
    if (this.stackIndex === -1) {
      throw new Error('stack not found: ' + this.stackName)
    }
    this.stack = file.stacks[this.stackIndex]
    // Get our stack's total width/height, store the pixels, clear the area, then shift all pixels below this stack to its position. Shrink the canvas by height.
    // Get and clear area.
    let { x, y, width, height } = file.getStackArea(this.stackName) // FIXME: This can be cached.
    if (width === 0 || height === 0) return // Do nothing if empty.
    let pixels = file.canvas.getPixels(x, y, width, height)
    file.canvas.clearPixels(x, y, width, height)
    // Shift up.
    let fromX = 0
    let fromY = y + height
    let fromWidth = file.canvas.width
    let fromHeight = file.canvas.height - fromY
    let fromPixels = file.canvas.getPixels(fromX, fromY, fromWidth, fromHeight)
    file.canvas.setPixels(x, y, fromWidth, fromHeight, fromPixels)
    // Store.
    this.pixels = pixels
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.fromY = fromY
    this.fromHeight = fromHeight
    // Shrink.
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - height)
    file.stacks.splice(this.stackIndex, 1)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    file.stacks.splice(this.stackIndex, 0, this.stack)
    // Grow our canvas by pixel width/height, shift all pixels below position + height down by height, then paste the pixels back in.
    // Grow canvas.
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height + this.height)
    // Get and shift previously shifted pixels back down.
    let pixels = file.canvas.getPixels(this.x, this.y, file.canvas.width, this.fromHeight)
    file.canvas.setPixels(this.x, this.y + this.height, file.canvas.width, this.fromHeight, pixels)
    // Restore old pixels.
    file.canvas.setPixels(this.x, this.y, this.width, this.height, this.pixels)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class MoveStackUndoable implements Undoable<LoadedFile> {
  private stack: string
  private oldIndex: number
  private newIndex: number
  constructor(stack: string, oldIndex: number, newIndex: number) { }
  apply(file: LoadedFile) {
    // TODO: Lazymode -- get our pixels for our stacks between our two move stacks, get our pixels for our first and second move stack, clear pixels from first through second, then paste the pixels for our from to our to position, our to to our end position -to's height, then paste the between pixels between the two.
  }
  unapply(file: LoadedFile) {
    // TODO: Part of above lazy mode, clear out old pixels, then position to, from, and between pixels.
  }
}

export class RenameStackUndoable implements Undoable<LoadedFile> {
  private stack: string
  private oldName: string = ''
  private newName: string
  constructor(stack: string, newName: string) {
    this.stack = stack
    this.newName = newName
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find((g) => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    this.oldName = g.name
    g.name = this.newName
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find((g) => g.name === this.newName)
    if (!g) {
      throw new Error('stack not found: ' + this.newName)
    }
    g.name = this.oldName
  }
}

export class DuplicateStackUndoable implements Undoable<LoadedFile> {
  private stack: string
  private name: string = ''
  private stackX: number = -1
  private stackY: number = -1
  private stackWidth: number = -1
  private stackHeight: number = -1
  constructor(stack: string) {
    this.stack = stack
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find((g) => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    let name = this.stack + ' copy'
    for (let count = 0; file.stacks.find((g) => g.name === name); name = `${this.stack} copy ${count++}`) { }
    this.name = name

    let { x, y, width, height } = file.getStackArea(this.stack)
    this.stackX = x
    this.stackY = y
    this.stackWidth = file.canvas.width
    this.stackHeight = height

    // 1. Get pixels to copy
    let stackPixels = file.canvas.getPixels(x, y, file.canvas.width, height)
    // 2. Resize canvas
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height + height)
    // 3. Shift all pixels after stack area down by stack area's height*2
    let pixels = file.canvas.getPixels(x, y + height, file.canvas.width, file.canvas.height - (y + height))
    file.canvas.setPixels(x, y + height * 2, file.canvas.width, file.canvas.height - (y + height), pixels)
    // 4. Set pixels at stack area + stack area height to stored
    file.canvas.setPixels(x, y + height, file.canvas.width, height, stackPixels)
    // 5. Update data structure
    file.stacks.splice(file.stacks.findIndex((g) => g.name === this.stack) + 1, 0, {
      name,
      animations: JSON.parse(JSON.stringify(g.animations)),
      sliceCount: g.sliceCount,
    })
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile): void {
    let g = file.stacks.find((g) => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    // 1. Shift all pixels after stack area up by stack area's height
    let pixels = file.canvas.getPixels(this.stackX, this.stackY + this.stackHeight * 2, this.stackWidth, file.canvas.height - (this.stackY + this.stackHeight))
    file.canvas.setPixels(this.stackX, this.stackY + this.stackHeight, this.stackWidth, file.canvas.height - (this.stackY + this.stackHeight), pixels)
    // 2. Resize canvas
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - this.stackHeight)
    // 3. Update data structure
    file.stacks.splice(
      file.stacks.findIndex((g) => g.name === this.name),
      1,
    )
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class GrowStackSliceUndoable implements Undoable<LoadedFile> {
  private stack: string
  private sliceCount: number
  constructor(stack: string, sliceCount: number) {
    this.stack = stack
    this.sliceCount = sliceCount
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find((g) => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }

    let sliceCount = g.sliceCount + this.sliceCount
    let newWidth = sliceCount * file.frameWidth
    if (file.canvas.width < newWidth) {
      file.canvas.resizeCanvas(newWidth, file.canvas.height)
    }
    for (let s = g.sliceCount; s < sliceCount; s++) {
      for (let a of g.animations) {
        for (let f of a.frames) {
          f.slices.push({ shading: 1, x: 0, y: 0 })
        }
      }
    }
    g.sliceCount = sliceCount
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    // Reverse of above.
    let g = file.stacks.find((g) => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }

    for (let s = g.sliceCount - 1; s >= g.sliceCount - this.sliceCount; s--) {
      for (let a of g.animations) {
        for (let f of a.frames) {
          f.slices.pop()
        }
      }
    }
    let sliceCount = g.sliceCount - this.sliceCount
    let targetWidth = sliceCount * file.frameWidth
    g.sliceCount = sliceCount
    for (let stack of file.stacks) {
      targetWidth = Math.max(targetWidth, stack.sliceCount * file.frameWidth)
    }
    // Shrink the canvas if no stacks are wider than our changing stack.
    if (file.canvas.width > targetWidth) {
      file.canvas.resizeCanvas(targetWidth, file.canvas.height)
    }
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class ShrinkStackSliceUndoable implements Undoable<LoadedFile> {
  private stack: string
  private sliceCount: number
  private slices: StaxSlice[][][]
  private pixels: Uint8Array
  private pixelsWidth: number
  private pixelsHeight: number
  private pixelsX: number
  private pixelsY: number
  constructor(stack: string, sliceCount: number) {
    this.stack = stack
    this.sliceCount = sliceCount
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find((g) => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }

    let sliceCount = g.sliceCount - this.sliceCount
    let newWidth = sliceCount * file.frameWidth

    let { x, y, width, height } = file.getStackArea(this.stack)
    this.pixelsX = x + newWidth
    this.pixelsY = y
    this.pixelsWidth = width - newWidth
    this.pixelsHeight = height
    this.pixels = file.canvas.getPixels(this.pixelsX, this.pixelsY, this.pixelsWidth, this.pixelsHeight)

    this.slices = []
    for (let a of g.animations) {
      let fslices = []
      for (let f of a.frames) {
        fslices.push(f.slices.splice(f.slices.length - this.sliceCount, this.sliceCount))
      }
      this.slices.push(fslices)
    }

    g.sliceCount = sliceCount
    // Get our maximum width (each stack's slices * file.frameWidth)
    let targetWidth = newWidth
    for (let stack of file.stacks) {
      targetWidth = Math.max(targetWidth, stack.sliceCount * file.frameWidth)
    }

    if (file.canvas.width > targetWidth) {
      // Shrink the canvas if no stacks are wider than our changing stack.
      // Resize the canvas.
      file.canvas.resizeCanvas(targetWidth, file.canvas.height)
    } else {
      // Otherwise just clear the area where our stack's old slices were.
      file.canvas.clearPixels(x + newWidth, y, width - newWidth, height)
    }
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    // Reverse of above.
    let g = file.stacks.find((g) => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }

    let sliceCount = g.sliceCount + this.sliceCount
    let newWidth = sliceCount * file.frameWidth
    if (file.canvas.width < newWidth) {
      // Grow it again.
      file.canvas.resizeCanvas(newWidth, file.canvas.height)
    }
    // Paste back in our pixels.
    file.canvas.setPixels(this.pixelsX, this.pixelsY, this.pixelsWidth, this.pixelsHeight, this.pixels)
    for (let a of g.animations) {
      let aslice = this.slices.shift()
      for (let f of a.frames) {
        let fslice = aslice.shift()
        f.slices.push(...fslice)
      }
    }
    g.sliceCount = sliceCount
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class DuplicateSliceUndoable implements Undoable<LoadedFile> {
  private stack: string
  private sliceIndex: number
  private growUndoable: GrowStackSliceUndoable
  constructor(stack: string, sliceIndex: number) {
    this.stack = stack
    this.sliceIndex = sliceIndex
    this.growUndoable = new GrowStackSliceUndoable(stack, 1)
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find((g) => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }

    let { x, y, width, height } = file.getStackArea(this.stack)
    x += this.sliceIndex * file.frameWidth
    width -= this.sliceIndex * file.frameWidth

    this.growUndoable.apply(file)

    let pixels = file.canvas.getPixels(x, y, width, height)
    file.canvas.setPixels(x + file.frameWidth, y, width, height, pixels)

    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find((g) => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }

    let { x, y, width, height } = file.getStackArea(this.stack)
    x += this.sliceIndex * file.frameWidth
    width -= this.sliceIndex * file.frameWidth

    let pixels = file.canvas.getPixels(x + file.frameWidth, y, width, height)
    file.canvas.setPixels(x, y, width, height, pixels)

    this.growUndoable.unapply(file)

    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class ClearSliceUndoable implements Undoable<LoadedFile> {
  private frame: StaxFrame
  private sliceIndex: number
  // @ts-expect-error
  private pixels: Uint8Array
  // Yeah, yeah, this constructor is different, don't care.
  constructor(frame: StaxFrame, sliceIndex: number) {
    this.frame = frame
    this.sliceIndex = sliceIndex
  }
  apply(file: LoadedFile) {
    let { x, y, width, height } = file.getSliceAreaFromFrame(this.frame, this.sliceIndex)

    this.pixels = file.canvas.getPixels(x, y, width, height)
    file.canvas.clearPixels(x, y, width, height)
  }
  unapply(file: LoadedFile) {
    let { x, y, width, height } = file.getSliceAreaFromFrame(this.frame, this.sliceIndex)
    file.canvas.setPixels(x, y, width, height, this.pixels)
  }
}

export class RemoveSliceUndoable implements Undoable<LoadedFile> {
  private stack: string
  private sliceIndex: number
  private slicedPixels: Uint8Array = new Uint8Array([])
  private storedAnimationSlices: StaxSlice[][] = []
  constructor(stack: string, sliceIndex: number) {
    this.stack = stack
    this.sliceIndex = sliceIndex
  }
  apply(file: LoadedFile) {
    let s = file.stacks.find((g) => g.name === this.stack)
    if (!s) {
      throw new Error('stack not found: ' + this.stack)
    }

    let { x, y, width, height } = file.getStackArea(this.stack)
    x += this.sliceIndex * file.frameWidth
    width -= this.sliceIndex * file.frameWidth
    let sliceX = this.sliceIndex * file.frameWidth
    let sliceWidth = file.frameWidth

    // Store our slices to remove.
    this.slicedPixels = file.canvas.getPixels(sliceX, y, sliceWidth, height)

    // Shift our pixels to the left.
    let pixels = file.canvas.getPixels(x + file.frameWidth, y, width - file.frameWidth, height)
    file.canvas.setPixels(x, y, width - file.frameWidth, height, pixels)

    // See if we can shrink our canvas.
    let targetWidth = (s.sliceCount - 1) * file.frameWidth
    for (let s of file.stacks) {
      targetWidth = Math.max(targetWidth, s.sliceCount * file.frameWidth)
    }

    if (file.canvas.width > targetWidth) {
      file.canvas.resizeCanvas(targetWidth, file.canvas.height)
    } else {
      // Otherwise, clear the last to the right.
      let { x, y, width, height } = file.getStackArea(this.stack)
      file.canvas.clearPixels(x + width - file.frameWidth, y, file.frameWidth, height)
    }

    // Clean up our data.
    for (let a of s.animations) {
      let aslices: StaxSlice[] = []
      for (let f of a.frames) {
        aslices.push(f.slices.splice(this.sliceIndex, 1)[0])
      }
      this.storedAnimationSlices.push(aslices)
    }
    s.sliceCount--

    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    let s = file.stacks.find((g) => g.name === this.stack)
    if (!s) {
      throw new Error('stack not found: ' + this.stack)
    }

    // Regrow canvas first if we need.
    let targetWidth = (s.sliceCount + 1) * file.frameWidth
    for (let s of file.stacks) {
      targetWidth = Math.max(targetWidth, s.sliceCount * file.frameWidth)
    }
    if (file.canvas.width < targetWidth) {
      file.canvas.resizeCanvas(targetWidth, file.canvas.height)
    }

    // Shift our pixels back to the right.
    let { x, y, width, height } = file.getStackArea(this.stack)
    x += this.sliceIndex * file.frameWidth
    width -= this.sliceIndex * file.frameWidth

    let pixels = file.canvas.getPixels(x, y, width, height)
    file.canvas.setPixels(x + file.frameWidth, y, width, height, pixels)

    // Restore old pixels.
    file.canvas.setPixels(x, y, file.frameWidth, height, this.slicedPixels)

    // Restore our data.
    for (let ai = 0; ai < s.animations.length; ai++) {
      let a = s.animations[ai]
      let aslices = this.storedAnimationSlices[ai]
      for (let fi = 0; fi < a.frames.length; fi++) {
        let f = a.frames[fi]
        f.slices.splice(this.sliceIndex, 0, aslices[fi])
      }
    }

    s.sliceCount++

    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class AddAnimationUndoable implements Undoable<LoadedFile> {
  private stack: string
  constructor(stack: string) {
    this.stack = stack
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find((g) => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }

    let name = 'animation'
    let count = 0
    for (let a of g.animations) {
      if (name === a.name) {
        count++
        name = `animation ${count}`
      }
    }

    // Grow our canvas by 1 frameHeight
    let { x, y, width, height } = file.getStackArea(this.stack)
    let newHeight = file.canvas.height + file.frameHeight
    let fullWidth = Math.max(file.canvas.width, width)

    // Grow our canvas.
    file.canvas.resizeCanvas(fullWidth, newHeight)

    // Shift all pixels after our animation area down.
    let followingPixelsHeight = file.canvas.height - (y + height)
    if (followingPixelsHeight > 0) {
      let pixels = file.canvas.getPixels(x, y + height, fullWidth, followingPixelsHeight)
      file.canvas.setPixels(x, y + height + file.frameHeight, fullWidth, followingPixelsHeight, pixels)
    }

    // Clear our new area.
    file.canvas.clearPixels(x, y + height, fullWidth, file.frameHeight)

    // Add our new stax.
    let anim: StaxAnimation = {
      name,
      frameTime: 100,
      frames: [
        {
          slices: Array.from({ length: g.sliceCount }, (_) => ({
            shading: 1,
            x: 0,
            y: 0,
          })),
        },
      ],
    }
    g.animations.push(anim)

    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find((g) => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }

    // Acquire our pixels after our area and potentially shift them back.
    let { x, y, width, height } = file.getStackArea(this.stack)
    let fullWidth = Math.max(file.canvas.width, width)

    let followingPixelsHeight = file.canvas.height - (y + height)
    if (followingPixelsHeight > 0) {
      let pixels = file.canvas.getPixels(x, y + height, fullWidth, followingPixelsHeight)
      // Move 'em back in place.
      file.canvas.setPixels(x, y + height - file.frameHeight, fullWidth, followingPixelsHeight, pixels)
    }
    // Shrink our canvas by 1 frameHeight
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - file.frameHeight)

    g.animations.pop()
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class RemoveAnimationUndoable implements Undoable<LoadedFile> {
  private stack: string
  private animation: string
  private pixels: Uint8Array
  private x: number
  private y: number
  private width: number
  private height: number
  private anim: StaxAnimation
  private animIndex: number
  constructor(stack: string, animation: string) {
    this.stack = stack
    this.animation = animation
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find((v) => v.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    let a = g.animations.find((v) => v.name === this.animation)
    if (!a) {
      throw new Error('animation not found: ' + this.animation)
    }

    let { x, y, height } = file.getAnimationArea(this.stack, this.animation)
    const width = file.canvas.width // Let's just shift the whole width...
    if (height > 0) {
      this.pixels = file.canvas.getPixels(x, y, width, height)
      this.x = x
      this.y = y
      this.width = width
      this.height = height
    }
    this.anim = a

    for (let i = 0; i < g.animations.length; i++) {
      if (g.animations[i].name === this.animation) {
        this.animIndex = i
        break
      }
    }
    g.animations.splice(this.animIndex, 1)

    let remainingHeight = file.canvas.height - (y + height)
    if (remainingHeight > 0) {
      let pixels = file.canvas.getPixels(x, y + height, width, remainingHeight)
      file.canvas.setPixels(x, y, width, remainingHeight, pixels)
    }
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - height)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find((v) => v.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }

    if (this.pixels) {
      file.canvas.resizeCanvas(file.canvas.width, file.canvas.height + this.height)
      let pixels = file.canvas.getPixels(this.x, this.y, this.width, file.canvas.height - (this.y + this.height))
      file.canvas.setPixels(this.x, this.y + this.height, this.width, file.canvas.height - (this.y + this.height), pixels)
      file.canvas.setPixels(this.x, this.y, this.width, this.height, this.pixels)
    }
    g.animations.splice(this.animIndex, 0, this.anim)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class MoveAnimationUndoable implements Undoable<LoadedFile> {
  private stackName: string

  private side: 'above' | 'below' | 'middle'

  private sourceIndex: number
  private sourcePixels: Uint8Array = new Uint8Array([])
  private sourceY: number = 0
  private sourceHeight: number = 0

  private targetY: number = 0
  private targetHeight: number = 0

  private targetIndex: number

  constructor(stackName: string, fromIndex: number, toIndex: number, side: 'above' | 'below' | 'middle') {
    this.stackName = stackName
    this.sourceIndex = fromIndex
    this.targetIndex = toIndex
    this.side = side
    if (this.side === 'below') {
      this.targetIndex++
    }
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find((v) => v.name === this.stackName)
    if (!g) {
      throw new Error('stack not found')
    }

    let { y: sourceY, height: sourceHeight } = file.getAnimationAreaFromIndex(this.stackName, this.sourceIndex)
    this.sourceHeight = sourceHeight
    this.sourceY = sourceY
    this.sourcePixels = file.canvas.getPixels(0, this.sourceY, file.canvas.width, this.sourceHeight)
    file.canvas.clearPixels(0, this.sourceY, file.canvas.width, this.sourceHeight)

    if (this.side === 'middle') {
      let { y: targetY, height: targetHeight } = file.getAnimationAreaFromIndex(this.stackName, this.targetIndex)
      this.targetY = targetY
      this.targetHeight = targetHeight
      let targetPixels = file.canvas.getPixels(0, targetY, file.canvas.width, targetHeight)
      file.canvas.setPixels(0, this.sourceY, file.canvas.width, targetHeight, targetPixels)
      file.canvas.setPixels(0, targetY, file.canvas.width, this.sourceHeight, this.sourcePixels)
    } else {
      if (this.targetIndex < this.sourceIndex) {
        let { y: targetY } = file.getAnimationAreaFromIndex(this.stackName, this.targetIndex)
        let { y: targetY2 } = file.getAnimationAreaFromIndex(this.stackName, this.sourceIndex)
        let targetHeight = targetY2 - targetY
        this.targetY = targetY
        this.targetHeight = targetHeight
        let targetPixels = file.canvas.getPixels(0, targetY, file.canvas.width, targetHeight)
        file.canvas.setPixels(0, targetY + this.sourceHeight, file.canvas.width, targetHeight, targetPixels)
        file.canvas.setPixels(0, targetY, file.canvas.width, this.sourceHeight, this.sourcePixels)
      } else {
        let { y: targetY } = file.getAnimationAreaFromIndex(this.stackName, this.sourceIndex + 1)
        let { y: targetY2, height: targetHeight2 } = file.getAnimationAreaFromIndex(this.stackName, this.targetIndex - 1)
        let targetHeight = targetY2 + targetHeight2 - targetY
        this.targetY = targetY
        this.targetHeight = targetHeight
        let targetPixels = file.canvas.getPixels(0, targetY, file.canvas.width, targetHeight)
        file.canvas.setPixels(0, this.sourceY, file.canvas.width, targetHeight, targetPixels)
        file.canvas.setPixels(0, targetY + targetHeight - this.sourceHeight, file.canvas.width, this.sourceHeight, this.sourcePixels)
      }
    }

    let anim = g.animations.splice(this.sourceIndex, 1)[0]
    g.animations.splice(this.targetIndex > this.sourceIndex ? this.targetIndex - 1 : this.targetIndex, 0, anim)

    file.cacheSlicePositions()
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find((v) => v.name === this.stackName)
    if (!g) {
      throw new Error('stack not found')
    }

    if (this.side === 'middle') {
      let targetPixels = file.canvas.getPixels(0, this.sourceY, file.canvas.width, this.targetHeight)
      file.canvas.setPixels(0, this.targetY, file.canvas.width, this.targetHeight, targetPixels)
      file.canvas.setPixels(0, this.sourceY, file.canvas.width, this.sourceHeight, this.sourcePixels)
    } else {
      if (this.targetIndex < this.sourceIndex) {
        let targetPixels = file.canvas.getPixels(0, this.targetY + this.sourceHeight, file.canvas.width, this.targetHeight)
        file.canvas.setPixels(0, this.targetY, file.canvas.width, this.targetHeight, targetPixels)
        file.canvas.setPixels(0, this.sourceY, file.canvas.width, this.sourceHeight, this.sourcePixels)
      } else {
        let targetPixels = file.canvas.getPixels(0, this.sourceY, file.canvas.width, this.targetHeight)
        file.canvas.setPixels(0, this.targetY, file.canvas.width, this.targetHeight, targetPixels)
        file.canvas.setPixels(0, this.sourceY, file.canvas.width, this.sourceHeight, this.sourcePixels)
      }
    }
    // Update animations.
    let anim = g.animations.splice(this.targetIndex > this.sourceIndex ? this.targetIndex - 1 : this.targetIndex, 1)[0]
    g.animations.splice(this.sourceIndex, 0, anim)

    file.cacheSlicePositions()
  }
}

export class DuplicateAnimationUndoable implements Undoable<LoadedFile> {
  private stack: string
  private animation: string
  private name: string = ''
  private areaX: number = -1
  private areaY: number = -1
  private areaWidth: number = -1
  private areaHeight: number = -1
  constructor(stack: string, animation: string) {
    this.stack = stack
    this.animation = animation
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find((g) => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    let a = g.animations.find((v) => v.name === this.animation)
    if (!a) {
      throw new Error('animation not found: ' + this.animation)
    }
    let name = this.animation + ' copy'
    for (let count = 0; g.animations.find((a) => a.name === name); name = `${this.animation} copy ${count++}`) { }
    this.name = name

    let { x, y, width, height } = file.getAnimationAreaFromAnimation(a)
    this.areaX = x
    this.areaY = y
    this.areaWidth = width
    this.areaHeight = height

    // 1. Get pixels to copy
    let areaPixels = file.canvas.getPixels(x, y, width, height)
    // 2. Resize canvas
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height + height)
    // 3. Shift all pixels after animation area down by animation area's height*2
    let pixels = file.canvas.getPixels(x, y + height, width, file.canvas.height - (y + height))
    file.canvas.setPixels(x, y + height * 2, width, file.canvas.height - (y + height), pixels)
    // 4. Set pixels at animation area + animation area height to stored
    file.canvas.setPixels(x, y + height, width, height, areaPixels)
    // 5. Update data structure
    g.animations.splice(g.animations.findIndex((a) => a.name === this.animation) + 1, 0, {
      name,
      frameTime: a.frameTime,
      frames: JSON.parse(JSON.stringify(a.frames)),
    })
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile): void {
    let g = file.stacks.find((g) => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    // 1. Shift all pixels after stack area up by stack area's height
    let pixels = file.canvas.getPixels(this.areaX, this.areaY + this.areaHeight * 2, this.areaWidth, file.canvas.height - (this.areaY + this.areaHeight))
    file.canvas.setPixels(this.areaX, this.areaY + this.areaHeight, this.areaWidth, file.canvas.height - (this.areaY + this.areaHeight), pixels)
    // 2. Resize canvas
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - this.areaHeight)
    // 3. Update data structure
    g.animations.splice(
      g.animations.findIndex((a) => a.name === this.name),
      1,
    )
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class RenameAnimationUndoable implements Undoable<LoadedFile> {
  private stack: string
  private animation: string
  private oldName: string = ''
  private newName: string
  constructor(stack: string, animation: string, newName: string) {
    this.stack = stack
    this.animation = animation
    this.newName = newName
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find((v) => v.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    let a = g.animations.find((v) => v.name === this.animation)
    if (!a) {
      throw new Error('animation not found: ' + this.animation)
    }
    this.oldName = a.name
    a.name = this.newName
  }
  unapply(file: LoadedFile): void {
    let g = file.stacks.find((v) => v.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    let a = g.animations.find((v) => v.name === this.newName)
    if (!a) {
      throw new Error('animation not found: ' + this.newName)
    }
    a.name = this.oldName
  }
}

export class AddAnimationFrameUndoable implements Undoable<LoadedFile> {
  private stack: string
  private animation: string
  constructor(stack: string, animation: string) {
    this.stack = stack
    this.animation = animation
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find((v) => v.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    let a = g.animations.find((v) => v.name === this.animation)
    if (!a) {
      throw new Error('animation not found: ' + this.animation)
    }

    // Grow our canvas by 1 frameHeight
    let { x, y, height } = file.getAnimationArea(this.stack, this.animation)
    const width = file.canvas.width
    a.frames.push({
      slices: Array.from({ length: g.sliceCount }, (_) => ({
        shading: 1,
        x: 0,
        y: 0,
      })),
    })
    let newHeight = file.canvas.height + file.frameHeight

    // Grow our canvas.
    file.canvas.resizeCanvas(width, newHeight)

    // Shift all pixels after our animation area down.
    let followingPixelsHeight = file.canvas.height - (y + height)
    if (followingPixelsHeight > 0) {
      let pixels = file.canvas.getPixels(x, y + height, width, followingPixelsHeight)
      file.canvas.setPixels(x, y + height + file.frameHeight, width, followingPixelsHeight, pixels)
    }

    // Clear our new area.
    file.canvas.clearPixels(x, y + height, width, file.frameHeight)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find((v) => v.name === this.stack)
    if (!g) {
      throw new Error('stack not found')
    }
    let a = g.animations.find((v) => v.name === this.animation)
    if (!a) {
      throw new Error('animation not found')
    }

    // Acquire our pixels after our area and potentially shift them back.
    let { x, y, height } = file.getAnimationArea(this.stack, this.animation)
    const width = file.canvas.width
    a.frames.pop()

    let followingPixelsHeight = file.canvas.height - (y + height)
    if (followingPixelsHeight > 0) {
      let pixels = file.canvas.getPixels(x, y + height, width, followingPixelsHeight)
      // Move 'em back in place.
      file.canvas.setPixels(x, y + height - file.frameHeight, width, followingPixelsHeight, pixels)
    }
    // Shrink our canvas by 1 frameHeight
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - file.frameHeight)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class DuplicateAnimationFrameUndoable implements Undoable<LoadedFile> {
  private stack: string
  private animation: string
  private frameIndex: number
  private areaX: number = -1
  private areaY: number = -1
  private areaWidth: number = -1
  private areaHeight: number = -1
  constructor(stack: string, animation: string, frameIndex: number) {
    this.stack = stack
    this.animation = animation
    this.frameIndex = frameIndex
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find((g) => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    let a = g.animations.find((v) => v.name === this.animation)
    if (!a) {
      throw new Error('animation not found: ' + this.animation)
    }
    let f = a.frames[this.frameIndex]
    if (!f) {
      throw new Error('frame not found: ' + this.frameIndex)
    }

    let { x, y, width, height } = file.getFrameAreaFromFrame(f)
    this.areaX = x
    this.areaY = y
    this.areaWidth = width
    this.areaHeight = height

    // 1. Get pixels to copy
    let areaPixels = file.canvas.getPixels(x, y, width, height)
    // 2. Resize canvas
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height + height)
    // 3. Shift all pixels after frame area down by frame area's height*2
    let pixels = file.canvas.getPixels(x, y + height, file.canvas.width, file.canvas.height - (y + height))
    file.canvas.setPixels(x, y + height * 2, file.canvas.width, file.canvas.height - (y + height), pixels)
    // 4. Set pixels at frame area + frame area height to stored
    file.canvas.setPixels(x, y + height, width, height, areaPixels)
    // 5. Update data structure
    a.frames.splice(this.frameIndex, 0, {
      slices: JSON.parse(JSON.stringify(f.slices)),
    })
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile): void {
    let g = file.stacks.find((g) => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    let a = g.animations.find((v) => v.name === this.animation)
    if (!a) {
      throw new Error('animation not found: ' + this.animation)
    }
    // 1. Shift all pixels after stack area up by frame area's height
    let pixels = file.canvas.getPixels(this.areaX, this.areaY + this.areaHeight * 2, file.canvas.width, file.canvas.height - (this.areaY + this.areaHeight))
    file.canvas.setPixels(this.areaX, this.areaY + this.areaHeight, file.canvas.width, file.canvas.height - (this.areaY + this.areaHeight), pixels)
    // 2. Resize canvas
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - this.areaHeight)
    // 3. Update data structure
    a.frames.splice(this.frameIndex, 1)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class RemoveAnimationFrameUndoable implements Undoable<LoadedFile> {
  private stackName: string
  private animationName: string
  private frameIndex: number
  private frame: StaxFrame
  private pixels: Uint8Array
  private pixelsX: number
  private pixelsY: number
  private pixelsWidth: number
  private pixelsHeight: number
  constructor(stackName: string, animationName: string, frameIndex: number) {
    this.stackName = stackName
    this.animationName = animationName
    this.frameIndex = frameIndex
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find((v) => v.name === this.stackName)
    if (!g) {
      throw new Error('stack not found')
    }
    let a = g.animations.find((v) => v.name === this.animationName)
    if (!a) {
      throw new Error('animation not found')
    }
    if (this.frameIndex < 0 || this.frameIndex >= a.frames.length) {
      throw new Error('frame oob')
    }

    let { x, y, height } = file.getFrameArea(this.stackName, this.animationName, this.frameIndex)
    this.pixels = file.canvas.getPixels(x, y, file.canvas.width, height)
    this.pixelsX = x
    this.pixelsY = y
    this.pixelsWidth = file.canvas.width
    this.pixelsHeight = height

    let followingPixelsHeight = file.canvas.height - (y + height)
    if (followingPixelsHeight > 0) {
      let pixels = file.canvas.getPixels(x, y + height, file.canvas.width, followingPixelsHeight)
      // Move 'em back in place.
      file.canvas.setPixels(x, y, file.canvas.width, followingPixelsHeight, pixels)
    }
    // Shrink our canvas by frame's height
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - height)
    this.frame = a.frames.splice(this.frameIndex, 1)[0]

    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find((v) => v.name === this.stackName)
    if (!g) {
      throw new Error('stack not found')
    }
    let a = g.animations.find((v) => v.name === this.animationName)
    if (!a) {
      throw new Error('animation not found')
    }

    // 1. Get our pixels at pixelsY to end of canvas.
    let followingPixelsHeight = file.canvas.height - this.pixelsY
    let pixels: Uint8Array
    if (followingPixelsHeight > 0) {
      pixels = file.canvas.getPixels(this.pixelsX, this.pixelsY, file.canvas.width, followingPixelsHeight)
    }

    // 2. Increase our canvas height to += pixelsHeight
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height + this.pixelsHeight)

    // 3. Shift earlier pixels if needed.
    if (pixels) {
      file.canvas.setPixels(this.pixelsX, this.pixelsY + this.pixelsHeight, file.canvas.width, followingPixelsHeight, pixels)
    }

    // 4. Re-add stored pixels to pixelY
    file.canvas.setPixels(this.pixelsX, this.pixelsY, this.pixelsWidth, this.pixelsHeight, this.pixels)
    a.frames.splice(this.frameIndex, 0, this.frame)

    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class ClearAnimationFrameUndoable implements Undoable<LoadedFile> {
  private stackName: string
  private animationName: string
  private frameIndex: number
  private pixels: Uint8Array
  private pixelsX: number
  private pixelsY: number
  private pixelsWidth: number
  private pixelsHeight: number
  constructor(stackName: string, animationName: string, frameIndex: number) {
    this.stackName = stackName
    this.animationName = animationName
    this.frameIndex = frameIndex
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find((v) => v.name === this.stackName)
    if (!g) {
      throw new Error('stack not found')
    }
    let a = g.animations.find((v) => v.name === this.animationName)
    if (!a) {
      throw new Error('animation not found')
    }
    if (this.frameIndex < 0 || this.frameIndex >= a.frames.length) {
      throw new Error('frame oob')
    }

    let { x, y, width, height } = file.getFrameArea(this.stackName, this.animationName, this.frameIndex)
    this.pixels = file.canvas.getPixels(x, y, width, height)
    this.pixelsX = x
    this.pixelsY = y
    this.pixelsWidth = width
    this.pixelsHeight = height

    file.canvas.clearPixels(x, y, width, height)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find((v) => v.name === this.stackName)
    if (!g) {
      throw new Error('stack not found')
    }
    let a = g.animations.find((v) => v.name === this.animationName)
    if (!a) {
      throw new Error('animation not found')
    }

    file.canvas.setPixels(this.pixelsX, this.pixelsY, this.pixelsWidth, this.pixelsHeight, this.pixels)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class MoveAnimationFrameUndoable implements Undoable<LoadedFile> {
  private stackName: string
  private animationName: string
  private side: 'above' | 'below' | 'middle'

  private sourceIndex: number
  private sourcePixels: Uint8Array = new Uint8Array([])
  private sourceY: number = 0
  private sourceHeight: number = 0

  private targetY: number = 0
  private targetHeight: number = 0

  private targetIndex: number

  constructor(stackName: string, animationName: string, fromIndex: number, toIndex: number, side?: 'above' | 'below' | 'middle') {
    this.stackName = stackName
    this.animationName = animationName
    this.side = side || 'middle'
    this.sourceIndex = fromIndex
    this.targetIndex = toIndex
    if (this.side === 'below') {
      this.targetIndex++
    }
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find((v) => v.name === this.stackName)
    if (!g) {
      throw new Error('stack not found')
    }
    let a = g.animations.find((v) => v.name === this.animationName)
    if (!a) {
      throw new Error('animation not found')
    }

    // Get our pixels to swap.
    let { y: sourceY, height: sourceHeight } = file.getFrameArea(this.stackName, this.animationName, this.sourceIndex)
    this.sourceHeight = sourceHeight
    this.sourceY = sourceY
    this.sourcePixels = file.canvas.getPixels(0, this.sourceY, file.canvas.width, this.sourceHeight)
    file.canvas.clearPixels(0, this.sourceY, file.canvas.width, this.sourceHeight)

    if (this.side === 'middle') {
      let { y: targetY, height: targetHeight } = file.getFrameArea(this.stackName, this.animationName, this.targetIndex)
      this.targetY = targetY
      this.targetHeight = targetHeight
      let targetPixels = file.canvas.getPixels(0, targetY, file.canvas.width, targetHeight)
      file.canvas.setPixels(0, this.sourceY, file.canvas.width, targetHeight, targetPixels)
      file.canvas.setPixels(0, targetY, file.canvas.width, this.sourceHeight, this.sourcePixels)
    } else {
      if (this.targetIndex < this.sourceIndex) {
        let { y: targetY } = file.getFrameArea(this.stackName, this.animationName, this.targetIndex)
        let { y: targetY2 } = file.getFrameArea(this.stackName, this.animationName, this.sourceIndex)
        let targetHeight = targetY2 - targetY
        this.targetY = targetY
        this.targetHeight = targetHeight
        let targetPixels = file.canvas.getPixels(0, targetY, file.canvas.width, targetHeight)
        file.canvas.setPixels(0, targetY + this.sourceHeight, file.canvas.width, targetHeight, targetPixels)
        file.canvas.setPixels(0, targetY, file.canvas.width, this.sourceHeight, this.sourcePixels)
      } else {
        let { y: targetY } = file.getFrameArea(this.stackName, this.animationName, this.sourceIndex + 1)
        let { y: targetY2, height: targetHeight2 } = file.getFrameArea(this.stackName, this.animationName, this.targetIndex - 1)
        let targetHeight = targetY2 + targetHeight2 - targetY
        this.targetY = targetY
        this.targetHeight = targetHeight
        let targetPixels = file.canvas.getPixels(0, targetY, file.canvas.width, targetHeight)
        file.canvas.setPixels(0, this.sourceY, file.canvas.width, targetHeight, targetPixels)
        file.canvas.setPixels(0, targetY + targetHeight - this.sourceHeight, file.canvas.width, this.sourceHeight, this.sourcePixels)
      }
    }

    file.cacheSlicePositions()
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find((v) => v.name === this.stackName)
    if (!g) {
      throw new Error('stack not found')
    }
    let a = g.animations.find((v) => v.name === this.animationName)
    if (!a) {
      throw new Error('animation not found')
    }

    if (this.side === 'middle') {
      let targetPixels = file.canvas.getPixels(0, this.sourceY, file.canvas.width, this.targetHeight)
      file.canvas.setPixels(0, this.targetY, file.canvas.width, this.targetHeight, targetPixels)
      file.canvas.setPixels(0, this.sourceY, file.canvas.width, this.sourceHeight, this.sourcePixels)
    } else {
      if (this.targetIndex < this.sourceIndex) {
        let targetPixels = file.canvas.getPixels(0, this.targetY + this.sourceHeight, file.canvas.width, this.targetHeight)
        file.canvas.setPixels(0, this.targetY, file.canvas.width, this.targetHeight, targetPixels)
        file.canvas.setPixels(0, this.sourceY, file.canvas.width, this.sourceHeight, this.sourcePixels)
      } else {
        let targetPixels = file.canvas.getPixels(0, this.sourceY, file.canvas.width, this.targetHeight)
        file.canvas.setPixels(0, this.targetY, file.canvas.width, this.targetHeight, targetPixels)
        file.canvas.setPixels(0, this.sourceY, file.canvas.width, this.sourceHeight, this.sourcePixels)
      }
    }
    file.cacheSlicePositions()
  }
}

export class MoveAnimationFrameSliceUndoable implements Undoable<LoadedFile> {
  private stackName: string
  private animationName: string
  private frameIndex: number
  private sourceIndex: number
  private targetIndex: number
  private side: 'above' | 'below' | 'middle'

  private sourceY: number = 0
  private sourceX: number = 0
  private sourceWidth: number = 0
  private targetX: number = 0
  private targetWidth: number = 0

  private sourcePixels: Uint8Array = new Uint8Array([])

  constructor(stackName: string, animationName: string, frameIndex: number, fromIndex: number, toIndex: number, side?: 'above' | 'below' | 'middle') {
    this.stackName = stackName
    this.animationName = animationName
    this.frameIndex = frameIndex
    this.sourceIndex = fromIndex
    this.targetIndex = toIndex
    this.side = side || 'middle'
    if (this.side === 'above') {
      this.targetIndex++
    }

  }
  apply(file: LoadedFile) {
    let g = file.stacks.find((v) => v.name === this.stackName)
    if (!g) {
      throw new Error('stack not found')
    }
    let a = g.animations.find((v) => v.name === this.animationName)
    if (!a) {
      throw new Error('animation not found')
    }

    // Get our pixels to swap.
    let { x: sourceX, y: sourceY, width: sourceWidth, height: sourceHeight } = file.getSliceArea(this.stackName, this.animationName, this.frameIndex, this.sourceIndex)
    this.sourcePixels = file.canvas.getPixels(sourceX, sourceY, sourceWidth, sourceHeight)
    this.sourceWidth = sourceWidth
    this.sourceX = sourceX
    this.sourceY = sourceY
    file.canvas.clearPixels(sourceX, sourceY, sourceWidth, sourceHeight)

    if (this.side === 'middle') {
      let { x: targetX, y: targetY, width: targetWidth, height: targetHeight } = file.getSliceArea(this.stackName, this.animationName, this.frameIndex, this.targetIndex)
      this.targetX = targetX
      this.targetWidth = targetWidth
      let targetPixels = file.canvas.getPixels(targetX, targetY, targetWidth, file.frameHeight)
      file.canvas.setPixels(sourceX, sourceY, targetWidth, targetHeight, targetPixels)
      file.canvas.setPixels(targetX, targetY, sourceWidth, sourceHeight, this.sourcePixels)
    } else {
      if (this.targetIndex < this.sourceIndex) {
        console.log('source is above target')
        let { x: targetX, y: targetY } = file.getSliceArea(this.stackName, this.animationName, this.frameIndex, this.targetIndex)
        let { x: targetX2 } = file.getSliceArea(this.stackName, this.animationName, this.frameIndex, this.sourceIndex)
        let targetWidth = targetX2 - targetX
        this.targetX = targetX
        this.targetWidth = targetWidth
        let targetPixels = file.canvas.getPixels(targetX, targetY, targetWidth, file.frameHeight)
        file.canvas.setPixels(targetX + this.sourceWidth, targetY, targetWidth, file.frameHeight, targetPixels)
        file.canvas.setPixels(targetX, targetY, this.sourceWidth, file.frameHeight, this.sourcePixels)
      } else {
        console.log('source is below target')
        let { x: targetX, y: targetY } = file.getSliceArea(this.stackName, this.animationName, this.frameIndex, this.sourceIndex + 1)
        let { x: targetX2, width: targetWidth2 } = file.getSliceArea(this.stackName, this.animationName, this.frameIndex, this.targetIndex - 1)
        let targetWidth = targetX2 + targetWidth2 - targetX
        this.targetX = targetX
        this.targetWidth = targetWidth
        let targetPixels = file.canvas.getPixels(targetX, targetY, targetWidth, file.frameHeight)
        file.canvas.setPixels(this.sourceX, targetY, targetWidth, file.frameHeight, targetPixels)
        file.canvas.setPixels(targetX + targetWidth - this.sourceWidth, targetY, this.sourceWidth, file.frameHeight, this.sourcePixels)
      }
    }

    file.cacheSlicePositions()
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find((v) => v.name === this.stackName)
    if (!g) {
      throw new Error('stack not found')
    }
    let a = g.animations.find((v) => v.name === this.animationName)
    if (!a) {
      throw new Error('animation not found')
    }

    if (this.side === 'middle') {
      let targetPixels = file.canvas.getPixels(this.sourceX, this.sourceY, this.targetWidth, file.frameHeight)
      file.canvas.setPixels(this.targetX, this.sourceY, this.targetWidth, file.frameHeight, targetPixels)
      file.canvas.setPixels(this.sourceX, this.sourceY, this.sourceWidth, file.frameHeight, this.sourcePixels)
    } else {
      if (this.targetIndex < this.sourceIndex) {
        let targetPixels = file.canvas.getPixels(this.targetX + this.sourceWidth, this.sourceY, this.targetWidth, file.frameHeight)
        file.canvas.setPixels(this.targetX, this.sourceY, this.targetWidth, file.frameHeight, targetPixels)
        file.canvas.setPixels(this.sourceX, this.sourceY, this.sourceWidth, file.frameHeight, this.sourcePixels)
      } else {
        let targetPixels = file.canvas.getPixels(this.sourceX, this.sourceY, this.targetWidth, file.frameHeight)
        file.canvas.setPixels(this.targetX, this.sourceY, this.targetWidth, file.frameHeight, targetPixels)
        file.canvas.setPixels(this.sourceX, this.sourceY, this.sourceWidth, file.frameHeight, this.sourcePixels)
      }
    }

    file.cacheSlicePositions()
  }
}

export class ThreeDSelectionBoxClearUndoable implements Undoable<LoadedFile> {
  //private selection: [[number, number, number], [number, number, number]] = [[0, 0, 0], [0, 0, 0]]
  private cursor1: [number, number, number] = [0, 0, 0]
  private cursor2: [number, number, number] = [0, 0, 0]
  constructor() { }
  apply(file: LoadedFile) {
    this.cursor1 = [...file.threeDCursor1]
    this.cursor2 = [...file.threeDCursor2]

    file.threeDCursor1 = [...file.threeDCursor1]
    file.threeDCursor2 = [...file.threeDCursor1]
  }
  unapply(file: LoadedFile) {
    file.threeDCursor1 = [...this.cursor1]
    file.threeDCursor2 = [...this.cursor2]
  }
}

export class ThreeDSelectionBoxSetUndoable implements Undoable<LoadedFile> {
  private cursor1: [number, number, number] = [0, 0, 0]
  private cursor1Previous: [number, number, number] = [0, 0, 0]
  private cursor2: [number, number, number] = [0, 0, 0]
  private cursor2Previous: [number, number, number] = [0, 0, 0]

  constructor(cursor1: [number, number, number], cursor2: [number, number, number]) {
    this.cursor1 = cursor1
    this.cursor2 = cursor2
  }
  apply(file: LoadedFile) {
    this.cursor1Previous = [...file.threeDCursor1]
    this.cursor2Previous = [...file.threeDCursor2]

    file.threeDCursor1 = [...this.cursor1]
    file.threeDCursor2 = [...this.cursor2]
  }
  unapply(file: LoadedFile) {
    file.threeDCursor1 = [...this.cursor1Previous]
    file.threeDCursor2 = [...this.cursor2Previous]
  }
}

export class ThreeDSelectionBoxSetVoxelsUndoable implements Undoable<LoadedFile> {
  private stackName: string
  private animationName: string
  private frameIndex: number
  private cursor1: [number, number, number]
  private cursor2: [number, number, number]
  private index: number
  private placeUndoable: PixelsPlaceUndoable
  constructor(stackName: string, animationName: string, frameIndex: number, cursor1: [number, number, number], cursor2: [number, number, number], index: number) {
    this.stackName = stackName
    this.animationName = animationName
    this.frameIndex = frameIndex
    this.cursor1 = cursor1
    this.cursor2 = cursor2
    this.index = index
    this.placeUndoable = new PixelsPlaceUndoable([])
  }
  apply(file: LoadedFile) {
    let f = _getFrame(file, this.stackName, this.animationName, this.frameIndex)
    let minX = Math.min(this.cursor1[0], this.cursor2[0])
    let minY = Math.min(this.cursor1[1], this.cursor2[1])
    let minZ = Math.min(this.cursor1[2], this.cursor2[2])
    let maxX = Math.max(this.cursor1[0], this.cursor2[0])
    let maxY = Math.max(this.cursor1[1], this.cursor2[1])
    let maxZ = Math.max(this.cursor1[2], this.cursor2[2])

    let pixels: { x: number; y: number; index: number }[] = []
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        let slice = f.slices[y]
        if (!slice) continue
        for (let z = minZ; z <= maxZ; z++) {
          pixels.push({
            x: slice.x + x,
            y: slice.y + z,
            index: this.index,
          })
        }
      }
    }
    this.placeUndoable = new PixelsPlaceUndoable(pixels)
    this.placeUndoable.apply(file)
  }
  unapply(file: LoadedFile) {
    this.placeUndoable.unapply(file)
  }
}

// FIXME: Move/rename this...
function _getFrame(file: LoadedFile, stackName: string, animationName: string, frameIndex: number): StaxFrame {
  let s = file.stacks.find((v) => v.name === stackName)
  if (!s) {
    throw new Error('stack not found')
  }
  let a = s.animations.find((v) => v.name === animationName)
  if (!a) {
    throw new Error('animation not found')
  }
  let f = a.frames[frameIndex]
  if (!f) {
    throw new Error('frame not found')
  }
  return f
}
