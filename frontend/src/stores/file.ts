import { writable, get } from 'svelte/store'
import type { LoadedFile } from '../types/file'

export type FileStates = {
  focused: LoadedFile | null
  focusedIndex: number
  files: LoadedFile[]
}

function createFileStates() {
  const { subscribe, set, update } = writable<FileStates>({
    focused: null,
    focusedIndex: -1,
    files: [],
  })

  return {
    subscribe,
    set,
    refresh: () => update((state) => state),
    focusedFile: (): LoadedFile | null => get(fileStates).focused,
    setFocusedFile: (index: number) =>
      update((state) => {
        state.focused = state.files[index]
        state.focusedIndex = index
        return state
      }),
    getFile: (index: number): LoadedFile | null => {
      let fs = get(fileStates)
      if (index < 0 || index >= fs.files.length) {
        return null
      }
      return fs.files[index]
    },
    addFile: (file: LoadedFile) =>
      update((state) => {
        state.files.push(file)
        if (!state.focused) {
          state.focused = file
          state.focusedIndex = 0
        }
        return state
      }),
    removeFile: (index: number) =>
      update((state) => {
        state.files.splice(index, 1)
        if (state.focusedIndex >= state.files.length) {
          state.focusedIndex = state.files.length - 1
          if (state.focusedIndex >= 0) {
            state.focused = state.files[state.focusedIndex]
          } else {
            state.focused = null
          }
        }
        return state
      }),
    setFile: (index: number, file: LoadedFile) =>
      update((state) => {
        state.files[index] = file
        return state
      }),
    length: (): number => {
      let length = 0
      update((state) => {
        length = state.files.length
        return state
      })
      return length
    },
  }
}

export const fileStates = createFileStates()
