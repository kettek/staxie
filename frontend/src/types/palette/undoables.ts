import { type Undoable } from '../undo'
import { Palette } from '../palette'

export class PaletteReplaceSwatchUndoable implements Undoable<Palette> {
  index: number
  color: number
  oldColor: number = 0
  constructor(index: number, r: number, g: number, b: number, a: number) {
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
  oldName: string = ''
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
