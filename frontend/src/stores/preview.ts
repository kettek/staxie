import { makeLocalStorageStore } from './localstore'

type PreviewSettings = {
  background: string // Background color, may be a hex code or a file
  rotation: number // Rotation of the preview
  zoom: number // Zoom level of the preview
  // Outline
  baseSizeOutlineColor: string
  showBaseSizeOutline: boolean
  sizeOutlineColor: string
  showSizeOutline: boolean
}

export const previewSettings = makeLocalStorageStore<PreviewSettings>('preview', {
  background: '#111111',
  rotation: 0,
  zoom: 1,
  //
  baseSizeOutlineColor: '#00ffff77',
  showBaseSizeOutline: true,
  sizeOutlineColor: '#ffff0077',
  showSizeOutline: true,
})