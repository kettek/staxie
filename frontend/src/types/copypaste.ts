import { Canvas } from './canvas'
import type { LoadedFile } from './file'
import { SelectionArea } from './selection'

let currentCanvas: Canvas
let currentSelection: SelectionArea

// CopyPaste contains a Canvas and SelectionArea that is used to copy and paste data within or between images.
export class CopyPaste {
  canvas: Canvas
  selection: SelectionArea

  constructor(canvas: Canvas, selection: SelectionArea) {
    this.canvas = canvas
    this.selection = selection
  }

  flip(vertical: boolean) {
    let canvasPixels = new Uint8Array(this.canvas.height * this.canvas.width)

    for (let y = 0; y < this.canvas.height; y++) {
      for (let x = 0; x < this.canvas.width; x++) {
        let index = this.canvas.getPixel(x, y)
        let newX = vertical ? x : this.canvas.width - x - 1
        let newY = vertical ? this.canvas.height - y - 1 : y
        canvasPixels[newY * this.canvas.width + newX] = index
      }
    }

    const newCanvas = Canvas.fromData({
      width: this.canvas.width,
      height: this.canvas.height,
      isIndexed: this.canvas.isIndexed,
      palette: this.canvas.palette,
      pixels: canvasPixels,
    })

    this.canvas = newCanvas
  }

  rotate(clockwise: boolean) {
    let canvasPixels = new Uint8Array(this.canvas.height * this.canvas.width)

    for (let y = 0; y < this.canvas.height; y++) {
      for (let x = 0; x < this.canvas.width; x++) {
        let index = this.canvas.getPixel(x, y)
        let newX = clockwise ? y : this.canvas.height - y - 1
        let newY = clockwise ? this.canvas.width - x - 1 : x
        canvasPixels[newY * this.canvas.height + newX] = index
      }
    }

    const newCanvas = Canvas.fromData({
      width: this.canvas.height,
      height: this.canvas.width,
      isIndexed: this.canvas.isIndexed,
      palette: this.canvas.palette,
      pixels: canvasPixels,
    })

    this.canvas = newCanvas
  }

  // Returns the palette colors that are missing from another palette, if any.
  getMissingPaletteColors(palette: Uint32Array): { r: number; g: number; b: number; a: number; index: number }[] {
    let missingColors: { r: number; g: number; b: number; a: number; index: number }[] = []
    for (let i = 0; i < this.canvas.palette.length; i++) {
      let color = this.canvas.palette[i]
      if (!palette.includes(color)) {
        missingColors.push({
          r: color & 0xff,
          g: (color >> 8) & 0xff,
          b: (color >> 16) & 0xff,
          a: (color >> 24) & 0xff,
          index: i,
        })
      }
    }
    return missingColors
  }

  // Returns the length difference between this palette and another palette.
  getPaletteLengthDifference(palette: Uint32Array): number {
    return palette.length - this.canvas.palette.length
  }

  // toLocal writes the given canvas and selection to local variables. The canvas is clipped to the selection and the selection is thereby clipped to that result.
  static toLocal(canvas: Canvas, selection: SelectionArea) {
    if (!canvas || !selection) {
      throw new Error('No copy data provided')
    }
    currentCanvas = Canvas.fromData({
      width: canvas.width,
      height: canvas.height,
      isIndexed: canvas.isIndexed,
      palette: canvas.palette,
      pixels: canvas.pixels,
    })
    currentSelection = SelectionArea.fromData({
      width: selection.pixelMaskCanvasPixels.width,
      height: selection.pixelMaskCanvasPixels.height,
      pixels: selection.pixelMaskCanvasPixels.data,
    })
    // Clip the canvas to the selection and thereafter modify the selection to be relative to the canvas's new size.
    let { x, y } = currentCanvas.clipToMask(selection.getMask())
    currentSelection.move(-x, -y)
    currentSelection.resize(currentCanvas.width, currentCanvas.height, 1)
  }

  // fromLocal creates a new CopyPaste instance from the local variables.
  static fromLocal(): CopyPaste {
    if (!currentCanvas || !currentSelection) {
      throw new Error('No copy data available')
    }
    let canvas = Canvas.fromData({
      width: currentCanvas.width,
      height: currentCanvas.height,
      isIndexed: currentCanvas.isIndexed,
      palette: currentCanvas.palette,
      pixels: currentCanvas.pixels,
    })
    let selection = SelectionArea.fromData({
      width: currentSelection.pixelMaskCanvasPixels.width,
      height: currentSelection.pixelMaskCanvasPixels.height,
      pixels: currentSelection.pixelMaskCanvasPixels.data,
    })
    return new CopyPaste(canvas, selection)
  }
}

export class ThreeDCopyPaste {
  static pixels: { x: number; y: number; z: number; index: number }[] = []

  constructor() { }

  static copy(file: LoadedFile) {
    if (file.threeDCursor1[0] === file.threeDCursor2[0] && file.threeDCursor1[1] === file.threeDCursor2[1] && file.threeDCursor1[2] === file.threeDCursor2[2]) {
      throw new Error('cursors at same position')
    }
    let minX = Math.min(file.threeDCursor1[0], file.threeDCursor2[0])
    let minY = Math.min(file.threeDCursor1[1], file.threeDCursor2[1])
    let minZ = Math.min(file.threeDCursor1[2], file.threeDCursor2[2])
    let maxX = Math.max(file.threeDCursor1[0], file.threeDCursor2[0])
    let maxY = Math.max(file.threeDCursor1[1], file.threeDCursor2[1])
    let maxZ = Math.max(file.threeDCursor1[2], file.threeDCursor2[2])

    let f = file.frame
    if (!f) throw new Error('no frame selection')

    this.pixels = []
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        let slice = f.slices[y]
        if (!slice) continue
        for (let z = minZ; z <= maxZ; z++) {
          let index = file.canvas.getPixel(slice.x + x, slice.y + z)
          if (index === 0) continue // FIXME: 0 is not _necessarily_ empty!

          this.pixels.push({
            x: x - minX,
            y: y - minY,
            z: z - minZ,
            index: index,
          })
        }
      }
    }
  }

  static getCopy(): { x: number; y: number; z: number; index: number }[] {
    return this.pixels
  }
}
