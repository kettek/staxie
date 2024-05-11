import type { Canvas } from './canvas'
import type { IndexedPNG, StaxAnimation, StaxFrame, StaxGroup, StaxSlice } from './png'
import { Preview } from './preview'
import { SelectionArea } from './selection'
import { UndoableStack, type Undoable } from './undo'

export interface LoadedFileOptions {
  filepath: string
  title: string
  canvas: Canvas
  data: IndexedPNG
  groups?: StaxGroup[]
  frameWidth: number
  frameHeight: number
}

export class LoadedFile extends UndoableStack<LoadedFile> {
  filepath: string
  title: string
  canvas: Canvas
  selection: SelectionArea
  preview: Preview
  data?: IndexedPNG
  //
  groups: StaxGroup[] = []
  group?: StaxGroup
  groupName: string
  animation?: StaxAnimation
  animationName: string
  slice?: StaxSlice
  sliceIndex: number
  frame?: StaxFrame
  frameIndex: number
  frameWidth: number
  frameHeight: number

  constructor(options: LoadedFileOptions) {
    super()
    this.setTarget(this)
    if (options.groups) {
      this.groups = options.groups
    }
    this.frameWidth = options.frameWidth
    this.frameHeight = options.frameHeight
    if (this.data) {
      this.frameWidth = this.data.frameWidth
      this.frameHeight = this.data.frameHeight
      this.data = options.data
      if (this.data.groups.length > 0) {
        this.group = this.data.groups[0]
        this.groupName = this.data.groups[0].name
        
        if (this.group.animations.length > 0) {
          this.animation = this.group.animations[0]
          this.animationName = this.animation.name
          this.frameIndex = this.animation.frames.length - 1
          if (this.frameIndex >= 0) {
            this.frame = this.animation.frames[this.frameIndex]
            if (this.frame.slices.length > 0) {
              this.slice = this.frame.slices[0]
              this.sliceIndex = 0
            }
          }
        }
      }
    }
    // Process groups to get slice position information.
    this.cacheSlicePositions()

    this.filepath = options.filepath
    this.title = options.title
    this.canvas = options.canvas
    this.preview = new Preview()
    this.selection = new SelectionArea(options.canvas.width, options.canvas.height, 1)
  }
  
  cacheSlicePositions() {
    let y = 0
    for (let group of this.groups) {
      for (let animation of group.animations) {
        for (let frame of animation.frames) {
          let x = 0
          for (let slice of frame.slices) {
            x += this.frameWidth
            slice.x = x
            slice.y = y
          }
          y += this.frameHeight
        }
      }
    }
  }
  
  setFrameIndex(index: number) {
    if (this.animation) {
      this.frameIndex = index
      this.frame = this.animation.frames[index]
      if (this.sliceIndex >= this.frame.slices.length) {
        this.sliceIndex = this.frame.slices.length - 1
      }
      this.slice = this.frame.slices[this.sliceIndex]
    }
  }

  setSliceIndex(index: number) {
    if (this.frame) {
      this.sliceIndex = index
      this.slice = this.frame.slices[index]
    }
  }
  
  setAnimation(name: string) {
    if (this.group) {
      this.animation = this.group.animations.find(a => a.name === name)
      this.animationName = name
      this.setFrameIndex(this.animation.frames.length - 1)
    }
  }
  
