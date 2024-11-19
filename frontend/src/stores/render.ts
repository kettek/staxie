import { makeLocalStorageStore } from './localstore'

type RenderSettings = {
  angleSteps: number
  zoom: number // Zoom level of the preview
  automaticShading: boolean
  minShade: number
  angleOffset: number
  sliceDistance: number
  backgroundColor: string // Background color, may be a hex code or a file
  delay: number
  clockwise: boolean
  interpolateSlices: boolean
}

export const renderSettingsDefault: RenderSettings = {
  angleSteps: 1,
  zoom: 3,
  automaticShading: true,
  minShade: 0.5,
  angleOffset: 0,
  sliceDistance: 1,
  backgroundColor: '#111111',
  delay: 100,
  clockwise: true,
  interpolateSlices: false,
}

export const renderSettings = makeLocalStorageStore<RenderSettings>('render', { ...renderSettingsDefault })
