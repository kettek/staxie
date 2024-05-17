import type { Canvas } from "./canvas"
import { PixelPlaceUndoable, PixelsPlaceUndoable, SelectionMoveUndoable, SelectionSetUndoable, type LoadedFile } from "./file"
import type { Undoable } from "./undo"

export class CanvasView {
  private canvas: Canvas
  
  public x: number = 0
  public y: number = 0
  public width: number = 0
  public height: number = 0

  constructor(canvas: Canvas) {
    this.canvas = canvas
    this.width = canvas.width
    this.height = canvas.height
  }
  
  transformUndoable(item: Undoable<LoadedFile>): Undoable<LoadedFile> {
    if (item instanceof PixelPlaceUndoable) {
      item.x = Math.min(this.x+this.width-1, Math.max(this.x, item.x))
      item.y = Math.min(this.y+this.height-1, Math.max(this.y, item.y))
    } else if (item instanceof PixelsPlaceUndoable) {
      item.pixels = item.pixels.filter(pixel => {
        return pixel.x >= this.x && pixel.x < this.x+this.width-1 && pixel.y >= this.y && pixel.y < this.y+this.height-1
      })
    } else if (item instanceof SelectionSetUndoable) {
      item.pixels = item.pixels.filter(pixel => {
        return pixel.x >= this.x && pixel.x < this.x+this.width && pixel.y >= this.y && pixel.y < this.y+this.height
      })
    } else if (item instanceof SelectionMoveUndoable) {
      console.log('WARNING: SelectionMoveUndoable not limited by CanvasView')
    }
    
    return item
  }
}