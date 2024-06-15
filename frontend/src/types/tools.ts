import { type LoadedFile } from "./file"
import { PixelPlaceUndoable, PixelsPlaceUndoable, SelectionClearUndoable, SelectionSetUndoable, SelectionMoveUndoable } from "./file/undoables"
import { Preview } from "./preview"
import type { Pointer } from "./pointer"
import { FilledCircle, FilledSquare, RandomSpray, type PixelPosition } from "./shapes"
import type { CanvasView } from "./canvasview"

export interface ToolContext {
  file: LoadedFile
  view: CanvasView
}

export type BrushType = "circle" | "square"

// Tool is an interface that receives pointer events and can act upon a ToolContext (which contains data such as the current file).
export interface Tool {
  isActive(): boolean
  pointerDown(ctx: ToolContext, ptr: Pointer): void
  pointerMove(ctx: ToolContext, ptr: Pointer): void
  pointerUp(ctx: ToolContext, ptr: Pointer): void
}

// BrushToolContext provides context specific to the brush tool.
export interface BrushToolContext {
  brushSize: number
  brushType: BrushType
  colorIndex: number
  color: [number, number, number, number]
}

// SprayToolContext provides context specific to the spray tool.
export interface SprayToolContext {
  radius: number
  density: number
  colorIndex: number
  color: [number, number, number, number]
}

// EraserToolContext provides context specific to the eraser tool.
export interface EraserToolContext {
  brushSize: number
  brushType: BrushType
}

// FloodToolContext provides context specific to the flood tool.
export interface FloodToolContext {
  colorIndex: number
  color: [number, number, number, number]
}

// SelectionToolContext provides context specific to the selection tool.
export interface SelectionToolContext {
}

// PickerToolContext provides context specific to the picker tool.
export interface PickerToolContext {
  setColorIndex(index: number): void
}

// BrushTool is a tool that allows the user to draw with a brush.
export class BrushTool implements Tool {
  private lastX: number = -1
  private lastY: number = -1
  private active: boolean
  isActive(): boolean {
    return this.active
  }
  
  // FIXME: Move this to some standalone 2D utility library.
  drawLine(ctx: ToolContext & BrushToolContext, ptr: Pointer) {
    let startX = this.lastX
    let startY = this.lastY
    let endX = ptr.x
    let endY = ptr.y
    // Bresenham it
    let dx = Math.abs(endX - startX)
    let dy = Math.abs(endY - startY)
    let sx = (startX < endX) ? 1 : -1
    let sy = (startY < endY) ? 1 : -1
    let err = dx - dy
    while (true) {
      if (startX >= 0 && startY >= 0 && startX < ctx.file.canvas.width && startY < ctx.file.canvas.height) {
        if (ctx.brushSize == 1) {
          let p = ctx.file.canvas.getPixel(startX, startY)
          if (p !== -1 && ctx.file.selection.isPixelMarked(startX, startY)) {
            ctx.file.push(new PixelPlaceUndoable(startX, startY, p, ctx.colorIndex), ctx.view)
          }
        } else if (ctx.brushSize == 2) {
          for (let x1 = 0; x1 < 2; x1++) {
            for (let y1 = 0; y1 < 2; y1++) {
              let p = ctx.file.canvas.getPixel(startX+x1, startY+y1)
              if (p !== -1 && ctx.file.selection.isPixelMarked(startX+x1, startY+y1)) {
                ctx.file.push(new PixelPlaceUndoable(startX+x1, startY+y1, p, ctx.colorIndex), ctx.view)
              }
            }
          }
        } else {
          let shape: PixelPosition[]
          if (ctx.brushType == "circle") {
            shape = FilledCircle(startX, startY, ctx.brushSize-2, ctx.colorIndex)
          } else if (ctx.brushType == "square") {
            shape = FilledSquare(startX, startY, ctx.brushSize, ctx.colorIndex)
          }
          shape = shape.filter(p => ctx.file.selection.isPixelMarked(p.x, p.y))
          ctx.file.push(new PixelsPlaceUndoable(shape), ctx.view)
        }
      }
      if (startX == endX && startY == endY) break
      let e2 = 2*err
      if (e2 > -dy) {
        err -= dy
        startX += sx
      }
      if (e2 < dx) {
        err += dx
        startY += sy
      }
    }
  }

