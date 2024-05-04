import { writable } from 'svelte/store'
import type { LoadedFile } from '../types/file'

export type FileStates = LoadedFile[]

function createFileStates() {
  const { subscribe, set, update } = writable<FileStates>([])

  return {
    subscribe,
    set,
    refresh: () => update((state) => state),
    addFile: (file: LoadedFile) => update((state) => {
      state.push(file)
      return state
    }),
    removeFile: (index: number) => update((state) => {
      state.splice(index, 1)
      return state
    }),
    setFile: (index: number, file: LoadedFile) => update((state) => {
      state[index] = file
      return state
    }),
  }
}

export const fileStates = createFileStates()