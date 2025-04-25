import { makeLocalStorageStore } from './localstore'

type SmallPreviewSettings = {
  show: boolean
  animate: boolean
  spin: boolean
  spinSpeed: number
  background: string
  wheelIncrement: number
  interpolateSlices: boolean
}

export const smallPreviewSettingsDefault: SmallPreviewSettings = {
  show: true,
  animate: true,
  spin: false,
  spinSpeed: 0.5,
  background: '#111111',
  wheelIncrement: 1,
  interpolateSlices: false,
}

export const smallPreviewSettings = makeLocalStorageStore<SmallPreviewSettings>('smallPreview', { ...smallPreviewSettingsDefault })
