import { type Writable, writable, type Subscriber, type Unsubscriber, type Updater } from 'svelte/store'
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

export class LoadedFile extends UndoableStack<LoadedFile> implements Writable<LoadedFile> {
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

  subscribe: (this: void, run: Subscriber<LoadedFile>) => Unsubscriber
  set: (this: void, value: LoadedFile) => void
  update: (this: void, updater: Updater<LoadedFile>) => void

  constructor(options: LoadedFileOptions) {
    super()
    
    // ... Sure, let's make this a store. I hope this doesn't cause any issues later.
    const { subscribe, set, update } = writable<LoadedFile>(this)
    this.subscribe = subscribe
    this.set = set
    this.update = update

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
            slice.x = x
            slice.y = y
            x += this.frameWidth
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
  
  getAnimation(group: string, name: string): StaxAnimation|undefined {
    const g = this.getGroup(group)
    if (g) {
      return g.animations.find(v=>v.name===name)
    }
    return undefined
  }
  
  setAnimation(name: string) {
    if (this.group) {
      this.animation = this.group.animations.find(a => a.name === name)
      this.animationName = name
      this.setFrameIndex(this.animation.frames.length - 1)
    }
  }
  
  getGroup(name: string): StaxGroup | undefined {
    return this.groups.find(g => g.name === name)
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
  
  getGroupArea(group: string): { x: number, y: number, width: number, height: number } {
    let g = this.groups.find(g => g.name === group)
    if (!g) {
      throw new Error('group not found')
    }
    let x = 0
    let y = 0
    let width = g.sliceCount * this.frameWidth
    let height = 0
    let hasFirst = false
    for (let animation of g.animations) {
      for (let frame of animation.frames) {
        if (!hasFirst) {
          for (let slice of frame.slices) {
            x = slice.x
            y = slice.y
            hasFirst = true
            break
          }
        }
        height += this.frameHeight
      }
    }
    
    return { x, y, width, height }
  }
  
  getAnimationArea(group: string, anim: string): {x: number, y: number, width: number, height: number } {
    let g = this.groups.find(g => g.name === group)
    if (!g) {
      throw new Error('group not found')
    }
    let animation = g.animations.find(a => a.name === anim)
    if (!animation) {
      throw new Error('animation not found')
    }
    let x = 0
    let y = 0
    let width = g.sliceCount * this.frameWidth 
    let height = 0
    let hasFirst = false
    for (let frame of animation.frames) {
      if (!hasFirst) {
        for (let slice of frame.slices) {
          x = slice.x
          y = slice.y
          hasFirst = true
          break
        }
      }
      height += this.frameHeight
    }
    
    return { x, y, width, height }
  }
  
  getFrameArea(group: string, anim: string, frameIndex: number): {x: number, y: number, width: number, height: number} {
    let g = this.groups.find(g => g.name === group)
    if (!g) {
      throw new Error('group not found')
    }
    let animation = g.animations.find(a => a.name === anim)
    if (!animation) {
      throw new Error('animation not found')
    }
    if (frameIndex >= animation.frames.length) {
      throw new Error('frame oob')
    }
    let x = 0
    let y = 0
    let width = g.sliceCount * this.frameWidth 
    let height = this.frameHeight
    
    let frame = animation.frames[frameIndex]
    if (frame.slices.length === 0) {
      throw new Error('no slices in frame')
    }
    y = frame.slices[0].y
    
    return { x, y, width, height }
  }
  
  undo() {
    super.undo()
    this.canvas.refreshCanvas()
    this.selection.refresh()
    this.set(this)
  }
  redo() {
    super.redo()
    this.canvas.refreshCanvas()
    this.selection.refresh()
    this.set(this)
  }
  push(item: Undoable<LoadedFile>) {
    super.push(item)
    this.canvas.refreshCanvas()
    this.selection.refresh()
    this.set(this)
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
    this.group = group
  }
  apply(file: LoadedFile) {
    file.groups.push({name: this.group, animations: [], sliceCount: 0})
  }
  unapply(file: LoadedFile) {
    // Iterate from end to beginning, as we add groups to the end.
    for (let i = file.groups.length - 1; i >= 0; i--) {
      if (file.groups[i].name === this.group) {
        file.groups.splice(i, 1)
        break
      }
    }
  }
}

export class RemoveGroupUndoable implements Undoable<LoadedFile> {
  private groupName: string
  private group: StaxGroup
  private groupIndex: number
  private x: number
  private y: number
  private width: number
  private height: number
  private fromY: number
  private fromHeight: number
  private pixels: Uint8Array
  constructor(groupName: string) {
    this.groupName = groupName
  }
  apply(file: LoadedFile) {
    this.groupIndex = file.groups.findIndex(g => g.name === this.groupName)
    if (this.groupIndex === -1) {
      throw new Error('group not found')
    }
    this.group = file.groups[this.groupIndex]
    // Get our group's total width/height, store the pixels, clear the area, then shift all pixels below this group to its position. Shrink the canvas by height.
    // Get and clear area.
    let {x, y, width, height } = file.getGroupArea(this.groupName) // FIXME: This can be cached.
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
    file.groups.splice(this.groupIndex, 1)
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    file.groups.splice(this.groupIndex, 0, this.group)
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

export class GrowGroupSliceUndoable implements Undoable<LoadedFile> {
  private group: string
  private sliceCount: number
  constructor(group: string, sliceCount: number) {
    this.group = group
    this.sliceCount = sliceCount
  }
  apply(file: LoadedFile) {
    let g = file.groups.find(g => g.name === this.group)
    if (!g) {
      throw new Error('group not found')
    }
    
    let sliceCount = g.sliceCount + this.sliceCount
    let newWidth = sliceCount * file.frameWidth
    if (file.canvas.width < newWidth) {
      file.canvas.resizeCanvas(newWidth, file.canvas.height)
    }
    g.sliceCount = sliceCount
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    // Reverse of above.
    let g = file.groups.find(g => g.name === this.group)
    if (!g) {
      throw new Error('group not found')
    }
      
    let sliceCount = g.sliceCount - this.sliceCount
    let targetWidth = sliceCount * file.frameWidth
    g.sliceCount = sliceCount
    for (let group of file.groups) {
      targetWidth = Math.max(targetWidth, group.sliceCount * file.frameWidth)
    }
    // Shrink the canvas if no groups are wider than our changing group.
    if (file.canvas.width > targetWidth) {
      file.canvas.resizeCanvas(targetWidth, file.canvas.height)
    }
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class ShrinkGroupSliceUndoable implements Undoable<LoadedFile> {
  private group: string
  private sliceCount: number
  private pixels: Uint8Array
  private pixelsWidth: number
  private pixelsHeight: number
  private pixelsX: number
  private pixelsY: number
  constructor(group: string, sliceCount: number) {
    this.group = group
    this.sliceCount = sliceCount
  }
  apply(file: LoadedFile) {
    let g = file.groups.find(g => g.name === this.group)
    if (!g) {
      throw new Error('group not found')
    }
    
    let sliceCount = g.sliceCount - this.sliceCount
    let newWidth = sliceCount * file.frameWidth
    
    let {x, y, width, height} = file.getGroupArea(this.group)
    this.pixelsX = x+newWidth
    this.pixelsY = y
    this.pixelsWidth = width - newWidth
    this.pixelsHeight = height
    this.pixels = file.canvas.getPixels(this.pixelsX, this.pixelsY, this.pixelsWidth, this.pixelsHeight)
    
    g.sliceCount = sliceCount
    // Get our maximum width (each group's slices * file.frameWidth)
    let targetWidth = newWidth
    for (let group of file.groups) {
      targetWidth = Math.max(targetWidth, group.sliceCount * file.frameWidth)
    }
    
    if (file.canvas.width > targetWidth) { // Shrink the canvas if no groups are wider than our changing group.
      // Resize the canvas.
      file.canvas.resizeCanvas(targetWidth, file.canvas.height)
    } else { // Otherwise just clear the area where our group's old slices were.
      file.canvas.clearPixels(x+newWidth, y, width-newWidth, height)
    }
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
  unapply(file: LoadedFile) {
    // Reverse of above.
    let g = file.groups.find(g => g.name === this.group)
    if (!g) {
      throw new Error('group not found')
    }
      
    let sliceCount = g.sliceCount + this.sliceCount
    let newWidth = sliceCount * file.frameWidth
    if (file.canvas.width < newWidth) { // Grow it again.
      file.canvas.resizeCanvas(newWidth, file.canvas.height)
    }
    // Paste back in our pixels.
    file.canvas.setPixels(this.pixelsX, this.pixelsY, this.pixelsWidth, this.pixelsHeight, this.pixels)
    g.sliceCount = sliceCount
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class AddAnimationUndoable implements Undoable<LoadedFile> {
  private group: string
  constructor(group: string) {
    this.group = group
  }
  apply(file: LoadedFile) {
    let g = file.groups.find(g => g.name === this.group)
    if (!g) {
      throw new Error('group not found')
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
    let {x, y, width, height} = file.getGroupArea(this.group)
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
    let g = file.groups.find(g => g.name === this.group)
    if (!g) {
      throw new Error('group not found')
    }

    // Acquire our pixels after our area and potentially shift them back.
    let {x, y, width, height} = file.getGroupArea(this.group)
    
    let followingPixelsHeight = file.canvas.height - (y + height)
    if (followingPixelsHeight > 0) {
      let pixels = file.canvas.getPixels(x, y+height, width, followingPixelsHeight)
      // Move 'em back in place.
      file.canvas.setPixels(x, y+height-file.frameHeight, width, followingPixelsHeight, pixels)
    }
    // Shrink our canvas by 1 frameHeight
    file.canvas.resizeCanvas(file.canvas.width, file.canvas.height - file.frameHeight)

    g.animations.pop()
    file.cacheSlicePositions() // FIXME: This is kinda inefficient.
  }
}

export class RemoveAnimationUndoable implements Undoable<LoadedFile> {
  private group: string
  private animation: string
  private pixels: Uint8Array
  private x: number
  private y: number
  private width: number
  private height: number
  private anim: StaxAnimation
  private animIndex: number
  constructor(group: string, animation: string) {
    this.group = group
    this.animation = animation
  }
  apply(file: LoadedFile) {
    let g = file.groups.find(v=>v.name === this.group)
    if (!g) {
      throw new Error('group not found')
    }
    let a = g.animations.find(v=>v.name === this.animation)
    if (!a) {
      throw new Error('animation not found')
    }

    let {x, y, width, height} = file.getAnimationArea(this.group, this.animation)
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
    let g = file.groups.find(v=>v.name === this.group)
    if (!g) {
      throw new Error('group not found')
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
  private group: string
  private animation: string
  private oldIndex: number
  private newIndex: number
  constructor(group: string, animation: string, oldIndex: number, newIndex: number) {
  }
  apply(file: LoadedFile) {
    // TODO: See logic for MoveGroupUndoable, but apply to the group's animations.
  }
  unapply(file: LoadedFile) {
    // TODO: See logic for MoveGroupUndoable, but apply to the group's animations.
  }
}

export class AddAnimationFrameUndoable implements Undoable<LoadedFile> {
  private group: string
  private animation: string
  constructor(group: string, animation: string) {
    this.group = group
    this.animation = animation
  }
  apply(file: LoadedFile) {
    let g = file.groups.find(v=>v.name === this.group)
    if (!g) {
      throw new Error('group not found')
    }
    let a = g.animations.find(v=>v.name === this.animation)
    if (!a) {
      throw new Error('animation not found')
    }
    
    // Grow our canvas by 1 frameHeight
    let {x, y, width, height} = file.getAnimationArea(this.group, this.animation)
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
    let g = file.groups.find(v=>v.name === this.group)
    if (!g) {
      throw new Error('group not found')
    }
    let a = g.animations.find(v=>v.name === this.animation)
    if (!a) {
      throw new Error('animation not found')
    }
    
    // Acquire our pixels after our area and potentially shift them back.
    let {x, y, width, height} = file.getAnimationArea(this.group, this.animation)
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

export class RemoveAnimationFrameUndoable implements Undoable<LoadedFile> {
  private groupName: string
  private animationName: string
  private frameIndex: number
  private frame: StaxFrame
  private pixels: Uint8Array
  private pixelsX: number
  private pixelsY: number
  private pixelsWidth: number
  private pixelsHeight: number
  constructor(groupName: string, animationName: string, frameIndex: number) {
    this.groupName = groupName
    this.animationName = animationName
    this.frameIndex = frameIndex
  }
  apply(file: LoadedFile) {
    let g = file.groups.find(v=>v.name === this.groupName)
    if (!g) {
      throw new Error('group not found')
    }
    let a = g.animations.find(v=>v.name === this.animationName)
    if (!a) {
      throw new Error('animation not found')
    }
    if (this.frameIndex < 0 || this.frameIndex >= a.frames.length) {
      throw new Error('frame oob')
    }
    
    let {x, y, width, height} = file.getFrameArea(this.groupName, this.animationName, this.frameIndex)
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
    let g = file.groups.find(v=>v.name === this.groupName)
    if (!g) {
      throw new Error('group not found')
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