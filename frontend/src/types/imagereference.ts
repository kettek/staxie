import { writable, type Invalidator, type Subscriber, type Unsubscriber, type Updater } from "svelte/store"

export type ImageReference = {
  image?: HTMLImageElement
  src: string
  x: number
  y: number

  flipX: boolean
  flipY: boolean
  rotation: number

  zoom: number
  opacity: number
}

export function createImageReference(src: string, b64: string, x: number, y: number): ImageReference {
  const img = new Image()
  img.src = b64
  console.log(src, b64)
  return {
    image: img,
    src,
    x,
    y,
    flipX: false,
    flipY: false,
    rotation: 0,
    zoom: 1,
    opacity: 0.75,
  }
}

export type ImageReferenceStore = {
  subscribe: (this: void, run: Subscriber<ImageReference[]>, invalidate?: Invalidator<ImageReference[]> | undefined) => Unsubscriber
  set: (this: void, value: ImageReference[]) => void
  update: (this: void, updater: Updater<ImageReference[]>) => void
  replace: (this: void, image: ImageReference) => void
  add: (this: void, image: ImageReference) => void
  remove: (this: void, src: string) => void
  clear: (this: void) => void
  list: () => ImageReference[]
}

export function createImageReferenceStore(): ImageReferenceStore {
  const { subscribe, set, update } = writable<ImageReference[]>([])

  return {
    subscribe,
    set,
    update,
    replace: (image: ImageReference) => update((state: ImageReference[]) => {
      let index = state.findIndex((img) => img.src === image.src)
      if (index !== -1) {
        state[index] = image
      }
      return state
    }),
    add: (image: ImageReference) => update((state: ImageReference[]) => {
      state.push(image)
      return state
    }),
    remove: (src: string) => update((state: ImageReference[]) => {
      state = state.filter((image) => image.src !== src)
      return state
    }),
    clear: () => set([]),
    list: () => {
      let list: ImageReference[] = []
      update((state: ImageReference[]) => {
        list = state
        return state
      })
      return list
    }
  }
}
