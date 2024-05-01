import type { BrushType } from '../types/tools'
import { writable } from 'svelte/store'

type Color = [number, number, number, number]

type BrushSettings = {
  // Primary/Secondary color settings.
  primaryColor: Color
  primaryIndex: number
  secondaryColor: Color
  secondaryIndex: number
  // Brush settings
  size: number
  type: BrushType
  // Spray settings
  sprayDensity: number
  sprayRadius: number
}

export const brushSettings = writable<BrushSettings>({
  primaryColor: [255, 255, 255, 255],
  primaryIndex: 0,
  secondaryColor: [0, 0, 0, 255],
  secondaryIndex: 1,
  size: 1,
  type: 'circle',
  sprayDensity: 1,
  sprayRadius: 1,
})