  setGroup(name: string) {
    this.group = this.groups.find(g => g.name === name)
    this.groupName = name
    if (this.group.animations.find(a => a.name === this.animationName)) {
      this.setAnimation(this.animationName)
    } else {
      this.setAnimation(this.group.animations[0].name)
    }
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

export class ReplaceSwatchUndoable implements Undoable<LoadedFile> {
  private index: number

  private red: number
  private green: number
  private blue: number
  private alpha: number

  private oldRed: number
  private oldGreen: number
  private oldBlue: number
  private oldAlpha: number

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

// TODO
/*export class RemoveSwatchUndoable implements Undoable<LoadedFile> {
  private index: number
  private replaceIndex: number
  
  private oldRed: number
  private oldGreen: number
  private oldBlue: number
  private oldAlpha: number

  constructor(index: number, replaceIndex: number) {
    this.index = index
    this.replaceIndex = replaceIndex
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

    file.canvas.removePaletteIndex(this.index, this.replaceIndex)
  }
  unapply(file: LoadedFile) {
    file.canvas.insertPaletteColor(this.index, this.oldRed, this.oldGreen, this.oldBlue, this.oldAlpha)
  }
}*/

export class SwapSwatchUndoable implements Undoable<LoadedFile> {
  private index1: number
  private index2: number
  constructor(index1: number, index2: number) {
    this.index1 = index1
    this.index2 = index2
  }
  apply(file: LoadedFile) {
    file.canvas.swapPaletteColors(this.index1, this.index2)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  unapply(file: LoadedFile) {
    file.canvas.swapPaletteColors(this.index2, this.index1)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
}

export class MoveSwatchUndoable implements Undoable<LoadedFile> {
  private index: number
  private newIndex: number
  constructor(index: number, newIndex: number) {
    this.index = index
    this.newIndex = newIndex
  }
  apply(file: LoadedFile) {
    file.canvas.movePaletteColor(this.index, this.newIndex)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  unapply(file: LoadedFile) {
    file.canvas.movePaletteColor(this.newIndex, this.index)
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
}

/** BEGIN STAX-RELATED CANVAS RESIZE TYPE Undoables */
export class AddGroupUndoable implements Undoable<LoadedFile> {
  private group: string
  constructor(group: string) {
  }
  apply(file: LoadedFile) {
    // TODO: Add group to file's groups.
  }
  unapply(file: LoadedFile) {
    // TODO: Remove group from file's groups.
  }
}

export class RemoveGroupUndoable implements Undoable<LoadedFile> {
  private group: string
  private pixels: { x: number, y: number, index: number }[]
  constructor(group: string) {
  }
  apply(file: LoadedFile) {
    // TODO: Get our group's total width/height, store the pixels, clear the area, then shift all pixels below this group to its position. Shrink the canvas by height.
  }
  unapply(file: LoadedFile) {
    // TODO: Grow our canvas by pixel width/height, shift all pixels below position + height down by height, then paste the pixels back in.
  }
}

export class MoveGroupUndoable implements Undoable<LoadedFile> {
  private group: string
  private oldIndex: number
  private newIndex: number
  constructor(group: string, oldIndex: number, newIndex: number) {
  }
  apply(file: LoadedFile) {
    // TODO: Lazymode -- get our pixels for our groups between our two move groups, get our pixels for our first and second move group, clear pixels from first through second, then paste the pixels for our from to our to position, our to to our end position -to's height, then paste the between pixels between the two.
  }
  unapply(file: LoadedFile) {
    // TODO: Part of above lazy mode, clear out old pixels, then position to, from, and between pixels.
  }
}

export class ChangeGroupSliceUndoable implements Undoable<LoadedFile> {
  private group: string
  private slice: number
  private oldSlice: number
  constructor(group: string, slice: number) {
  }
  apply(file: LoadedFile) {
    // TODO: If growing, expand the canvas by our animations' count (if they have frames), then shift every animation down by frameHeight*sliceCount. If shrinking, lazily store our entire animations' pixels, then iterate through all animations, clear the pixels for all the removed slices as the end, then shift the pixels in steps with height steps increasing by each frameHeight*sliceCount (e.g., 0 = no shift, 1 += fH*sC, 2 += fH*sC, etc.) before shrinking the canvas equal to animationCountIfHasFrames*frameHeight*sliceCount.
  }
  unapply(file: LoadedFile) {
    // TODO: Reverse of above.
  }
}

export class AddAnimationUndoable implements Undoable<LoadedFile> {
  private group: string
  private animation: string
  constructor(group: string, animation: string) {
  }
  apply(file: LoadedFile) {
    // TODO: Insert into group's animations.
  }
  unapply(file: LoadedFile) {
    // TODO: Remove from group's animations.
  }
}

export class RemoveAnimationUndoable implements Undoable<LoadedFile> {
  private group: string
  private animation: string
  private pixels: { x: number, y: number, index: number }[]
  constructor(group: string, animation: string) {
  }
  apply(file: LoadedFile) {
    // TODO: If this animation has frames, we need to save our pixels, then shift all pixels after our height up by our height, then shrink the canvas.
  }
  unapply(file: LoadedFile) {
    // TODO: Expand the canvas, move all following animations + groups down by our height, then paste our pixels back in if we had any.
  }
}

export class InsertAnimationFrameUndoable implements Undoable<LoadedFile> {
  private group: string
  private animation: string
  private at: number
  private pixels: { x: number, y: number, index: number }[]
  constructor(group: string, animation: string, at: number) {
  }
  apply(file: LoadedFile) {
    // TODO: Resize canvas width by frame width if needed. If frame is at the end of the list, do nothing else. If the frame is before the end of the list, shift all frame pixels to the right by frame width.
  }
  unapply(file: LoadedFile) {
    // TODO: Shrink the canvas width by frame width if last frame and canvas's width is larger than canvas width + frame width. If not, clear our frame's pixel locations and shift all frame pixels to the left by frame width.
  }
}

export class RemoveAnimationFrameUndoable implements Undoable<LoadedFile> {
  private group: string
  private animation: string
  private at: number
  private pixels: { x: number, y: number, index: number }[]
  constructor(group: string, animation: string, at: number) {
  }
  apply(file: LoadedFile) {
    // TODO: Store pixels. Shrink the canvas width by frame width if last frame and canvas's width is larger than canvas width + frame width. If not, clear our frame's pixel locations and shift all frame pixels to the left by frame width.
  }
  unapply(file: LoadedFile) {
    // TODO: Resize canvas width by frame width if needed. If the frame is before the end of the list, shift all frame pixels to the right by frame width. Re-insert pixels at position.
  }
}