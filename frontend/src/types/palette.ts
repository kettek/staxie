export class Palette {
  name: string
  swatches: Uint32Array
}

export const defaultPalette: Palette = {
  name: 'Default',
  swatches: new Uint32Array([
    0x00000000, 0xFF88C070, 0xFF346856, 0xFF081820,
    0xFFF8F8F8, 0xFFC0C0C0, 0xFF606060, 0xFF202020,
    0xFFF8D8F8, 0xFFA800A8, 0xFF503050, 0xFF200020,
    0xFFF8B8F8, 0xFFA800A8, 0xFF503050, 0xFF200020,
  ])
}
