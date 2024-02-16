import { PixelPlaceUndoable, type LoadedFile, PixelsPlaceUndoable } from "./file"
import { FilledCircle, FilledSquare, type PixelPosition } from "./shapes"

export interface ToolContext {
  file: LoadedFile
}

interface Pointer {
  x: number
  y: number
  id: number
}

export type BrushType = "circle" | "square"

export interface Tool {
  isActive(): boolean
  pointerDown(ctx: ToolContext, ptr: Pointer): void
  pointerMove(ctx: ToolContext, ptr: Pointer): void
  pointerUp(ctx: ToolContext, ptr: Pointer): void
}

export interface BrushToolContext {
  brushSize: number
  brushType: BrushType
  colorIndex: number
}

export interface EraserToolContext {
  brushSize: number
  brushType: BrushType
}

export interface FloodToolContext {
  colorIndex: number
}

export interface PickerToolContext {
  setColorIndex(index: number): void
}

export class BrushTool implements Tool {
  private lastX: number
  private lastY: number
  private active: boolean
  isActive(): boolean {
    return this.active
  }

  pointerDown(ctx: ToolContext & BrushToolContext, ptr: Pointer) {
    // Store last for interp.
    this.lastX = ptr.x
    this.lastY = ptr.y

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
      let shape: PixelPosition[]
      if (ctx.brushType == "circle") {
        shape = FilledCircle(ptr.x, ptr.y, ctx.brushSize-2, ctx.colorIndex)
      } else if (ctx.brushType == "square") {
        shape = FilledSquare(ptr.x, ptr.y, ctx.brushSize, ctx.colorIndex)
      }
      ctx.file.push(new PixelsPlaceUndoable(shape))
    }
  }
  pointerMove(ctx: ToolContext & BrushToolContext, ptr: Pointer) {
    let dx = this.lastX - ptr.x
    let dy = this.lastY - ptr.y
    this.lastX = ptr.x
    this.lastY = ptr.y

    let angle = Math.atan2(dy, dx)
    let dist = Math.sqrt(dx*dx + dy*dy)
    let steps = Math.ceil(dist)
    for (let i = 0; i < steps; i++) {
      let x = Math.floor(this.lastX + Math.cos(angle) * i)
      let y = Math.floor(this.lastY + Math.sin(angle) * i)

      if (ctx.brushSize == 1) {
        let p = ctx.file.canvas.getPixel(x, y)
        if (p !== -1) {
          ctx.file.push(new PixelPlaceUndoable(x, y, p, ctx.colorIndex))
        }
      } else if (ctx.brushSize == 2) {
        for (let x1 = 0; x1 < 2; x1++) {
          for (let y1 = 0; y1 < 2; y1++) {
            let p = ctx.file.canvas.getPixel(x+x1, y+y1)
            if (p !== -1) {
              ctx.file.push(new PixelPlaceUndoable(x+x1, y+y1, p, ctx.colorIndex))
            }
          }
        }
      } else {
        let shape: PixelPosition[]
        if (ctx.brushType == "circle") {
          shape = FilledCircle(x, y, ctx.brushSize-2, ctx.colorIndex)
        } else if (ctx.brushType == "square") {
          shape = FilledSquare(x, y, ctx.brushSize, ctx.colorIndex)
        }
        ctx.file.push(new PixelsPlaceUndoable(shape))
      }
    }
  }
  pointerUp(ctx: ToolContext, ptr: Pointer) {
    ctx.file.release()
    this.active = false
  }
}

export class EraserTool extends BrushTool {
  pointerDown(ctx: ToolContext & EraserToolContext, ptr: Pointer) {
    super.pointerDown({...ctx, colorIndex: 0}, ptr)
  }
  pointerMove(ctx: ToolContext & EraserToolContext, ptr: Pointer) {
    super.pointerMove({...ctx, colorIndex: 0}, ptr)
  }
}

export class FillTool implements Tool {
  private active: boolean
  isActive(): boolean {
    return this.active
  }
  
  private pixels: PixelPosition[] = []

  pointerDown(ctx: ToolContext & FloodToolContext, ptr: Pointer) {
    this.active = true
    this.pixels = []
    
    let traversed = new Set<number>()
    
    let p = ctx.file.canvas.getPixel(ptr.x, ptr.y)
    if (p !== -1) {
      let queue = [{x: ptr.x, y: ptr.y}]
      while (queue.length > 0) {
        let {x, y} = queue.shift()
        let index = y * ctx.file.canvas.width + x
        if (traversed.has(index)) {
          continue
        }
        traversed.add(index)
        let p2 = ctx.file.canvas.getPixel(x, y)
        if (p2 === p) {
          this.pixels.push({x, y, index: ctx.colorIndex})
          if (x > 0) queue.push({x: x-1, y})
          if (x < ctx.file.canvas.width-1) queue.push({x: x+1, y})
          if (y > 0) queue.push({x, y: y-1})
          if (y < ctx.file.canvas.height-1) queue.push({x, y: y+1})
        }
      }
    }
  }
  pointerMove(ctx: ToolContext & FloodToolContext, ptr: Pointer) {
  }
  pointerUp(ctx: ToolContext & FloodToolContext, ptr: Pointer) {
    ctx.file.push(new PixelsPlaceUndoable(this.pixels))
    this.active = false
  }
}

export class PickerTool implements Tool {
  private active: boolean
  isActive(): boolean {
    return this.active
  }

  pointerDown(ctx: ToolContext & PickerToolContext, ptr: Pointer) {
    this.active = true
    let p = ctx.file.canvas.getPixel(ptr.x, ptr.y)
    if (p !== -1) {
      ctx.setColorIndex(p)
    }
  }
  pointerMove(ctx: ToolContext & PickerToolContext, ptr: Pointer) {
    let p = ctx.file.canvas.getPixel(ptr.x, ptr.y)
    if (p !== -1) {
      ctx.setColorIndex(p)
    }
  }
  pointerUp(ctx: ToolContext & PickerToolContext, ptr: Pointer) {
    this.active = false
  }
}