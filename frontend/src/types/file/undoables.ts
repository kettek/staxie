import { LoadedFile } from '../file'
import { type Undoable } from '../undo'
import { type StaxFrame, type StaxStack, type StaxSlice } from '../png'

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
  clone(): PixelPlaceUndoable {
    return new PixelPlaceUndoable(this.x, this.y, this.oldIndex, this.newIndex)
  }
}

export class PixelsPlaceUndoable implements Undoable<LoadedFile> {
  private oldPixels: { x: number, y: number, index: number }[]
  public pixels: { x: number, y: number, index: number }[]
  constructor(pixels: {x: number, y: number, index: number}[]) {
    this.oldPixels = []
    this.pixels = pixels
  }
  apply(file: LoadedFile) {
    for (let pixel of this.pixels) {
      let p = file.canvas.getPixel(pixel.x, pixel.y)
      this.oldPixels.push({x: pixel.x, y: pixel.y, index: p})
    }
    for (let pixel of this.pixels) {
      file.canvas.setPixel(pixel.x, pixel.y, pixel.index)
    }
  }
  unapply(file: LoadedFile) {
    for (let pixel of this.oldPixels) {
      file.canvas.setPixel(pixel.x, pixel.y, pixel.index)
    }
  }
  clone(): PixelsPlaceUndoable {
    return new PixelsPlaceUndoable(this.pixels)
  }
}

export class SelectionSetUndoable implements Undoable<LoadedFile> {
  private oldPixels: { x: number, y: number, marked: boolean }[] = []
  public pixels: { x: number, y: number, marked: boolean }[]
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
  clone(): SelectionSetUndoable {
    return new SelectionSetUndoable(this.pixels, this.clear)
  }
}

export class SelectionMoveUndoable implements Undoable<LoadedFile> {
  private oldPixels: { x: number, y: number, marked: boolean }[] = []

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
  clone(): SelectionMoveUndoable {
    return new SelectionMoveUndoable(this.dx, this.dy)
  }
}

export class SelectionClearUndoable implements Undoable<LoadedFile> {
  private oldPixels: { x: number, y: number, marked: boolean }[]
  private oldActive: boolean = false
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
  clone(): SelectionClearUndoable {
    return new SelectionClearUndoable()
  }
}

