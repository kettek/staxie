import type { Invalidator, Subscriber, Unsubscriber, Updater } from 'svelte/store'
import { log, clog, flog, plog } from '../globals/log'
import { writable } from 'svelte/store'

type LogLevel = 'silly' | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

type LogSettings = {
  level: LogLevel
}

interface LogSettingsStore {
  subscribe: (this: void, run: Subscriber<LogSettings>, invalidate?: Invalidator<LogSettings> | undefined) => Unsubscriber
  set: (this: void, value: LogSettings) => void
  update: (this: void, updater: Updater<LogSettings>) => void
  setLevel: (level: LogLevel) => void
}

function createLogSettingsStore(): LogSettingsStore {
  const { subscribe, set, update } = writable<LogSettings>({
    level: 'debug',
  })

  return {
    subscribe,
    set,
    update,
    setLevel: (level: LogLevel) => update((state) => {
      let lvl = 0
      switch(level) {
        case 'silly':
          lvl = 0
        break
        case 'trace':
          lvl = 1
        break
        case 'debug':
          lvl = 2
        break
        case 'info':
          lvl = 3
        break
        case 'warn':
          lvl = 4
        break
        case 'error':
          lvl = 5
        break
        case 'fatal':
          lvl = 6
        break
        default:
          return state
      }
      state.level = level
      log.settings.minLevel = lvl
      flog.settings.minLevel = lvl
      clog.settings.minLevel = lvl
      plog.settings.minLevel = lvl
      return state
    }),
  }
}

export const logSettings = createLogSettingsStore()