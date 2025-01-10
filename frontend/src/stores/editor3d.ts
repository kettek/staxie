import { makeLocalStorageStore } from './localstore'

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
  showCursor: boolean
  // Voxels
  hoverScale: boolean
  // Clipping
  useClipping: boolean
  clipFill: boolean
  clipPlace: boolean
  clipX: number
  clipY: number
  clipZ: number
  clipW: number
  clipH: number
  clipD: number
}

export const editor3DSettings = makeLocalStorageStore<Editor3DSettings>('editor3d', {
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
  showCursor: true,
  // Voxels
  hoverScale: true,
  // Clipping
  useClipping: false,
  clipFill: true,
  clipPlace: true,
  clipX: 0,
  clipY: 0,
  clipZ: 0,
  clipW: 0,
  clipH: 0,
  clipD: 0,
})
