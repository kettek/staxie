import { writable } from 'svelte/store'

type Editor3DSettings = {
  // Render settings
  hideTransparent: boolean
  ignoreAlpha: boolean
  // Background settings
  backgroundColor: string
  // Grid settings
  showGrid: boolean
  gridMajorColor: string
  gridMinorColor: string
  gridMajorSize: number
  gridMinorSize: number
  // Tool settings
  floodFillX: boolean
  floodFillY: boolean
  floodFillZ: boolean
}

export const editor3DSettings = writable<Editor3DSettings>({
  // Render
  hideTransparent: false,
  ignoreAlpha: false,
  // Background
  backgroundColor: '#111111',
  // Checkerboard
  showGrid: true,
  gridMajorSize: 16,
  gridMinorSize: 8,
  gridMajorColor: '#0000ff',
  gridMinorColor: '#006666',
  // Tool settings
  floodFillX: true,
  floodFillY: true,
  floodFillZ: true,
})