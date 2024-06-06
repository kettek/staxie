import { writable, type Subscriber, type Unsubscriber, type Updater, type Writable } from 'svelte/store'
import { UndoableStack, type Undoable } from './undo'
import { AppDirectory } from '../../wailsjs/go/main/App'

export class Palette extends UndoableStack<Palette> implements Writable<Palette> {
  name: string
  swatches: Uint32Array
  saveToDisk: boolean = false
  private pendingSaveTimeout: number
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

  // fromJACPAL creates a new Palette from a given name and 4 or 3 element JASC-PAL file data.
  static fromJASCPAL(name: string, data: string): Palette {
    let lines = data.split('\n')
    if (lines.length < 4 || lines[0] !== 'JASC-PAL' || lines[1] !== '0100') {
      alert('Invalid JASC-PAL file')
      return
    }
    let swatches = new Uint32Array(parseInt(lines[2]))
    for (let i = 3; i < lines.length; i++) {
      let [r, g, b, a] = lines[i].split(' ').map(x => parseInt(x))
      if (a === undefined) a = 255
      swatches[i - 3] = (a << 24) | (b << 16) | (g << 8) | r
    }
    return new Palette(name, swatches)
  }

  // toJASCPAL returns a string containing the palette swatches in 4 element JASC-PAL format.
  toJASCPAL(): string {
    let out = `JASC-PAL\n0100\n${this.swatches.length}\n`
    for (let swatch of this.swatches) {
      let r = (swatch >> 24) & 0xFF
      let g = (swatch >> 16) & 0xFF
      let b = (swatch >> 8) & 0xFF
      let a = swatch & 0xFF
      out += `${r} ${g} ${b} ${a}\n`
    }
    return out
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

  startPendingSave() {
    if (!this.saveToDisk) return
    if (this.pendingSaveTimeout) {
      window.clearTimeout(this.pendingSaveTimeout)
    }
    this.pendingSaveTimeout = window.setTimeout(async () => {
      let p = (await AppDirectory('palettes')) + '/' + this.name + '.pal'
      console.log('Saving palette to disk...', p, this.toJASCPAL())
    }, 3000)
  }

    undo() {
    super.undo()
    this.set(this)
    this.startPendingSave()
  }
  redo() {
    super.redo()
    this.set(this)
    this.startPendingSave()
  }
  push(item: Undoable<Palette>) {
    super.push(item)
    this.set(this)
    this.startPendingSave()
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
