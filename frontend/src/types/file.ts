import { type Writable, writable, type Subscriber, type Unsubscriber, type Updater } from 'svelte/store'
import { Canvas } from './canvas'
import type { IndexedPNG, StaxAnimation, StaxFrame, StaxStack, StaxSlice } from './png'
import { Preview } from './preview'
import { SelectionArea } from './selection'
import { UndoableStack, type Undoable, UndoableGroup } from './undo'
import { CanvasView } from './canvasview'
import { flog } from '../globals/log'
import { PixelPlaceUndoable, PixelsPlaceUndoable } from './file/undoables'
import { editor2DSettings } from '../stores/editor2d'
import { get } from 'svelte/store'

export interface LoadedFileOptions {
  filepath: string
  title: string
  canvas: Canvas
  data: IndexedPNG
  stacks?: StaxStack[]
  frameWidth?: number
  frameHeight?: number
}

let id: number = 0 // unique ID source for giving each loaded file its own unique number.

export class LoadedFile extends UndoableStack<LoadedFile> implements Writable<LoadedFile> {
  id: number
  filepath: string
  title: string
  canvas: Canvas
  view: CanvasView
  selection: SelectionArea
  threeDCursor1: [number, number, number] = [0, 0, 0]
  threeDCursor2: [number, number, number] = [0, 0, 0]
  preview: Preview
  data?: IndexedPNG
  //
  lastSaveIndex: number = 0
  lastUndoableView: CanvasView | undefined
  //
  stacks: StaxStack[] = []
  stack?: StaxStack
  stackName: string = ''
  animation?: StaxAnimation
  animationName: string = ''
  slice?: StaxSlice
  sliceIndex: number = 0
  selectedSliceIndices: number[] = []
  frame?: StaxFrame
  frameIndex: number = 0
  selectedFrameIndices: number[] = []
  frameWidth: number
  frameHeight: number
  //
  selectedImageReference: string = ''

  subscribe: (this: void, run: Subscriber<LoadedFile>) => Unsubscriber
  set: (this: void, value: LoadedFile) => void
  update: (this: void, updater: Updater<LoadedFile>) => void
  refresh() {
    this.set(this)
  }

  duplicate(): LoadedFile {
    const options: LoadedFileOptions = {
      filepath: this.filepath,
      stacks: JSON.parse(JSON.stringify(this.stacks)),
      frameWidth: this.frameWidth,
      frameHeight: this.frameHeight,
      title: this.title,
      canvas: Canvas.clone(this.canvas),
      data: this.data?.clone(),
    }
    return new LoadedFile(options)
  }

  constructor(options: LoadedFileOptions) {
    super()
    this.id = ++id

    // ... Sure, let's make this a store. I hope this doesn't cause any issues later.
    const { subscribe, set, update } = writable<LoadedFile>(this)
    this.subscribe = subscribe
    this.set = set
    this.update = update

    this.setTarget(this)
    if (options.stacks) {
      this.stacks = options.stacks
    }
    this.frameWidth = options.frameWidth ?? 8
    this.frameHeight = options.frameHeight ?? 8
    if (options.data) {
      this.data = options.data
      this.frameWidth = this.data.frameWidth
      this.frameHeight = this.data.frameHeight
      this.stacks = this.data.stacks
      if (this.data.stacks.length > 0) {
        this.stack = this.data.stacks[0]
        this.stackName = this.data.stacks[0].name

        if (this.stack.animations.length > 0) {
          this.animation = this.stack.animations[0]
          this.animationName = this.animation.name
          this.frameIndex = this.animation.frames.length - 1
          this.selectedFrameIndices = [this.frameIndex]
          if (this.frameIndex >= 0) {
            this.frame = this.animation.frames[this.frameIndex]
            if (this.frame.slices.length > 0) {
              this.slice = this.frame.slices[0]
              this.sliceIndex = 0
              this.selectedSliceIndices = [0]
            }
          }
        }
      }
    }
    // Process stacks to get slice position information.
    this.cacheSlicePositions()

    this.filepath = options.filepath
    this.title = options.title
    this.canvas = options.canvas
    this.view = new CanvasView(this.canvas)
    this.preview = new Preview()
    this.selection = new SelectionArea(options.canvas.width, options.canvas.height, 1)
  }

