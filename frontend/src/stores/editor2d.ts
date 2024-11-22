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
  sliceBorderColor: string
  frameBorderColor: string
  animationBorderColor: string
  stackBorderColor: string
  // References
  imageReferences: ImageReferenceStore
  // Layout
  minifiedLeftPanel: boolean
}

export const editor2DSettingsDefault: Editor2DSettings = {
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
  sliceBorderColor: '#ffffff',
  frameBorderColor: '#ff0000',
  animationBorderColor: '#00ffff',
  stackBorderColor: '#0000ff',
  // References
  imageReferences: createImageReferenceStore(),
  // Layout
  minifiedLeftPanel: false,
}

export const editor2DSettings = makeLocalStorageStore<Editor2DSettings>('editor2d', { ...editor2DSettingsDefault })
