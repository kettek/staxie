import type { Canvas } from './canvas'
import { type LoadedFile } from './file'
import { PixelPlaceUndoable, PixelsPlaceUndoable, SelectionMoveUndoable, SelectionSetUndoable } from './file/undoables'
import { UndoableGroup, type Undoable } from './undo'

export class CanvasView {
  private canvas: Canvas

  public x: number = 0
  public y: number = 0
  public width: number = 0
  public height: number = 0

  constructor(canvas: Canvas | CanvasView) {
    if (canvas instanceof CanvasView) {
      this.canvas = canvas.canvas
      this.x = canvas.x
      this.y = canvas.y
      this.width = canvas.width
      this.height = canvas.height
    } else {
      this.canvas = canvas
      this.width = canvas.width
      this.height = canvas.height
    }
  }

  transformUndoable(item: Undoable<LoadedFile>): Undoable<LoadedFile> {
    if (item instanceof PixelPlaceUndoable) {
      item.x = Math.min(this.x + this.width - 1, Math.max(this.x, item.x))
      item.y = Math.min(this.y + this.height - 1, Math.max(this.y, item.y))
    } else if (item instanceof PixelsPlaceUndoable) {
      item.pixels = item.pixels.filter((pixel) => {
        return pixel.x >= this.x && pixel.x < this.x + this.width && pixel.y >= this.y && pixel.y < this.y + this.height
      })
    } else if (item instanceof SelectionSetUndoable) {
      item.pixels = item.pixels.filter((pixel) => {
        return pixel.x >= this.x && pixel.x < this.x + this.width && pixel.y >= this.y && pixel.y < this.y + this.height
      })
    } else if (item instanceof SelectionMoveUndoable) {
      console.log('WARNING: SelectionMoveUndoable not limited by CanvasView')
    }

    return item
  }
  morphUndoable(item: Undoable<LoadedFile>, otherView?: CanvasView): Undoable<LoadedFile> {
    let x = this.x
    let y = this.y
    if (otherView) {
      x = this.x - otherView.x
      y = this.y - otherView.y
    }
    if (item instanceof PixelPlaceUndoable) {
      item.x += x
      item.y += y
    } else if (item instanceof PixelsPlaceUndoable) {
      item.pixels = item.pixels.map((pixel) => {
        pixel.x += x
        pixel.y += y
        return pixel
      })
    } else if (item instanceof UndoableGroup) {
      item = new UndoableGroup(item.getItems().map((item) => this.morphUndoable(item, otherView)))
    } else if (item instanceof SelectionSetUndoable) {
      item.pixels = item.pixels.map((pixel) => {
        pixel.x += x
        pixel.y += y
        return pixel
      })
    }

    return item
  }
}
