import { makeLocalStorageStore } from './localstore'

type GeneralSettings = {
  frameWidth: number
  frameHeight: number
}

export const generalSettings = makeLocalStorageStore<GeneralSettings>('general', {
  frameWidth: 32,
  frameHeight: 32,
})
