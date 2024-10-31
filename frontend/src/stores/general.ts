import { makeLocalStorageStore } from './localstore'

type GeneralSettings = {
  frameWidth: number
  frameHeight: number
  useRichPresence: boolean
}

export const generalSettings = makeLocalStorageStore<GeneralSettings>('general', {
  frameWidth: 32,
  frameHeight: 32,
  useRichPresence: false,
})
