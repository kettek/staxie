import { writable, type Subscriber, type Unsubscriber, type Updater, type Writable } from 'svelte/store'
import { UndoableStack, type Undoable } from './undo'

export class Palette extends UndoableStack<Palette> implements Writable<Palette> {
  name: string
  swatches: Uint32Array
  constructor(name: string, swatches: Uint32Array) {
    super()
    this.name = name
    this.swatches = swatches

    const { subscribe, set, update } = writable<Palette>(this)
    this.subscribe = subscribe
    this.set = set
    this.update = update

    this.setTarget(this)
  }

  subscribe: (this: void, run: Subscriber<Palette>) => Unsubscriber
  set: (this: void, value: Palette) => void
  update: (this: void, updater: Updater<Palette>) => void

  hasPaletteColor(r: number, g: number, b: number, a: number): boolean {
    for (let swatch of this.swatches) {
      if ((swatch & 0xFF) === r && ((swatch >> 8) & 0xFF) === g && ((swatch >> 16) & 0xFF) === b && ((swatch >> 24) & 0xFF) === a) {
        return true
      }
    }
    return false
  }
  
  undo() {
    super.undo()
    this.set(this)
  }
  redo() {
    super.redo()
    this.set(this)
  }
  push(item: Undoable<Palette>) {
    super.push(item)
    this.set(this)
  }
}

export class PaletteReplaceSwatchUndoable implements Undoable<Palette> {
  index: number
  color: number
  oldColor: number
  constructor(index: number, r: number, g: number, b: number, a) {
    this.index = index
    this.color = (a << 24) | (b << 16) | (g << 8) | r
  }
  apply(palette: Palette) {
    this.oldColor = palette.swatches[this.index]
    palette.swatches[this.index] = this.color
  }
  unapply(palette: Palette) {
    palette.swatches[this.index] = this.oldColor
  }
}

export class PaletteAddSwatchUndoable implements Undoable<Palette> {
  color: number
  constructor(r: number, g: number, b: number, a: number) {
    this.color = (a << 24) | (b << 16) | (g << 8) | r
  }
  apply(palette: Palette) {
    palette.swatches = new Uint32Array([...palette.swatches, this.color])
  }
  unapply(palette: Palette) {
    palette.swatches = palette.swatches.slice(0, palette.swatches.length - 1)
  }
}

export class PaletteRenameUndoable implements Undoable<Palette> {
  name: string
  oldName: string
  constructor(name: string) {
    this.name = name
  }
  apply(palette: Palette) {
    this.oldName = palette.name
    palette.name = this.name
  }
  unapply(palette: Palette) {
    palette.name = this.oldName
  }
}

export const defaultPalette = new Palette('Default', new Uint32Array([
  0x00000000, 0xFF88C070, 0xFF346856, 0xFF081820,
  0xFFF8F8F8, 0xFFC0C0C0, 0xFF606060, 0xFF202020,
  0xFFF8D8F8, 0xFFA800A8, 0xFF503050, 0xFF200020,
  0xFFF8B8F8, 0xFFA800A8, 0xFF503050, 0xFF200020,
]))
