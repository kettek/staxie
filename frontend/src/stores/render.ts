import { makeLocalStorageStore } from './localstore'

type RenderSettings = {
  angleSteps: number
  zoom: number // Zoom level of the preview
  minShade: number
  angleOffset: number
  sliceDistance: number
  backgroundColor: string // Background color, may be a hex code or a file
  delay: number
  clockwise: boolean
}

export const renderSettingsDefault: RenderSettings = {
  angleSteps: 1,
  zoom: 3,
  minShade: 0.5,
  angleOffset: 0,
  sliceDistance: 1,
  backgroundColor: '#111111',
  delay: 100,
  clockwise: true,
}

export const renderSettings = makeLocalStorageStore<RenderSettings>('render', { ...renderSettingsDefault })
