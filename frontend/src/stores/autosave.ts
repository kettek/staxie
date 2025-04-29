import { makeLocalStorageStore } from './localstore'

type AutosaveSettings = {
  enabled: boolean
  interval: number
  saveToTemporary: boolean
  saveToTempDir: boolean
}

export const autosaveSettingsDefault: AutosaveSettings = {
  enabled: true,
  interval: 15,
  saveToTemporary: false,
  saveToTempDir: true,
}

export const autosaveSettings = makeLocalStorageStore<AutosaveSettings>('autosave', { ...autosaveSettingsDefault })
