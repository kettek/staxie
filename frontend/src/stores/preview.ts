import { makeLocalStorageStore } from './localstore'

type PreviewSettings = {
  background: string // Background color, may be a hex code or a file
  rotation: number // Rotation of the preview
  zoom: number // Zoom level of the preview
  interpolateSlices: boolean
  // Outline
  baseSizeOutlineColor: string
  showBaseSizeOutline: boolean
  sizeOutlineColor: string
  showSizeOutline: boolean
  // Recording
  framePrefix: string
  frameSuffix: string
  secondsBetweenFrames: number
  canvasWidth: number
  canvasHeight: number
  useCanvasSize: boolean
}

export const previewSettingsDefault: PreviewSettings = {
  background: '#111111',
  rotation: 0,
  zoom: 1,
  interpolateSlices: false,
  //
  baseSizeOutlineColor: '#00ffff77',
  showBaseSizeOutline: true,
  sizeOutlineColor: '#ffff0077',
  showSizeOutline: true,
  // Recording
  secondsBetweenFrames: 10,
  framePrefix: 'frame-',
  frameSuffix: '',
  canvasWidth: 200,
  canvasHeight: 100,
  useCanvasSize: false,
}

export const previewSettings = makeLocalStorageStore<PreviewSettings>('preview', { ...previewSettingsDefault })
