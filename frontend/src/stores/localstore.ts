import { writable, type Subscriber, type Updater, type Writable } from 'svelte/store'

export function makeLocalStorageStore<T>(key: string, value: T): Writable<T> {
  // Load any existing storage.
  let existing = localStorage.getItem(key)
  if (existing) {
    value = {
      ...value,
      ...JSON.parse(existing)
    }
  }

  const { set, update, subscribe } = writable<T>(value)

  return {
    set: (v: T) => {
      localStorage.setItem(key, JSON.stringify(v))
      set(v)
    },
    update: (updater: Updater<T>) => {
      localStorage.setItem(key, JSON.stringify(updater))
      update(updater)
    },
    subscribe,
  }
}
