import { writable } from 'svelte/store'
import { type Palette } from '../types/palette'
import { defaultPalette } from '../types/palette/undoables'

function createPalettesStore() {
  const { subscribe, set, update } = writable<Palette[]>([defaultPalette])
  
  return {
    subscribe,
    set,
    refresh: () => update((state) => state),
    addPalette: (palette: Palette) => update((state) => {
      state.push(palette)
      return state
    }),
    removePalette: (palette: Palette) => update((state) => {
      for (let i = 0; i < state.length; i++) {
        if (state[i] === palette) {
          state.splice(i, 1)
          return state
        }
      }
      return state
    }),
    removePaletteByIndex: (index: number) => update((state) => {
      state.splice(index, 1)
      return state
    }),
  }
}

export const palettesStore = createPalettesStore()