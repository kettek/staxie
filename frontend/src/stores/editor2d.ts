import { createImageReferenceStore, type ImageReferenceStore } from '../types/imagereference'
import { makeLocalStorageStore } from './localstore'

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
  // Editor mode
  editorMode: '2d' | '3d' | 'both'
  // View mode
  viewMode: 'slice' | 'frame' | 'animation' | 'stack' | 'sheet'
  // References
  imageReferences: ImageReferenceStore
}

export const editor2DSettings = makeLocalStorageStore<Editor2DSettings>('editor2d', {
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
  // Editor mode
  editorMode: '2d',
  // View
  viewMode: 'slice',
  // References
  imageReferences: createImageReferenceStore(),
})