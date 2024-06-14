import { writable, get } from 'svelte/store'
import type { LoadedFile } from '../types/file'

export type FileStates = LoadedFile[]

function createFileStates() {
  const { subscribe, set, update } = writable<FileStates>([])

  return {
    subscribe,
    set,
    refresh: () => update((state) => state),
    getFile: (index: number): LoadedFile | null => {
      let fs = get(fileStates)
      if (index < 0 || index >= fs.length) {
        return null
      }
      return fs[index]
    },
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
    length: (): number => {
      let length = 0
      update((state) => {
        length = state.length
        return state
      })
      return length
    },
  }
}

export const fileStates = createFileStates()