export class ReplacePaletteUndoable implements Undoable<LoadedFile> {
  private oldPalette: Uint32Array = new Uint32Array([])
  private newPalette: Uint32Array
  constructor(newPalette: Uint32Array) {
    this.newPalette = newPalette
  }
  apply(file: LoadedFile) {
    this.oldPalette = new Uint32Array([...file.canvas.palette])
    file.canvas.palette = this.newPalette
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  unapply(file: LoadedFile) {
    file.canvas.palette = this.oldPalette
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
}

export class ReplaceSwatchUndoable implements Undoable<LoadedFile> {
  private index: number

  private red: number
  private green: number
  private blue: number
  private alpha: number

  private oldRed: number = 0
  private oldGreen: number = 0
  private oldBlue: number = 0
  private oldAlpha: number = 0

  constructor(index: number, red: number, green: number, blue: number, alpha: number) {
    this.index = index
    this.red = red
    this.green = green
    this.blue = blue
    this.alpha = alpha
  }
  apply(file: LoadedFile) {
    let r = file.canvas.palette[this.index] & 0xFF
    let g = (file.canvas.palette[this.index] >> 8) & 0xFF
    let b = (file.canvas.palette[this.index] >> 16) & 0xFF
    let a = (file.canvas.palette[this.index] >> 24) & 0xFF
    this.oldRed = r
    this.oldGreen = g
    this.oldBlue = b
    this.oldAlpha = a
    file.canvas.replacePaletteColor(this.index, this.red, this.green, this.blue, this.alpha)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  unapply(file: LoadedFile) {
    file.canvas.replacePaletteColor(this.index, this.oldRed, this.oldGreen, this.oldBlue, this.oldAlpha)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
}

export class AddSwatchUndoable implements Undoable<LoadedFile> {
  private red: number
  private green: number
  private blue: number
  private alpha: number
  constructor(red: number, green: number, blue: number, alpha: number) {
    this.red = red
    this.green = green
    this.blue = blue
    this.alpha = alpha
  }
  apply(file: LoadedFile) {
    file.canvas.addNewPaletteColor(this.red, this.green, this.blue, this.alpha)
  }
  unapply(file: LoadedFile) {
   file.canvas.removePaletteIndex(-1)
  }
}

export class RemoveSwatchUndoable implements Undoable<LoadedFile> {
  private index: number
  private replaceIndex: number=  -1
  private shiftPixels: boolean = false
  
  private oldRed: number = 0
  private oldGreen: number = 0
  private oldBlue: number = 0
  private oldAlpha: number = 0

  private oldPixels: { x: number, y: number, index: number }[]

  constructor(index: number, replaceIndex?: number, shiftPixels?: boolean) {
    this.index = index
    if (replaceIndex !== undefined) {
      this.replaceIndex = replaceIndex
    }
    if (shiftPixels !== undefined) {
      this.shiftPixels = shiftPixels
    }
    this.oldPixels = []
  }
  apply(file: LoadedFile) {
    let r = file.canvas.palette[this.index] & 0xFF
    let g = (file.canvas.palette[this.index] >> 8) & 0xFF
    let b = (file.canvas.palette[this.index] >> 16) & 0xFF
    let a = (file.canvas.palette[this.index] >> 24) & 0xFF
    this.oldRed = r
    this.oldGreen = g
    this.oldBlue = b
    this.oldAlpha = a
    
    if (this.replaceIndex >= 0) {
      // Collect our pixels as we replace them so we can undo them.
      for (let y = 0; y < file.canvas.height; y++) {
        for (let x = 0; x < file.canvas.width; x++) {
          let p = file.canvas.getPixel(x, y)
          if (p === this.index) {
            this.oldPixels.push({x, y, index: p})
            file.canvas.setPixel(x, y, this.replaceIndex)
          }
        }
      }
    }

    file.canvas.removePaletteIndex(this.index, this.shiftPixels)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  unapply(file: LoadedFile) {
    file.canvas.insertPaletteColor(this.index, this.oldRed, this.oldGreen, this.oldBlue, this.oldAlpha, this.shiftPixels)

    if (this.replaceIndex >= 0) {
      for (let pixel of this.oldPixels) {
        file.canvas.setPixel(pixel.x, pixel.y, pixel.index)
      }
    }
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
}

export class SwapSwatchUndoable implements Undoable<LoadedFile> {
  private index1: number
  private index2: number
  private updatePixels: boolean
  constructor(index1: number, index2: number, updatePixels: boolean = true) {
    this.index1 = index1
    this.index2 = index2
    this.updatePixels = updatePixels
  }
  apply(file: LoadedFile) {
    if (this.updatePixels) {
      for (let y = 0; y < file.canvas.height; y++) {
        for (let x = 0; x < file.canvas.width; x++) {
          let p = file.canvas.getPixel(x, y)
          if (p === this.index1) {
            file.canvas.setPixel(x, y, this.index2)
          } else if (p === this.index2) {
            file.canvas.setPixel(x, y, this.index1)
          }
        }
      }
    }
    file.canvas.swapPaletteColors(this.index1, this.index2)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  unapply(file: LoadedFile) {
    if (this.updatePixels) {
      for (let y = 0; y < file.canvas.height; y++) {
        for (let x = 0; x < file.canvas.width; x++) {
          let p = file.canvas.getPixel(x, y)
          if (p === this.index1) {
            file.canvas.setPixel(x, y, this.index2)
          } else if (p === this.index2) {
            file.canvas.setPixel(x, y, this.index1)
          }
        }
      }
    }
    file.canvas.swapPaletteColors(this.index2, this.index1)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
}

export class MoveSwatchUndoable implements Undoable<LoadedFile> {
  private index: number
  private newIndex: number
  private updatePixels: boolean
  private oldPixels: { x: number, y: number, index: number }[] = []
  constructor(index: number, newIndex: number, updatePixels: boolean = true) {
    this.index = index
    this.newIndex = newIndex
    this.updatePixels = updatePixels
  }
  apply(file: LoadedFile) {
    if (this.updatePixels) {
      for (let y = 0; y < file.canvas.height; y++) {
        for (let x = 0; x < file.canvas.width; x++) {
          let p = file.canvas.getPixel(x, y)
          if (p >= this.newIndex && p < this.index) {
            file.canvas.setPixel(x, y, p + 1)
          } else if (p === this.index) {
            file.canvas.setPixel(x, y, this.newIndex)
          }
        }
      }
    }

    file.canvas.movePaletteColor(this.index, this.newIndex)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  unapply(file: LoadedFile) {
    if (this.updatePixels) {
      for (let y = 0; y < file.canvas.height; y++) {
        for (let x = 0; x < file.canvas.width; x++) {
          let p = file.canvas.getPixel(x, y)
          if (p === this.newIndex) {
            file.canvas.setPixel(x, y, this.index)
          } else if (p > this.newIndex && p <= this.index) {
            file.canvas.setPixel(x, y, p - 1)
          }
        }
      }
    }

    file.canvas.movePaletteColor(this.newIndex, this.index)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
}

export class ChangeColorModeUndoable implements Undoable<LoadedFile> {
  private newIndexed: boolean
  private oldIndexed: boolean = false
  constructor(value: boolean) {
    this.newIndexed = value
  }
  apply(file: LoadedFile) {
    this.oldIndexed = file.canvas.isIndexed
    file.canvas.isIndexed = this.newIndexed
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  unapply(t: LoadedFile): void {
    t.canvas.isIndexed = this.oldIndexed
    t.canvas.refreshImageData()
    t.canvas.refreshCanvas()
  }
}

export class ChangeFrameTimeUndoable implements Undoable<LoadedFile> {
  private stack: string
  private animation: string
  private frameTime: number
  private previousFrameTime: number = 100
  constructor(stack: string, animation: string, frameTime: number) {
    this.stack = stack
    this.animation = animation
    this.frameTime = frameTime
  }
  apply(file: LoadedFile) {
    let a = file.getAnimation(this.stack, this.animation)
    if (a) {
      this.previousFrameTime = a.frameTime
      a.frameTime = this.frameTime
    }
  }
  unapply(file: LoadedFile) {
    let a = file.getAnimation(this.stack, this.animation)
    if (a) {
      a.frameTime = this.previousFrameTime
    }
  }
}

/** BEGIN STAX-RELATED CANVAS RESIZE TYPE Undoables */
export class AddStackUndoable implements Undoable<LoadedFile> {
  private stack: string= ''
  constructor() {
  }
  apply(file: LoadedFile) {
    let name = 'stack 0'
    for (let count = 0; file.stacks.find(g => g.name === name); name = `stack ${count++}`) {}
    this.stack = name
    file.stacks.push({name: this.stack, animations: [{
      name: 'animation',
      frameTime: 100,
      frames: [{slices: Array.from({length: 1}, (_=>({shading: 1, x: 0, y: 0})))}],
    }], sliceCount: 1})
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.

    // Grow our canvas by 1 frameHeight
    let {x, y, width, height} = file.getStackArea(this.stack)
    let newHeight = file.canvas.height + height
    let fullWidth = Math.max(file.canvas.width, width)
    
    // Grow our canvas.
    file.canvas.resizeCanvas(fullWidth, newHeight)
    
    // Shift all pixels all the pixels after stack's Y down.
    let followingPixelsHeight = file.canvas.height - (y + height)
    if (followingPixelsHeight > 0) {
      let pixels = file.canvas.getPixels(x, y, fullWidth, followingPixelsHeight)
      file.canvas.setPixels(x, y+height, fullWidth, followingPixelsHeight, pixels)
    }
    
    // Clear our new area.
    file.canvas.clearPixels(x, y, fullWidth, height)
  }
  unapply(file: LoadedFile) {
    let {x, y, width, height} = file.getStackArea(this.stack)
    let newHeight = file.canvas.height - height
    let fullWidth = Math.max(file.canvas.width, width)
    
    // Shift all our pixels back up.
    let followingPixelsHeight = file.canvas.height - (y + height)
    if (followingPixelsHeight > 0) {
      let pixels = file.canvas.getPixels(x, y+height, fullWidth, followingPixelsHeight)
      file.canvas.setPixels(x, y, fullWidth, followingPixelsHeight, pixels)
    }
    
    // Shrink canvas.
    file.canvas.resizeCanvas(fullWidth, newHeight)

    // Iterate from end to beginning, as we add stacks to the end.
    for (let i = file.stacks.length - 1; i >= 0; i--) {
      if (file.stacks[i].name === this.stack) {
        file.stacks.splice(i, 1)
        break
      }
    }
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class RemoveStackUndoable implements Undoable<LoadedFile> {
  private stackName: string
  private stack: StaxStack
  private stackIndex: number
  private x: number
  private y: number
  private width: number
  private height: number
  private fromY: number
  private fromHeight: number
  private pixels: Uint8Array
  constructor(stackName: string) {
    this.stackName = stackName
  }
  apply(file: LoadedFile) {
    this.stackIndex = file.stacks.findIndex(g => g.name === this.stackName)
    if (this.stackIndex === -1) {
      throw new Error('stack not found: ' + this.stackName)
    }
    this.stack = file.stacks[this.stackIndex]
    // Get our stack's total width/height, store the pixels, clear the area, then shift all pixels below this stack to its position. Shrink the canvas by height.
    // Get and clear area.
    let {x, y, width, height } = file.getStackArea(this.stackName) // FIXME: This can be cached.
    if (width === 0 || height === 0) return // Do nothing if empty.
    let pixels = file.canvas.getPixels(x, y, width, height)
    file.canvas.clearPixels(x, y, width, height)
    // Shift up.
    let fromX = 0
    let fromY = y + height
    let fromWidth = file.canvas.width
    let fromHeight = file.canvas.height - fromY
    let fromPixels = file.canvas.getPixels(fromX, fromY, fromWidth, fromHeight)
    file.canvas.setPixels(x, y, fromWidth, fromHeight, fromPixels)
    // Store.
    this.pixels = pixels
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.fromY = fromY
    this.fromHeight = fromHeight
    // Shrink.
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - height)
    file.stacks.splice(this.stackIndex, 1)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    file.stacks.splice(this.stackIndex, 0, this.stack)
    // Grow our canvas by pixel width/height, shift all pixels below position + height down by height, then paste the pixels back in.
    // Grow canvas.
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height + this.height)
    // Get and shift previously shifted pixels back down.
    let pixels = file.canvas.getPixels(this.x, this.y, file.canvas.width, this.fromHeight)
    file.canvas.setPixels(this.x, this.y+this.height, file.canvas.width, this.fromHeight, pixels)
    // Restore old pixels.
    file.canvas.setPixels(this.x, this.y, this.width, this.height, this.pixels)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class MoveStackUndoable implements Undoable<LoadedFile> {
  private stack: string
  private oldIndex: number
  private newIndex: number
  constructor(stack: string, oldIndex: number, newIndex: number) {
  }
  apply(file: LoadedFile) {
    // TODO: Lazymode -- get our pixels for our stacks between our two move stacks, get our pixels for our first and second move stack, clear pixels from first through second, then paste the pixels for our from to our to position, our to to our end position -to's height, then paste the between pixels between the two.
  }
  unapply(file: LoadedFile) {
    // TODO: Part of above lazy mode, clear out old pixels, then position to, from, and between pixels.
  }
}

export class RenameStackUndoable implements Undoable<LoadedFile> {
  private stack: string
  private oldName: string = ''
  private newName: string
  constructor(stack: string, newName: string) {
    this.stack = stack
    this.newName = newName
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find(g => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    this.oldName = g.name
    g.name = this.newName
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find(g => g.name === this.newName)
    if (!g) {
      throw new Error('stack not found: ' + this.newName)
    }
    g.name = this.oldName
  }
}

export class DuplicateStackUndoable implements Undoable<LoadedFile> {
  private stack: string
  private name: string = ''
  private stackX: number = -1
  private stackY: number = -1
  private stackWidth: number = -1
  private stackHeight: number = -1
  constructor(stack: string) {
    this.stack = stack
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find(g => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    let name = this.stack + ' copy'
    for (let count = 0; file.stacks.find(g => g.name === name); name = `${this.stack} copy ${count++}`) {}
    this.name = name

    let { x, y, width, height } = file.getStackArea(this.stack)
    this.stackX = x
    this.stackY = y
    this.stackWidth = file.canvas.width
    this.stackHeight = height

    // 1. Get pixels to copy
    let stackPixels = file.canvas.getPixels(x, y, file.canvas.width, height)
    // 2. Resize canvas
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height + height)
    // 3. Shift all pixels after stack area down by stack area's height*2
    let pixels = file.canvas.getPixels(x, y + height, file.canvas.width, file.canvas.height - (y + height))
    file.canvas.setPixels(x, y + height * 2, file.canvas.width, file.canvas.height - (y + height), pixels)
    // 4. Set pixels at stack area + stack area height to stored
    file.canvas.setPixels(x, y + height, file.canvas.width, height, stackPixels)
    // 5. Update data structure
    file.stacks.splice(file.stacks.findIndex(g => g.name === this.stack) + 1, 0, {name, animations: JSON.parse(JSON.stringify(g.animations)), sliceCount: g.sliceCount})
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile): void {
    let g = file.stacks.find(g => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    // 1. Shift all pixels after stack area up by stack area's height
    let pixels = file.canvas.getPixels(this.stackX, this.stackY + this.stackHeight * 2, this.stackWidth, file.canvas.height - (this.stackY + this.stackHeight))
    file.canvas.setPixels(this.stackX, this.stackY + this.stackHeight, this.stackWidth, file.canvas.height - (this.stackY + this.stackHeight), pixels)
    // 2. Resize canvas
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - this.stackHeight)
    // 3. Update data structure
    file.stacks.splice(file.stacks.findIndex(g => g.name === this.name), 1)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class GrowStackSliceUndoable implements Undoable<LoadedFile> {
  private stack: string
  private sliceCount: number
  constructor(stack: string, sliceCount: number) {
    this.stack = stack
    this.sliceCount = sliceCount
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find(g => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    
    let sliceCount = g.sliceCount + this.sliceCount
    let newWidth = sliceCount * file.frameWidth
    if (file.canvas.width < newWidth) {
      file.canvas.resizeCanvas(newWidth, file.canvas.height)
    }
    for (let s = g.sliceCount; s < sliceCount; s++) {
      for (let a of g.animations) {
        for (let f of a.frames) {
          f.slices.push({shading: 1, x: 0, y: 0})
        }
      }
    }
    g.sliceCount = sliceCount
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    // Reverse of above.
    let g = file.stacks.find(g => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
      
    for (let s = g.sliceCount - 1; s >= g.sliceCount - this.sliceCount; s--) {
      for (let a of g.animations) {
        for (let f of a.frames) {
          f.slices.pop()
        }
      }
    }
    let sliceCount = g.sliceCount - this.sliceCount
    let targetWidth = sliceCount * file.frameWidth
    g.sliceCount = sliceCount
    for (let stack of file.stacks) {
      targetWidth = Math.max(targetWidth, stack.sliceCount * file.frameWidth)
    }
    // Shrink the canvas if no stacks are wider than our changing stack.
    if (file.canvas.width > targetWidth) {
      file.canvas.resizeCanvas(targetWidth, file.canvas.height)
    }
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class ShrinkStackSliceUndoable implements Undoable<LoadedFile> {
  private stack: string
  private sliceCount: number
  private slices: StaxSlice[][][]
  private pixels: Uint8Array
  private pixelsWidth: number
  private pixelsHeight: number
  private pixelsX: number
  private pixelsY: number
  constructor(stack: string, sliceCount: number) {
    this.stack = stack
    this.sliceCount = sliceCount
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find(g => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    
    let sliceCount = g.sliceCount - this.sliceCount
    let newWidth = sliceCount * file.frameWidth
    
    let {x, y, width, height} = file.getStackArea(this.stack)
    this.pixelsX = x+newWidth
    this.pixelsY = y
    this.pixelsWidth = width - newWidth
    this.pixelsHeight = height
    this.pixels = file.canvas.getPixels(this.pixelsX, this.pixelsY, this.pixelsWidth, this.pixelsHeight)
    
    this.slices = []
    for (let a of g.animations) {
      let fslices = []
      for (let f of a.frames) {
        fslices.push(f.slices.splice(f.slices.length-this.sliceCount, this.sliceCount))
      }
      this.slices.push(fslices)
    }
    
    g.sliceCount = sliceCount
    // Get our maximum width (each stack's slices * file.frameWidth)
    let targetWidth = newWidth
    for (let stack of file.stacks) {
      targetWidth = Math.max(targetWidth, stack.sliceCount * file.frameWidth)
    }
    
    if (file.canvas.width > targetWidth) { // Shrink the canvas if no stacks are wider than our changing stack.
      // Resize the canvas.
      file.canvas.resizeCanvas(targetWidth, file.canvas.height)
    } else { // Otherwise just clear the area where our stack's old slices were.
      file.canvas.clearPixels(x+newWidth, y, width-newWidth, height)
    }
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    // Reverse of above.
    let g = file.stacks.find(g => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
      
    let sliceCount = g.sliceCount + this.sliceCount
    let newWidth = sliceCount * file.frameWidth
    if (file.canvas.width < newWidth) { // Grow it again.
      file.canvas.resizeCanvas(newWidth, file.canvas.height)
    }
    // Paste back in our pixels.
    file.canvas.setPixels(this.pixelsX, this.pixelsY, this.pixelsWidth, this.pixelsHeight, this.pixels)
    for (let a of g.animations) {
      let aslice = this.slices.shift()
      for (let f of a.frames) {
        let fslice = aslice.shift()
        f.slices.push(...fslice)
      }
    }
    g.sliceCount = sliceCount
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class DuplicateSliceUndoable implements Undoable<LoadedFile> {
  private stack: string
  private sliceIndex: number
  private growUndoable: GrowStackSliceUndoable
  constructor(stack: string, sliceIndex: number) {
    this.stack = stack
    this.sliceIndex = sliceIndex
    this.growUndoable = new GrowStackSliceUndoable(stack, 1)
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find(g => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }

    let { x, y, width, height } = file.getStackArea(this.stack)
    x += this.sliceIndex * file.frameWidth
    width -= this.sliceIndex * file.frameWidth

    this.growUndoable.apply(file)
    
    let pixels = file.canvas.getPixels(x, y, width, height)
    file.canvas.setPixels(x+file.frameWidth, y, width, height, pixels)

    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find(g => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    
    let { x, y, width, height } = file.getStackArea(this.stack)
    x += this.sliceIndex * file.frameWidth
    width -= this.sliceIndex * file.frameWidth
    
    let pixels = file.canvas.getPixels(x+file.frameWidth, y, width, height)
    file.canvas.setPixels(x, y, width, height, pixels)

    this.growUndoable.unapply(file)
    
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class ClearSliceUndoable implements Undoable<LoadedFile> {
  private frame: StaxFrame
  private sliceIndex: number
  // @ts-expect-error
  private pixels: Uint8Array
  // Yeah, yeah, this constructor is different, don't care.
  constructor(frame: StaxFrame, sliceIndex: number) {
    this.frame = frame
    this.sliceIndex = sliceIndex
  }
  apply(file: LoadedFile) {
    let {x, y, width, height} = file.getSliceAreaFromFrame(this.frame, this.sliceIndex)

    this.pixels = file.canvas.getPixels(x, y, width, height)
    file.canvas.clearPixels(x, y, width, height)
  }
  unapply(file: LoadedFile) {
    let {x, y, width, height} = file.getSliceAreaFromFrame(this.frame, this.sliceIndex)
    file.canvas.setPixels(x, y, width, height, this.pixels)
  }
}

export class RemoveSliceUndoable implements Undoable<LoadedFile> {
  private stack: string
  private sliceIndex: number
  private slicedPixels: Uint8Array = new Uint8Array([])
  private storedAnimationSlices: StaxSlice[][] = []
  constructor(stack: string, sliceIndex: number) {
    this.stack = stack
    this.sliceIndex = sliceIndex
  }
  apply(file: LoadedFile) {
    let s = file.stacks.find(g => g.name === this.stack)
    if (!s) {
      throw new Error('stack not found: ' + this.stack)
    }

    let { x, y, width, height } = file.getStackArea(this.stack)
    x += this.sliceIndex * file.frameWidth
    width -= this.sliceIndex * file.frameWidth
    let sliceX = this.sliceIndex * file.frameWidth
    let sliceWidth = file.frameWidth

    // Store our slices to remove.
    this.slicedPixels = file.canvas.getPixels(sliceX, y, sliceWidth, height)
    
    // Shift our pixels to the left.
    let pixels = file.canvas.getPixels(x+file.frameWidth, y, width-file.frameWidth, height)
    file.canvas.setPixels(x, y, width-file.frameWidth, height, pixels)

    // See if we can shrink our canvas.
    let targetWidth = (s.sliceCount - 1) * file.frameWidth
    for (let s of file.stacks) {
      targetWidth = Math.max(targetWidth, s.sliceCount * file.frameWidth)
    }

    if (file.canvas.width > targetWidth) {
      file.canvas.resizeCanvas(targetWidth, file.canvas.height)
    } else {
      // Otherwise, clear the last to the right.
      let { x, y, width, height } = file.getStackArea(this.stack)
      file.canvas.clearPixels(x+width-file.frameWidth, y, file.frameWidth, height)
    }

    // Clean up our data.
    for (let a of s.animations) {
      let aslices: StaxSlice[] = []
      for (let f of a.frames) {
        aslices.push(f.slices.splice(this.sliceIndex, 1)[0])
      }
      this.storedAnimationSlices.push(aslices)
    }
    s.sliceCount--

    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    let s = file.stacks.find(g => g.name === this.stack)
    if (!s) {
      throw new Error('stack not found: ' + this.stack)
    }

    // Regrow canvas first if we need.
    let targetWidth = (s.sliceCount + 1) * file.frameWidth
    for (let s of file.stacks) {
      targetWidth = Math.max(targetWidth, s.sliceCount * file.frameWidth)
    }
    if (file.canvas.width < targetWidth) {
      file.canvas.resizeCanvas(targetWidth, file.canvas.height)
    }
    
    // Shift our pixels back to the right.
    let { x, y, width, height } = file.getStackArea(this.stack)
    x += this.sliceIndex * file.frameWidth
    width -= this.sliceIndex * file.frameWidth

    let pixels = file.canvas.getPixels(x, y, width, height)
    file.canvas.setPixels(x+file.frameWidth, y, width, height, pixels)

    // Restore old pixels.
    file.canvas.setPixels(x, y, file.frameWidth, height, this.slicedPixels)

    // Restore our data.
    for (let ai = 0; ai < s.animations.length; ai++) {
      let a = s.animations[ai]
      let aslices = this.storedAnimationSlices[ai]
      for (let fi = 0; fi < a.frames.length; fi++) {
        let f = a.frames[fi]
        f.slices.splice(this.sliceIndex, 0, aslices[fi])
      }
    }

    s.sliceCount++
    
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class AddAnimationUndoable implements Undoable<LoadedFile> {
  private stack: string
  constructor(stack: string) {
    this.stack = stack
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find(g => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    
    let name = "animation"
    let count = 0
    for (let a of g.animations) {
      if (name === a.name) {
        count++
        name = `animation ${count}`
      }
    }

    // Grow our canvas by 1 frameHeight
    let {x, y, width, height} = file.getStackArea(this.stack)
    let newHeight = file.canvas.height + file.frameHeight
    let fullWidth = Math.max(file.canvas.width, width)
    
    // Grow our canvas.
    file.canvas.resizeCanvas(fullWidth, newHeight)
    
    // Shift all pixels after our animation area down.
    let followingPixelsHeight = file.canvas.height - (y + height)
    if (followingPixelsHeight > 0) {
      let pixels = file.canvas.getPixels(x, y+height, fullWidth, followingPixelsHeight)
      file.canvas.setPixels(x, y+height+file.frameHeight, fullWidth, followingPixelsHeight, pixels)
    }
    
    // Clear our new area.
    file.canvas.clearPixels(x, y+height, fullWidth, file.frameHeight)

    // Add our new stax.
    let anim: StaxAnimation = {
      name,
      frameTime: 100,
      frames: [{slices: Array.from({length: g.sliceCount}, (_=>({shading: 1, x: 0, y: 0})))}],
    }
    g.animations.push(anim)
    
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find(g => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }

    // Acquire our pixels after our area and potentially shift them back.
    let {x, y, width, height} = file.getStackArea(this.stack)
    let fullWidth = Math.max(file.canvas.width, width)
    
    let followingPixelsHeight = file.canvas.height - (y + height)
    if (followingPixelsHeight > 0) {
      let pixels = file.canvas.getPixels(x, y+height, fullWidth, followingPixelsHeight)
      // Move 'em back in place.
      file.canvas.setPixels(x, y+height-file.frameHeight, fullWidth, followingPixelsHeight, pixels)
    }
    // Shrink our canvas by 1 frameHeight
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - file.frameHeight)

    g.animations.pop()
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class RemoveAnimationUndoable implements Undoable<LoadedFile> {
  private stack: string
  private animation: string
  private pixels: Uint8Array
  private x: number
  private y: number
  private width: number
  private height: number
  private anim: StaxAnimation
  private animIndex: number
  constructor(stack: string, animation: string) {
    this.stack = stack
    this.animation = animation
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find(v=>v.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    let a = g.animations.find(v=>v.name === this.animation)
    if (!a) {
      throw new Error('animation not found: ' + this.animation)
    }

    let {x, y, width, height} = file.getAnimationArea(this.stack, this.animation)
    if (height > 0) {
      this.pixels = file.canvas.getPixels(x, y, width, height)
      this.x = x
      this.y = y
      this.width = width
      this.height = height
    }
    this.anim = a
    
    for (let i = 0; i < g.animations.length; i++) {
      if (g.animations[i].name === this.animation) {
        this.animIndex = i
        break
      }
    }
    g.animations.splice(this.animIndex, 1)

    let remainingHeight = file.canvas.height - (y + height)
    if (remainingHeight > 0) {
      let pixels = file.canvas.getPixels(x, y+height, width, remainingHeight)
      file.canvas.setPixels(x, y, width, remainingHeight, pixels)
    }
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - height)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find(v=>v.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }

    if (this.pixels) {
      file.canvas.resizeCanvas(file.canvas.width, file.canvas.height + this.height)
      let pixels = file.canvas.getPixels(this.x, this.y, this.width, file.canvas.height - (this.y+this.height))
      file.canvas.setPixels(this.x, this.y+this.height, this.width, file.canvas.height - (this.y+this.height), pixels)
      file.canvas.setPixels(this.x, this.y, this.width, this.height, this.pixels)
    }
    g.animations.splice(this.animIndex, 0, this.anim)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class MoveAnimationUndoable implements Undoable<LoadedFile> {
  private stack: string
  private animation: string
  private oldIndex: number
  private newIndex: number
  constructor(stack: string, animation: string, oldIndex: number, newIndex: number) {
  }
  apply(file: LoadedFile) {
    // TODO: See logic for MoveStackUndoable, but apply to the stack's animations.
  }
  unapply(file: LoadedFile) {
    // TODO: See logic for MoveStackUndoable, but apply to the stack's animations.
  }
}

export class DuplicateAnimationUndoable implements Undoable<LoadedFile> {
  private stack: string
  private animation: string
  private name: string = ''
  private areaX: number = -1
  private areaY: number = -1
  private areaWidth: number = -1
  private areaHeight: number = -1
  constructor(stack: string, animation: string) {
    this.stack = stack
    this.animation = animation
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find(g => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    let a = g.animations.find(v=>v.name === this.animation)
    if (!a) {
      throw new Error('animation not found: ' + this.animation)
    }
    let name = this.animation + ' copy'
    for (let count = 0; g.animations.find(a => a.name === name); name = `${this.animation} copy ${count++}`) {}
    this.name = name

    let { x, y, width, height } = file.getAnimationAreaFromAnimation(a)
    this.areaX = x
    this.areaY = y
    this.areaWidth = width
    this.areaHeight = height

    // 1. Get pixels to copy
    let areaPixels = file.canvas.getPixels(x, y, width, height)
    // 2. Resize canvas
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height + height)
    // 3. Shift all pixels after animation area down by animation area's height*2
    let pixels = file.canvas.getPixels(x, y + height, width, file.canvas.height - (y + height))
    file.canvas.setPixels(x, y + height * 2, width, file.canvas.height - (y + height), pixels)
    // 4. Set pixels at animation area + animation area height to stored
    file.canvas.setPixels(x, y + height, width, height, areaPixels)
    // 5. Update data structure
    g.animations.splice(g.animations.findIndex(a => a.name === this.animation) + 1, 0, {name, frameTime: a.frameTime, frames: JSON.parse(JSON.stringify(a.frames))})
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile): void {
    let g = file.stacks.find(g => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    // 1. Shift all pixels after stack area up by stack area's height
    let pixels = file.canvas.getPixels(this.areaX, this.areaY + this.areaHeight * 2, this.areaWidth, file.canvas.height - (this.areaY + this.areaHeight))
    file.canvas.setPixels(this.areaX, this.areaY + this.areaHeight, this.areaWidth, file.canvas.height - (this.areaY + this.areaHeight), pixels)
    // 2. Resize canvas
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - this.areaHeight)
    // 3. Update data structure
    g.animations.splice(g.animations.findIndex(a => a.name === this.name), 1)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}


export class RenameAnimationUndoable implements Undoable<LoadedFile> {
  private stack: string
  private animation: string
  private oldName: string = ''
  private newName: string
  constructor(stack: string, animation: string, newName: string) {
    this.stack = stack
    this.animation = animation
    this.newName = newName
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find(v=>v.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    let a = g.animations.find(v=>v.name === this.animation)
    if (!a) {
      throw new Error('animation not found: ' + this.animation)
    }
    this.oldName = a.name
    a.name = this.newName
  }
  unapply(file: LoadedFile): void {
    let g = file.stacks.find(v=>v.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    let a = g.animations.find(v=>v.name === this.newName)
    if (!a) {
      throw new Error('animation not found: ' + this.newName)
    }
    a.name = this.oldName
  }
}

export class AddAnimationFrameUndoable implements Undoable<LoadedFile> {
  private stack: string
  private animation: string
  constructor(stack: string, animation: string) {
    this.stack = stack
    this.animation = animation
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find(v=>v.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    let a = g.animations.find(v=>v.name === this.animation)
    if (!a) {
      throw new Error('animation not found: ' + this.animation)
    }
    
    // Grow our canvas by 1 frameHeight
    let {x, y, width, height} = file.getAnimationArea(this.stack, this.animation)
    a.frames.push({slices: Array.from({length: g.sliceCount}, (_=>({shading: 1, x: 0, y: 0})))})
    let newHeight = file.canvas.height + file.frameHeight
    
    // Grow our canvas.
    file.canvas.resizeCanvas(width, newHeight)
    
    // Shift all pixels after our animation area down.
    let followingPixelsHeight = file.canvas.height - (y + height)
    if (followingPixelsHeight > 0) {
      let pixels = file.canvas.getPixels(x, y+height, width, followingPixelsHeight)
      file.canvas.setPixels(x, y+height+file.frameHeight, width, followingPixelsHeight, pixels)
    }
    
    // Clear our new area.
    file.canvas.clearPixels(x, y+height, width, file.frameHeight)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find(v=>v.name === this.stack)
    if (!g) {
      throw new Error('stack not found')
    }
    let a = g.animations.find(v=>v.name === this.animation)
    if (!a) {
      throw new Error('animation not found')
    }
    
    // Acquire our pixels after our area and potentially shift them back.
    let {x, y, width, height} = file.getAnimationArea(this.stack, this.animation)
    a.frames.pop()
    
    let followingPixelsHeight = file.canvas.height - (y + height)
    if (followingPixelsHeight > 0) {
      let pixels = file.canvas.getPixels(x, y+height, width, followingPixelsHeight)
      // Move 'em back in place.
      file.canvas.setPixels(x, y+height-file.frameHeight, width, followingPixelsHeight, pixels)
    }
    // Shrink our canvas by 1 frameHeight
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - file.frameHeight)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class DuplicateAnimationFrameUndoable implements Undoable<LoadedFile> {
  private stack: string
  private animation: string
  private frameIndex: number
  private areaX: number = -1
  private areaY: number = -1
  private areaWidth: number = -1
  private areaHeight: number = -1
  constructor(stack: string, animation: string, frameIndex: number) {
    this.stack = stack
    this.animation = animation
    this.frameIndex = frameIndex
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find(g => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    let a = g.animations.find(v=>v.name === this.animation)
    if (!a) {
      throw new Error('animation not found: ' + this.animation)
    }
    let f = a.frames[this.frameIndex]
    if (!f) {
      throw new Error('frame not found: ' + this.frameIndex)
    }

    let { x, y, width, height } = file.getFrameAreaFromFrame(f)
    this.areaX = x
    this.areaY = y
    this.areaWidth = width
    this.areaHeight = height

    // 1. Get pixels to copy
    let areaPixels = file.canvas.getPixels(x, y, width, height)
    // 2. Resize canvas
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height + height)
    // 3. Shift all pixels after frame area down by frame area's height*2
    let pixels = file.canvas.getPixels(x, y + height, width, file.canvas.height - (y + height))
    file.canvas.setPixels(x, y + height * 2, width, file.canvas.height - (y + height), pixels)
    // 4. Set pixels at frame area + frame area height to stored
    file.canvas.setPixels(x, y + height, width, height, areaPixels)
    // 5. Update data structure
    a.frames.splice(this.frameIndex, 0, {slices: JSON.parse(JSON.stringify(f.slices))})
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile): void {
    let g = file.stacks.find(g => g.name === this.stack)
    if (!g) {
      throw new Error('stack not found: ' + this.stack)
    }
    let a = g.animations.find(v=>v.name === this.animation)
    if (!a) {
      throw new Error('animation not found: ' + this.animation)
    }
    // 1. Shift all pixels after stack area up by frame area's height
    let pixels = file.canvas.getPixels(this.areaX, this.areaY + this.areaHeight * 2, this.areaWidth, file.canvas.height - (this.areaY + this.areaHeight))
    file.canvas.setPixels(this.areaX, this.areaY + this.areaHeight, this.areaWidth, file.canvas.height - (this.areaY + this.areaHeight), pixels)
    // 2. Resize canvas
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - this.areaHeight)
    // 3. Update data structure
    a.frames.splice(this.frameIndex, 1)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }

}

export class RemoveAnimationFrameUndoable implements Undoable<LoadedFile> {
  private stackName: string
  private animationName: string
  private frameIndex: number
  private frame: StaxFrame
  private pixels: Uint8Array
  private pixelsX: number
  private pixelsY: number
  private pixelsWidth: number
  private pixelsHeight: number
  constructor(stackName: string, animationName: string, frameIndex: number) {
    this.stackName = stackName
    this.animationName = animationName
    this.frameIndex = frameIndex
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find(v=>v.name === this.stackName)
    if (!g) {
      throw new Error('stack not found')
    }
    let a = g.animations.find(v=>v.name === this.animationName)
    if (!a) {
      throw new Error('animation not found')
    }
    if (this.frameIndex < 0 || this.frameIndex >= a.frames.length) {
      throw new Error('frame oob')
    }
    
    let {x, y, width, height} = file.getFrameArea(this.stackName, this.animationName, this.frameIndex)
    this.pixels = file.canvas.getPixels(x, y, width, height)
    this.pixelsX = x
    this.pixelsY = y
    this.pixelsWidth = width
    this.pixelsHeight = height
    
    let followingPixelsHeight = file.canvas.height - (y + height)
    if (followingPixelsHeight > 0) {
      let pixels = file.canvas.getPixels(x, y+height, width, followingPixelsHeight)
      // Move 'em back in place.
      file.canvas.setPixels(x, y, width, followingPixelsHeight, pixels)
    }
    // Shrink our canvas by frame's height
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - height)
    this.frame = a.frames.splice(this.frameIndex, 1)[0]

    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find(v=>v.name === this.stackName)
    if (!g) {
      throw new Error('stack not found')
    }
    let a = g.animations.find(v=>v.name === this.animationName)
    if (!a) {
      throw new Error('animation not found')
    }
    
    // 1. Get our pixels at pixelsY to end of canvas.
    let followingPixelsHeight = file.canvas.height - this.pixelsY
    let pixels: Uint8Array
    if (followingPixelsHeight > 0) {
      pixels = file.canvas.getPixels(this.pixelsX, this.pixelsY, file.canvas.width, followingPixelsHeight)
    }

    // 2. Increase our canvas height to += pixelsHeight
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height+this.pixelsHeight)
    
    // 3. Shift earlier pixels if needed.
    if (pixels) {
      file.canvas.setPixels(this.pixelsX, this.pixelsY+this.pixelsHeight, file.canvas.width, followingPixelsHeight, pixels)
    }

    // 4. Re-add stored pixels to pixelY
    file.canvas.setPixels(this.pixelsX, this.pixelsY, this.pixelsWidth, this.pixelsHeight, this.pixels)
    a.frames.splice(this.frameIndex, 0, this.frame)

    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class ClearAnimationFrameUndoable implements Undoable<LoadedFile> {
  private stackName: string
  private animationName: string
  private frameIndex: number
  private pixels: Uint8Array
  private pixelsX: number
  private pixelsY: number
  private pixelsWidth: number
  private pixelsHeight: number
  constructor(stackName: string, animationName: string, frameIndex: number) {
    this.stackName = stackName
    this.animationName = animationName
    this.frameIndex = frameIndex
  }
  apply(file: LoadedFile) {
    let g = file.stacks.find(v=>v.name === this.stackName)
    if (!g) {
      throw new Error('stack not found')
    }
    let a = g.animations.find(v=>v.name === this.animationName)
    if (!a) {
      throw new Error('animation not found')
    }
    if (this.frameIndex < 0 || this.frameIndex >= a.frames.length) {
      throw new Error('frame oob')
    }
    
    let {x, y, width, height} = file.getFrameArea(this.stackName, this.animationName, this.frameIndex)
    this.pixels = file.canvas.getPixels(x, y, width, height)
    this.pixelsX = x
    this.pixelsY = y
    this.pixelsWidth = width
    this.pixelsHeight = height
    
    file.canvas.clearPixels(x, y, width, height)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    let g = file.stacks.find(v=>v.name === this.stackName)
    if (!g) {
      throw new Error('stack not found')
    }
    let a = g.animations.find(v=>v.name === this.animationName)
    if (!a) {
      throw new Error('animation not found')
    }
    
    file.canvas.setPixels(this.pixelsX, this.pixelsY, this.pixelsWidth, this.pixelsHeight, this.pixels)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class ThreeDSelectionBoxClearUndoable implements Undoable<LoadedFile> {
  //private selection: [[number, number, number], [number, number, number]] = [[0, 0, 0], [0, 0, 0]]
  private cursor1: [number, number, number] = [0, 0, 0]
  private cursor2: [number, number, number] = [0, 0, 0]
  constructor() {
  }
  apply(file: LoadedFile) {
    this.cursor1 = [...file.threeDCursor1]
    this.cursor2 = [...file.threeDCursor2]

    file.threeDCursor1 = [...file.threeDCursor1]
    file.threeDCursor2 = [...file.threeDCursor1]
  }
  unapply(file: LoadedFile) {
    file.threeDCursor1 = [...this.cursor1]
    file.threeDCursor2 = [...this.cursor2]
  }
}

export class ThreeDSelectionBoxSetUndoable implements Undoable<LoadedFile> {
  private cursor1: [number, number, number] = [0, 0, 0]
  private cursor1Previous: [number, number, number] = [0, 0, 0]
  private cursor2: [number, number, number] = [0, 0, 0]
  private cursor2Previous: [number, number, number] = [0, 0, 0]

  constructor(cursor1: [number, number, number], cursor2: [number, number, number], ) {
    this.cursor1 = cursor1
    this.cursor2 = cursor2
  }
  apply(file: LoadedFile) {
    this.cursor1Previous = [...file.threeDCursor1]
    this.cursor2Previous = [...file.threeDCursor2]

    file.threeDCursor1 = [...this.cursor1]
    file.threeDCursor2 = [...this.cursor2]
  }
  unapply(file: LoadedFile) {
    file.threeDCursor1 = [...this.cursor1Previous]
    file.threeDCursor2 = [...this.cursor2Previous]
  }
}

export class ThreeDSelectionBoxSetVoxelsUndoable implements Undoable<LoadedFile> {
  private stackName: string
  private animationName: string
  private frameIndex: number
  private cursor1: [number, number, number]
  private cursor2: [number, number, number]
  private index: number
  private placeUndoable: PixelsPlaceUndoable
  constructor(stackName: string, animationName: string, frameIndex: number, cursor1: [number, number, number], cursor2: [number, number, number], index: number) {
    this.stackName = stackName
    this.animationName = animationName
    this.frameIndex = frameIndex
    this.cursor1 = cursor1
    this.cursor2 = cursor2
    this.index = index
    this.placeUndoable = new PixelsPlaceUndoable([])
  }
  apply(file: LoadedFile) {
    let f = _getFrame(file, this.stackName, this.animationName, this.frameIndex)
    let minX = Math.min(this.cursor1[0], this.cursor2[0])
    let minY = Math.min(this.cursor1[1], this.cursor2[1])
    let minZ = Math.min(this.cursor1[2], this.cursor2[2])
    let maxX = Math.max(this.cursor1[0], this.cursor2[0])
    let maxY = Math.max(this.cursor1[1], this.cursor2[1])
    let maxZ = Math.max(this.cursor1[2], this.cursor2[2])

    let pixels: {x: number, y: number, index: number}[] = []
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        let slice = f.slices[y]
        if (!slice) continue
        for (let z = minZ; z <= maxZ; z++) {
          pixels.push({
            x: slice.x + x,
            y: slice.y + z,
            index: this.index,
          })
        }
      }
    }
    this.placeUndoable = new PixelsPlaceUndoable(pixels)
    this.placeUndoable.apply(file)
  }
  unapply(file: LoadedFile) {
    this.placeUndoable.unapply(file)
  }
}

// FIXME: Move/rename this...
function _getFrame(file: LoadedFile, stackName: string, animationName: string, frameIndex: number): StaxFrame {
  let s = file.stacks.find(v=>v.name === stackName)
  if (!s) {
    throw new Error('stack not found')
  }
  let a = s.animations.find(v=>v.name === animationName)
  if (!a) {
    throw new Error('animation not found')
  }
  let f = a.frames[frameIndex]
  if (!f) {
    throw new Error('frame not found')
  }
  return f
}