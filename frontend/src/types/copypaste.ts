import { Canvas } from "./canvas"
import { SelectionArea } from "./selection"

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
  
  // Returns the palette colors that are missing from another palette, if any.
  getMissingPaletteColors(palette: Uint32Array): { r: number, g: number, b: number, a: number, index: number }[] {
    let missingColors: { r: number, g: number, b: number, a: number, index: number }[] = []
    for (let i = 0; i < this.canvas.palette.length; i++) {
      let color = this.canvas.palette[i]
      if (!palette.includes(color)) {
        missingColors.push({
          r: color & 0xFF,
          g: (color >> 8) & 0xFF,
          b: (color >> 16) & 0xFF,
          a: (color >> 24) & 0xFF,
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
      pixels: canvas.pixels
    })
    currentSelection = SelectionArea.fromData({
      width: selection.pixelMaskCanvasPixels.width,
      height: selection.pixelMaskCanvasPixels.height,
      pixels: selection.pixelMaskCanvasPixels.data
    })
    // Clip the canvas to the selection and thereafter modify the selection to be relative to the canvas's new size.
    let {x, y} = currentCanvas.clipToMask(selection.getMask())
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
      pixels: currentCanvas.pixels
    })
    let selection = SelectionArea.fromData({
      width: currentSelection.pixelMaskCanvasPixels.width,
      height: currentSelection.pixelMaskCanvasPixels.height,
      pixels: currentSelection.pixelMaskCanvasPixels.data
    })
    return new CopyPaste(canvas, selection)
  }
}