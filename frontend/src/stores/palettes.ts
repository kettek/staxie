import { writable } from "svelte/store"
import { defaultPalette, type Palette } from "../types/palette"

export const palettesStore = writable<Palette[]>([defaultPalette])