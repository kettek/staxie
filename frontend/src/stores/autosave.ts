import { makeLocalStorageStore } from './localstore'

type AutosaveSettings = {
  enabled: boolean
  interval: number
}

export const autosaveSettingsDefault: AutosaveSettings = {
  enabled: true,
  interval: 15,
}

export const autosaveSettings = makeLocalStorageStore<AutosaveSettings>('autosave', { ...autosaveSettingsDefault })
