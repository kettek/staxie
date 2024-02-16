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