  pointerDown(ctx: ToolContext & BrushToolContext, ptr: Pointer) {
    // Do basic line drawing when shift is held.
    if (ptr.shift && this.lastX !== -1 && this.lastY !== -1) {
      this.active = true
      ctx.file.capture()
      this.drawLine(ctx, ptr)
      this.lastX = ptr.x
      this.lastY = ptr.y
      return
    }

    // Store last for interp.
    this.lastX = ptr.x
    this.lastY = ptr.y

    this.active = true
    ctx.file.capture()

    if (ctx.brushSize == 1) {
      let p = ctx.file.canvas.getPixel(ptr.x, ptr.y)
      if (p !== -1 && ctx.file.selection.isPixelMarked(ptr.x, ptr.y)) {
        ctx.file.push(new PixelPlaceUndoable(ptr.x, ptr.y, p, ctx.colorIndex), ctx.view)
      }
    } else if (ctx.brushSize == 2) {
      for (let x1 = 0; x1 < 2; x1++) {
        for (let y1 = 0; y1 < 2; y1++) {
          let p = ctx.file.canvas.getPixel(ptr.x+x1, ptr.y+y1)
          if (p !== -1 && ctx.file.selection.isPixelMarked(ptr.x+x1, ptr.y+y1)) {
            ctx.file.push(new PixelPlaceUndoable(ptr.x+x1, ptr.y+y1, p, ctx.colorIndex), ctx.view)
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
      shape = shape.filter(p => ctx.file.selection.isPixelMarked(p.x, p.y))
      ctx.file.push(new PixelsPlaceUndoable(shape), ctx.view)
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

      if (x < 0 || y < 0 || x >= ctx.file.canvas.width || y >= ctx.file.canvas.height) continue

      if (ctx.brushSize == 1) {
        let p = ctx.file.canvas.getPixel(x, y)
        if (p !== -1 && ctx.file.selection.isPixelMarked(x, y)) {
          ctx.file.push(new PixelPlaceUndoable(x, y, p, ctx.colorIndex), ctx.view)
        }
      } else if (ctx.brushSize == 2) {
        for (let x1 = 0; x1 < 2; x1++) {
          for (let y1 = 0; y1 < 2; y1++) {
            let p = ctx.file.canvas.getPixel(x+x1, y+y1)
            if (p !== -1 && ctx.file.selection.isPixelMarked(x+x1, y+y1)) {
              ctx.file.push(new PixelPlaceUndoable(x+x1, y+y1, p, ctx.colorIndex), ctx.view)
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
        shape = shape.filter(p => ctx.file.selection.isPixelMarked(p.x, p.y))
        ctx.file.push(new PixelsPlaceUndoable(shape), ctx.view)
      }
    }
  }
  pointerUp(ctx: ToolContext, ptr: Pointer) {
    ctx.file.release()
    this.active = false
  }
}

// EraserTool is basically the BrushTool, but with the color index set to 0 (meaning a transparent pixel).
export class EraserTool extends BrushTool {
  pointerDown(ctx: ToolContext & EraserToolContext, ptr: Pointer) {
    super.pointerDown({...ctx, colorIndex: 0}, ptr)
  }
  pointerMove(ctx: ToolContext & EraserToolContext, ptr: Pointer) {
    super.pointerMove({...ctx, colorIndex: 0}, ptr)
  }
}

// SprayTool implements a spray can tool.
export class SprayTool implements Tool {
  private active: boolean
  private lastX: number
  private lastY: number

  isActive(): boolean {
    return this.active
  }

  pointerDown(ctx: ToolContext & SprayToolContext, ptr: Pointer) {
    this.active = true
    this.lastX = ptr.x
    this.lastY = ptr.y
    ctx.file.capture()
    let pixels = RandomSpray(ptr.x, ptr.y, ctx.radius, ctx.density, ctx.colorIndex)
    pixels = pixels.filter(p => ctx.file.selection.isPixelMarked(p.x, p.y))
    ctx.file.push(new PixelsPlaceUndoable(pixels), ctx.view)
  }
  pointerMove(ctx: ToolContext & SprayToolContext, ptr: Pointer) {
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

      if (x < 0 || y < 0 || x >= ctx.file.canvas.width || y >= ctx.file.canvas.height) continue

      let pixels = RandomSpray(x, y, ctx.radius, ctx.density, ctx.colorIndex)
      pixels = pixels.filter(p => ctx.file.selection.isPixelMarked(p.x, p.y))
      ctx.file.push(new PixelsPlaceUndoable(pixels), ctx.view)
    }
  }
  pointerUp(ctx: ToolContext, ptr: Pointer): void {
    ctx.file.release()
    this.active = false
  }
}

// FillTool implements a flood fill tool.
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

    if (!ctx.file.selection.isPixelMarked(ptr.x, ptr.y)) {
      return
    }
    
    let p = ctx.file.canvas.getPixel(ptr.x, ptr.y)
    if (p !== -1) {
      let queue = [{x: ptr.x, y: ptr.y}]
      while (queue.length > 0) {
        let {x, y} = queue.shift()
        let index = y * ctx.file.canvas.width + x
        if (traversed.has(index) || !ctx.file.selection.isPixelMarked(x, y)) {
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
    ctx.file.push(new PixelsPlaceUndoable(this.pixels), ctx.view)
    this.active = false
  }
}

// PickerTool allows picking the color index from the canvas.
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

// SelectionTool allows selecting an area of the canvas.
export class SelectionTool implements Tool {
  private active: boolean
  private startX: number
  private startY: number
  private endX: number
  private endY: number

  isActive(): boolean {
    return this.active
  }

  getArea(): { x: number, y: number, width: number, height: number } {
    let x1 = Math.min(this.startX, this.endX)
    let x2 = Math.max(this.startX, this.endX)
    let y1 = Math.min(this.startY, this.endY)
    let y2 = Math.max(this.startY, this.endY)
    return {
      x: x1,
      y: y1,
      width: x2-x1+1,
      height: y2-y1+1,
    }
  }

  pointerDown(ctx: ToolContext & SelectionToolContext, ptr: Pointer) {
    ctx.file.selection.active = true
    this.startX = this.endX = ptr.x
    this.startY = this.endY = ptr.y
    this.active = true
  }
  pointerMove(ctx: ToolContext & SelectionToolContext, ptr: Pointer) {
    if (ptr.x < 0) ptr.x = 0
    if (ptr.y < 0) ptr.y = 0
    if (ptr.x >= ctx.file.canvas.width) ptr.x = ctx.file.canvas.width-1
    if (ptr.y >= ctx.file.canvas.height) ptr.y = ctx.file.canvas.height-1
    this.endX = ptr.x
    this.endY = ptr.y
  }
  pointerUp(ctx: ToolContext & SelectionToolContext, ptr: Pointer) {
    if (this.startX === this.endX && this.startY === this.endY) {
      ctx.file.push(new SelectionClearUndoable(), ctx.view)
      this.active = false
      return
    }

    let value = true
    let clear = false
    if (!ptr.shift && !ptr.control) {
      clear = true
    }
    if (ptr.control) {
      value = false
    }

    let {x: startX, y: startY, width, height} = this.getArea()

    let pixels: { x: number, y: number, marked: boolean }[] = []
    for (let x = startX; x <= startX+width-1; x++) {
      for (let y = startY; y <= startY+height-1; y++) {
        pixels.push({x, y, marked: value})
      }
    }

    ctx.file.push(new SelectionSetUndoable(pixels, clear), ctx.view)

    this.active = false
  }
}

// MagicWandTool implements a magic wand tool.
export class MagicWandTool implements Tool {
  private active: boolean

  isActive(): boolean {
    return this.active
  }

  pointerDown(ctx: ToolContext & FloodToolContext, ptr: Pointer) {
    this.active = true
    let pixels: { x: number, y: number, marked: boolean }[] = []
    
    let traversed = new Set<number>()

    let value = true
    let clear = false
    if (!ptr.shift && !ptr.control) {
      clear = true
    }
    if (ptr.control) {
      value = false
    }

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
          pixels.push({x, y, marked: value})
          if (x > 0) queue.push({x: x-1, y})
          if (x < ctx.file.canvas.width-1) queue.push({x: x+1, y})
          if (y > 0) queue.push({x, y: y-1})
          if (y < ctx.file.canvas.height-1) queue.push({x, y: y+1})
        }
      }
    }

    ctx.file.selection.active = true
    ctx.file.push(new SelectionSetUndoable(pixels, clear), ctx.view)
  }
  pointerMove(ctx: ToolContext & FloodToolContext, ptr: Pointer) {
  }
  pointerUp(ctx: ToolContext & FloodToolContext, ptr: Pointer) {
    this.active = false
  }
}

// MoveTool implements a tool to move pixels within a selection.
export class MoveTool implements Tool {
  private active: boolean
  private startX: number
  private startY: number
  private endX: number
  private endY: number
  public preview: Preview

  isActive(): boolean {
    return this.active
  }
  
  previewPosition(): ({x: number, y: number}) {
    return {x: this.endX - this.startX + this.preview.x, y: this.endY - this.startY + this.preview.y}
  }

  shift(ctx: ToolContext, ptr: Pointer) {
    this.startX = 0
    this.startY = 0
    this.endX = ptr.x
    this.endY = ptr.y
    this.pointerUp(ctx, ptr)
  }
  pointerDown(ctx: ToolContext, ptr: Pointer) {
    this.preview = new Preview()
    this.preview.fromSelectionAndCanvas(ctx.file.selection, ctx.file.canvas)
    this.startX = this.endX = ptr.x
    this.startY = this.endY = ptr.y
    this.active = true
  }
  pointerMove(ctx: ToolContext, ptr: Pointer) {
    this.preview.fromSelectionAndCanvas(ctx.file.selection, ctx.file.canvas)
    this.endX = ptr.x
    this.endY = ptr.y
  }
  pointerUp(ctx: ToolContext, ptr: Pointer) {
    if (this.startX === this.endX && this.startY === this.endY) {
      this.active = false
      return
    }

    let dx = this.endX - this.startX
    let dy = this.endY - this.startY

    let pixels: { x: number, y: number, index: number }[] = []
    let clearPixels: { x: number, y: number, index: number }[] = []
    for (let x = 0; x < ctx.file.canvas.width; x++) {
      for (let y = 0; y < ctx.file.canvas.height; y++) {
        if (ctx.file.selection.isPixelMarked(x, y)) {
          let p = ctx.file.canvas.getPixel(x, y)
          let { a } = ctx.file.canvas.getPaletteAsRGBA(p)
          // FIXME: Do we really want to treat 0 as transparent index? Additionally, for RGBA, we probably want to merge the colors and create a new entry... maybe this should be handled in PixelsPlaceUndoable within the file class...
          if (a !== 0) {
            if (x+dx >= 0 && x+dx < ctx.file.canvas.width && y+dy >= 0 && y+dy < ctx.file.canvas.height) {
              pixels.push({x: x+dx, y: y+dy, index: p})
            }
            clearPixels.push({x, y, index: 0})
          }
        }
      }
    }

    ctx.file.capture()
    ctx.file.push(new SelectionMoveUndoable(-dx, -dy), ctx.view)
    ctx.file.push(new PixelsPlaceUndoable(clearPixels), ctx.view)
    ctx.file.push(new PixelsPlaceUndoable(pixels), ctx.view)
    ctx.file.release()
    this.active = false
  }
}

/* BEGIN VOXEL TOOLS */

export class PlaceVoxelTool implements Tool {
  isActive(): boolean {
    return false
  }
  pointerDown(ctx: ToolContext, ptr: Pointer): void {
  }
  pointerUp(ctx: ToolContext, ptr: Pointer): void {
  }
  pointerMove(ctx: ToolContext, ptr: Pointer): void {
  }
}

export class ReplaceVoxelTool implements Tool {
  isActive(): boolean {
    return false
  }
  pointerDown(ctx: ToolContext, ptr: Pointer): void {
  }
  pointerUp(ctx: ToolContext, ptr: Pointer): void {
  }
  pointerMove(ctx: ToolContext, ptr: Pointer): void {
  }
}