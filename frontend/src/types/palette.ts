export class Palette {
  entries: PaletteEntry[];
}

export class PaletteEntry {
  color: string;
}

export const defaultPalette = (): Palette => {
  return {
    entries: [
      {color: "#00000000"},
      {color: "#000000ff"},
      {color: "#ffffffff"},
    ]
  }
}
