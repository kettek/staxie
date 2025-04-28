import { makeLocalStorageStore } from './localstore'

type AutosaveSettings = {
  enabled: boolean
  interval: number
  saveToTemporary: boolean
}

export const autosaveSettingsDefault: AutosaveSettings = {
  enabled: true,
  interval: 15,
  saveToTemporary: false,
}

export const autosaveSettings = makeLocalStorageStore<AutosaveSettings>('autosave', { ...autosaveSettingsDefault })
