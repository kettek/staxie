import type { data } from '../../wailsjs/go/models.ts'
import type { Canvas } from './canvas'
import { SelectionArea } from './selection'
import { UndoableStack, type Undoable } from './undo'

export interface LoadedFileOptions {
  filepath: string
  title: string
  canvas: Canvas
  data: data.StackistFileV1
}

export class LoadedFile extends UndoableStack<LoadedFile> {
  filepath: string
  title: string
  canvas: Canvas
  selection: SelectionArea
  data: data.StackistFileV1
  
  constructor(options: LoadedFileOptions) {
    super()
    this.setTarget(this)
    this.data = options.data
    this.filepath = options.filepath
    this.title = options.title
    this.canvas = options.canvas
    this.selection = new SelectionArea(options.canvas.width, options.canvas.height, 1)
  }
  
  undo() {
    super.undo()
    this.canvas.refreshCanvas()
    this.selection.refresh()
  }
  redo() {
    super.redo()
    this.canvas.refreshCanvas()
    this.selection.refresh()
  }
  push(item: Undoable<LoadedFile>) {
    super.push(item)
    this.canvas.refreshCanvas()
    this.selection.refresh()
  }
}

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
}

export class PixelsPlaceUndoable implements Undoable<LoadedFile> {
  private oldPixels: { x: number, y: number, index: number }[]
  private hasOldPixels: boolean
  private pixels: { x: number, y: number, index: number }[]
  constructor(pixels: {x: number, y: number, index: number}[]) {
    this.hasOldPixels = false
    this.oldPixels = []
    this.pixels = pixels
  }
  apply(file: LoadedFile) {
    if (!this.hasOldPixels) {
      for (let pixel of this.pixels) {
        let p = file.canvas.getPixel(pixel.x, pixel.y)
        this.oldPixels.push({x: pixel.x, y: pixel.y, index: p})
      }
      this.hasOldPixels = true
    }
    for (let pixel of this.pixels) {
      file.canvas.setPixel(pixel.x, pixel.y, pixel.index)
    }
  }
  unapply(file: LoadedFile) {
    if (!this.hasOldPixels) {
      throw new Error('no old pixels')
    }
    for (let pixel of this.oldPixels) {
      file.canvas.setPixel(pixel.x, pixel.y, pixel.index)
    }
  }
}

export class SelectionSetUndoable implements Undoable<LoadedFile> {
  private oldPixels: { x: number, y: number, marked: boolean }[]
  private pixels: { x: number, y: number, marked: boolean }[]
  private clear: boolean

  constructor(pixels: {x: number, y: number, marked: boolean}[], clear: boolean) {
    this.pixels = pixels
    this.clear = clear
  }
  apply(file: LoadedFile) {
    if (!this.oldPixels) {
      this.oldPixels = []
      for (let y = 0; y < file.selection.pixelMaskCanvasPixels.height; y++) {
        for (let x = 0; x < file.selection.pixelMaskCanvasPixels.width; x++) {
          this.oldPixels.push({x, y, marked: file.selection.pixelMaskCanvasPixels.data[(y * file.selection.pixelMaskCanvasPixels.width + x) * 4 + 3] !== 0})
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
}

export class SelectionMoveUndoable implements Undoable<LoadedFile> {
  private oldPixels: { x: number, y: number, marked: boolean }[]

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
          this.oldPixels.push({x, y, marked: file.selection.pixelMaskCanvasPixels.data[(y * file.selection.pixelMaskCanvasPixels.width + x) * 4 + 3] !== 0})
        }
      }
    }
    file.selection.move(this.dx, this.dy)
  }
  unapply(file: LoadedFile) {
    file.selection.clear()
    for (let pixel of this.oldPixels) {
      file.selection.setPixel(pixel.x, pixel.y, pixel.marked)
    }
  }
}

export class SelectionClearUndoable implements Undoable<LoadedFile> {
  private oldPixels: { x: number, y: number, marked: boolean }[]
  private oldActive: boolean
  constructor() {
    this.oldPixels = []
  }
  apply(file: LoadedFile) {
    this.oldActive = file.selection.active
    for (let y = 0; y < file.selection.pixelMaskCanvasPixels.height; y++) {
      for (let x = 0; x < file.selection.pixelMaskCanvasPixels.width; x++) {
        this.oldPixels.push({x, y, marked: file.selection.pixelMaskCanvasPixels.data[(y * file.selection.pixelMaskCanvasPixels.width + x) * 4 + 3] !== 0})
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
}