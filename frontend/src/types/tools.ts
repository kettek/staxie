import { PixelPlaceUndoable, type LoadedFile, PixelsPlaceUndoable } from "./file"
import { FilledCircle } from "./shapes"

export interface ToolContext {
  file: LoadedFile
}

interface Pointer {
  x: number
  y: number
  id: number
}

export interface Tool {
  isActive(): boolean
  pointerDown(ctx: ToolContext, ptr: Pointer): void
  pointerMove(ctx: ToolContext, ptr: Pointer): void
  pointerUp(ctx: ToolContext, ptr: Pointer): void
}

export interface BrushToolContext {
  brushSize: number
  colorIndex: number
}

export class BrushTool implements Tool {
  private active: boolean
  isActive(): boolean {
    return this.active
  }

  pointerDown(ctx: ToolContext & BrushToolContext, ptr: Pointer) {
    this.active = true
    ctx.file.capture()
    if (ctx.brushSize == 1) {
      let p = ctx.file.canvas.getPixel(ptr.x, ptr.y)
      if (p !== -1) {
        ctx.file.push(new PixelPlaceUndoable(ptr.x, ptr.y, p, ctx.colorIndex))
      }
    } else if (ctx.brushSize == 2) {
      for (let x1 = 0; x1 < 2; x1++) {
        for (let y1 = 0; y1 < 2; y1++) {
          let p = ctx.file.canvas.getPixel(ptr.x+x1, ptr.y+y1)
          if (p !== -1) {
            ctx.file.push(new PixelPlaceUndoable(ptr.x+x1, ptr.y+y1, p, ctx.colorIndex))
          }
        }
      }
    } else {
      let shape = FilledCircle(ptr.x, ptr.y, ctx.brushSize-2, ctx.colorIndex)
      ctx.file.push(new PixelsPlaceUndoable(shape))
    }
  }
  pointerMove(ctx: ToolContext & BrushToolContext, ptr: Pointer) {
    if (ctx.brushSize == 1) {
      let p = ctx.file.canvas.getPixel(ptr.x, ptr.y)
      if (p !== -1) {
        ctx.file.push(new PixelPlaceUndoable(ptr.x, ptr.y, p, ctx.colorIndex))
      }
    } else if (ctx.brushSize == 2) {
      for (let x1 = 0; x1 < 2; x1++) {
        for (let y1 = 0; y1 < 2; y1++) {
          let p = ctx.file.canvas.getPixel(ptr.x+x1, ptr.y+y1)
          if (p !== -1) {
            ctx.file.push(new PixelPlaceUndoable(ptr.x+x1, ptr.y+y1, p, ctx.colorIndex))
          }
        }
      }
    } else {
      let shape = FilledCircle(ptr.x, ptr.y, ctx.brushSize-2, ctx.colorIndex)
      ctx.file.push(new PixelsPlaceUndoable(shape))
    }
  }
  pointerUp(ctx: ToolContext, ptr: Pointer) {
    ctx.file.release()
    this.active = false
  }
}