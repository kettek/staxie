import { makeLocalStorageStore } from './localstore'

type SmallPreviewSettings = {
  show: boolean
  background: string
  spinSpeed: number
  wheelIncrement: number
  interpolateSlices: boolean
}

export const smallPreviewSettingsDefault: SmallPreviewSettings = {
  show: true,
  background: '#111111',
  spinSpeed: 0.5,
  wheelIncrement: 1,
  interpolateSlices: false,
}

export const smallPreviewSettings = makeLocalStorageStore<SmallPreviewSettings>('smallPreview', { ...smallPreviewSettingsDefault })
