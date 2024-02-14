import type { data } from '../../wailsjs/go/models.ts'
import type { Canvas } from './canvas.ts'
import { UndoableStack, type Undoable } from './undo.ts'

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
  data: data.StackistFileV1
  
  constructor(options: LoadedFileOptions) {
    super()
    this.setTarget(this)
    this.filepath = options.filepath
    this.title = options.title
    this.canvas = options.canvas
    this.data = options.data
  }
  
  undo() {
    super.undo()
    this.canvas.refreshCanvas()
  }
  redo() {
    super.redo()
    this.canvas.refreshCanvas()
  }
  push(item: Undoable<LoadedFile>) {
    super.push(item)
    this.canvas.refreshCanvas()
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
    console.log('apply', this.x, this.y, this.newIndex)
    file.canvas.setPixel(this.x, this.y, this.newIndex)
  }
  unapply(file: LoadedFile) {
    file.canvas.setPixel(this.x, this.y, this.oldIndex)
  }
}