import { writable } from 'svelte/store'

type Editor2DSettings = {
  // Background settings
  backgroundColor: string
  // Checkerboard settings
  showCheckerboard: boolean
  checkerboardSize: number
  checkerboardColor1: string
  checkerboardColor2: string
  // Grid settings
  showGrid: boolean
  gridMajorColor: string
  gridMinorColor: string
  gridMajorSize: number
  gridMinorSize: number
  // View mode
  viewMode: 'slice' | 'frame' | 'animation' | 'group' | 'sheet'
}

export const editor2DSettings = writable<Editor2DSettings>({
  backgroundColor: '#111111',
  // Checkerboard
  showCheckerboard: true,
  checkerboardSize: 8,
  checkerboardColor1: '#888888',
  checkerboardColor2: '#444444',
  // Grid
  showGrid: true,
  gridMajorSize: 16,
  gridMinorSize: 8,
  gridMajorColor: '#0000ff',
  gridMinorColor: '#006666',
  // View
  viewMode: 'slice',
})