  cacheSlicePositions() {
    let y = 0
    for (let stack of this.stacks) {
      for (let animation of stack.animations) {
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

  isFrameSelected(index: number): boolean {
    return this.selectedFrameIndices.includes(index)
  }
  selectFrameIndex(index: number, clear: boolean) {
    if (clear) {
      this.selectedFrameIndices = []
    }
    if (!this.selectedFrameIndices.includes(index)) {
      this.selectedFrameIndices.push(index)
    }
  }
  deselectFrameIndex(index: number) {
    this.selectedFrameIndices = this.selectedFrameIndices.filter((i) => i !== index)
  }

  setFrameIndex(index: number) {
    if (this.animation) {
      if (index >= this.animation.frames.length) {
        index = this.animation.frames.length - 1
      }
      this.frameIndex = index
      this.frame = this.animation.frames[index]
      if (!this.selectedFrameIndices.includes(index)) {
        this.selectedFrameIndices = [index]
      }
      if (this.sliceIndex >= this.frame.slices.length) {
        this.sliceIndex = this.frame.slices.length - 1
      } else if (!this.sliceIndex) {
        this.sliceIndex = 0
      }
      if (!this.selectedSliceIndices.includes(this.sliceIndex)) {
        this.selectedSliceIndices = [this.sliceIndex]
      }
      this.slice = this.frame.slices[this.sliceIndex]
    }
  }

  isSliceSelected(index: number): boolean {
    return this.selectedSliceIndices.includes(index)
  }
  selectSliceIndex(index: number, clear: boolean) {
    if (clear) {
      this.selectedSliceIndices = []
    }
    if (!this.selectedSliceIndices.includes(index)) {
      this.selectedSliceIndices.push(index)
    }
  }
  deselectSliceIndex(index: number) {
    this.selectedSliceIndices = this.selectedSliceIndices.filter((i) => i !== index)
  }

  setSliceIndex(index: number) {
    if (this.frame) {
      // Wrap-around per default.
      if (index >= this.frame.slices.length) {
        index = 0
      } else if (index < 0) {
        index = this.frame.slices.length - 1
      }
      this.sliceIndex = index
      if (!this.selectedSliceIndices.includes(index)) {
        this.selectedSliceIndices = [index]
      }
      this.slice = this.frame.slices[index]
      this.set(this)
    }
  }

  getAnimation(stack: string, name: string): StaxAnimation | undefined {
    const g = this.getStack(stack)
    if (g) {
      return g.animations.find((v) => v.name === name)
    }
    return undefined
  }

  setAnimation(name: string) {
    if (this.stack) {
      this.animation = this.stack.animations.find((a) => a.name === name)
      this.animationName = name
      if (this.animation) {
        this.setFrameIndex(this.frameIndex)
      }
    }
  }

  getStack(name: string): StaxStack | undefined {
    return this.stacks.find((g) => g.name === name)
  }

  setStack(name: string) {
    this.stack = this.stacks.find((g) => g.name === name)
    this.stackName = name
    if (this.stack.animations.find((a) => a.name === this.animationName)) {
      this.setAnimation(this.animationName)
    } else {
      this.setAnimation(this.stack.animations[0]?.name)
    }
  }

  getStackArea(stack: string): {
    x: number
    y: number
    width: number
    height: number
  } {
    let g = this.stacks.find((g) => g.name === stack)
    if (!g) {
      throw new Error('stack not found: ' + stack)
    }
    return this.getStackAreaFromStack(g)
  }
  getStackAreaFromIndex(index: number): {
    x: number
    y: number
    width: number
    height: number
  } {
    if (index >= this.stacks.length || index < 0) {
      throw new Error(`stack oob: ${index} out of ${this.stacks.length}`)
    }
    return this.getStackAreaFromStack(this.stacks[index])
  }
  getStackAreaFromStack(stack: StaxStack): {
    x: number
    y: number
    width: number
    height: number
  } {
    let x = 0
    let y = 0
    let width = 0
    let height = 0
    let hasFirst = false
    for (let animation of stack.animations) {
      for (let frame of animation.frames) {
        width = Math.max(width, frame.slices.length * this.frameWidth)
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

  getAnimationArea(stack: string, anim: string): { x: number; y: number; width: number; height: number } {
    let g = this.stacks.find((g) => g.name === stack)
    if (!g) {
      throw new Error('stack not found: ' + stack)
    }
    let animation = g.animations.find((a) => a.name === anim)
    if (!animation) {
      throw new Error('animation not found: ' + anim)
    }
    return this.getAnimationAreaFromAnimation(animation)
  }

  getAnimationAreaFromIndex(stack: string, index: number): { x: number; y: number; width: number; height: number } {
    let g = this.stacks.find((g) => g.name === stack)
    if (!g) {
      throw new Error('stack not found: ' + stack)
    }
    if (index >= g.animations.length || index < 0) {
      throw new Error(`animation oob: ${index} out of ${g.animations.length}`)
    }
    return this.getAnimationAreaFromAnimation(g.animations[index])
  }

  getAnimationAreaFromAnimation(animation: StaxAnimation): {
    x: number
    y: number
    width: number
    height: number
  } {
    let x = 0
    let y = 0
    let width = 0
    let height = 0
    let hasFirst = false
    for (let frame of animation.frames) {
      width = Math.max(width, frame.slices.length * this.frameWidth)
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

  getFrameArea(stack: string, anim: string, frameIndex: number): { x: number; y: number; width: number; height: number } {
    let g = this.stacks.find((g) => g.name === stack)
    if (!g) {
      throw new Error('stack not found: ' + stack)
    }
    let animation = g.animations.find((a) => a.name === anim)
    if (!animation) {
      throw new Error('animation not found: ' + anim)
    }
    if (frameIndex >= animation.frames.length) {
      throw new Error(`frame oob: ${frameIndex} out of ${animation.frames.length}`)
    }
    return this.getFrameAreaFromFrame(animation.frames[frameIndex])
  }

  getFrameAreaFromFrame(frame: StaxFrame): { x: number; y: number; width: number; height: number } {
    let x = 0
    let y = 0
    let width = 0
    let height = this.frameHeight

    if (frame.slices.length === 0) {
      throw new Error('no slices in frame')
    }
    x = frame.slices[0].x
    width = frame.slices.length * this.frameWidth
    y = frame.slices[0].y

    return { x, y, width, height }
  }

  getSliceArea(stack: string, anim: string, frameIndex: number, sliceIndex: number): { x: number; y: number; width: number; height: number } {
    let g = this.stacks.find((g) => g.name === stack)
    if (!g) {
      throw new Error('stack not found: ' + stack)
    }
    let animation = g.animations.find((a) => a.name === anim)
    if (!animation) {
      throw new Error('animation not found: ' + anim)
    }
    if (frameIndex >= animation.frames.length) {
      throw new Error(`frame oob: ${frameIndex} out of ${animation.frames.length}`)
    }
    return this.getSliceAreaFromFrame(animation.frames[frameIndex], sliceIndex)
  }

  getSliceAreaFromFrame(frame: StaxFrame, sliceIndex: number): { x: number; y: number; width: number; height: number } {
    if (sliceIndex >= frame.slices.length) {
      throw new Error(`slice oob: ${sliceIndex} out of ${frame.slices.length}`)
    }
    let slice = frame.slices[sliceIndex]
    return {
      x: slice.x,
      y: slice.y,
      width: this.frameWidth,
      height: this.frameHeight,
    }
  }

  sanityCheck() {
    if (this.animation && this.frameIndex >= this.animation.frames.length) {
      this.setFrameIndex(this.animation.frames.length - 1)
    }

    if (this.frame && this.sliceIndex >= this.frame.slices.length) {
      this.setSliceIndex(this.frame.slices.length - 1)
    }
  }

  saved(): boolean {
    return this.lastSaveIndex === this.entriesIndex
  }
  markSaved() {
    this.lastSaveIndex = this.entriesIndex
  }
  undo() {
    flog.debug('undo')
    super.undo()
    this.sanityCheck()
    this.canvas.refreshCanvas()
    this.selection.refresh()
    this.set(this)
  }
  redo() {
    flog.debug('redo')
    super.redo()
    this.sanityCheck()
    this.canvas.refreshCanvas()
    this.selection.refresh()
    this.set(this)
  }
  repeat() {
    if (!this.lastEntry) return
    // FIXME: This is _not_ the right place for this! It should probably be stored on the file itself!
    let view = new CanvasView(this.canvas)
    switch (get(editor2DSettings).viewMode) {
      case 'slice':
        if (this.frame) {
          let { x, y, width, height } = this.getSliceAreaFromFrame(this.frame, this.sliceIndex)
          view.x = x
          view.y = y
          view.width = width
          view.height = height
        }
        break
      case 'frame':
        if (this.frame) {
          let { x, y, width, height } = this.getFrameAreaFromFrame(this.frame)
          view.x = x
          view.y = y
          view.width = width
          view.height = height
        }
        break
      case 'animation':
        if (this.animation) {
          let { x, y, width, height } = this.getAnimationAreaFromAnimation(this.animation)
          view.x = x
          view.y = y
          view.width = width
          view.height = height
        }
        break
      case 'stack':
        if (this.stack) {
          let { x, y, width, height } = this.getStackAreaFromStack(this.stack)
          view.x = x
          view.y = y
          view.width = width
          view.height = height
        }
        break
      case 'sheet':
        view.x = 0
        view.y = 0
        view.width = this.canvas.width
        view.height = this.canvas.height
        break
    }
    flog.debug('repeat')

    // Clone the undoable if possible and thereafter apply a position morph to it. This allows us to repeat undoables relative to the editor's view.
    let undoable = this.lastEntry as Undoable<LoadedFile> & { clone?: any }
    if (undoable.clone) {
      let clone = (this.lastEntry as Undoable<LoadedFile> & { clone?: any }).clone()
      if (view.x !== this.lastUndoableView?.x || view.y !== this.lastUndoableView?.y || view.width !== this.lastUndoableView?.width || view.height !== this.lastUndoableView?.height) {
        view.morphUndoable(clone, this.lastUndoableView)
      }
      this.push(clone, view)
    } else {
      this.push(this.lastEntry, view)
    }
  }
  push(item: Undoable<LoadedFile>, view?: CanvasView) {
    flog.debug('push', item.constructor.name)
    if (this.lastSaveIndex > this.entriesIndex) {
      this.lastSaveIndex = -1
    }

    if (view) {
      flog.debug('...transforming by view')
      item = view.transformUndoable(item)
    }

    // Transform pixel placement to work across frames. NOTE: It feels somewhat dangerous to just make modifications based upon frameIndex * frameHeight offsets, but it'll probably be fine.
    let group: UndoableGroup<LoadedFile> | null = null
    if (item instanceof PixelPlaceUndoable) {
      let items: Undoable<LoadedFile>[] = []
      let indices = this.selectedFrameIndices.filter((i) => i < this.animation.frames.length) // Filter out any OOB indices.
      for (let i of indices) {
        let frame = this.animation.frames[i]
        let offsetY = 0
        if (i != this.frameIndex) {
          offsetY = this.frameHeight * (i - this.frameIndex)
        }

        let sliceIndices = this.selectedSliceIndices.filter((i) => i < frame.slices.length)
        for (let j of sliceIndices) {
          let offsetX = 0
          if (j !== this.sliceIndex) {
            offsetX = this.frameWidth * (j - this.sliceIndex)
          }
          let p = this.canvas.getPixel(item.x + offsetX, item.y + offsetY)
          let item2 = new PixelPlaceUndoable(item.x + offsetX, item.y + offsetY, p, item.newIndex)
          items.push(item2)
        }
      }
      group = new UndoableGroup(items)
    } else if (item instanceof PixelsPlaceUndoable) {
      let pixels: { x: number; y: number; index: number }[] = []
      let indices = this.selectedFrameIndices.filter((i) => i < this.animation.frames.length) // Filter out any OOB indices.
      for (let i of indices) {
        let frame = this.animation.frames[i]
        let offsetY = 0
        if (i !== this.frameIndex) {
          offsetY = this.frameHeight * (i - this.frameIndex)
        }

        for (let j of this.selectedSliceIndices.filter((i) => i < frame.slices.length)) {
          let offsetX = 0
          if (j !== this.sliceIndex) {
            offsetX = this.frameWidth * (j - this.sliceIndex)
          }
          for (let pixel of item.pixels) {
            pixels.push({
              x: pixel.x + offsetX,
              y: pixel.y + offsetY,
              index: pixel.index,
            })
          }
        }
      }
      item.pixels = [...item.pixels, ...pixels]
    }

    if (group) {
      super.push(group)
    } else {
      super.push(item)
    }

    if (view) {
      // Clone the view so changes to the source aren't reflected in the future.
      this.lastUndoableView = new CanvasView(view)
    } else {
      this.lastUndoableView = undefined
    }

    this.sanityCheck()
    this.canvas.refreshCanvas()
    this.selection.refresh()
    this.set(this)
  }
}
