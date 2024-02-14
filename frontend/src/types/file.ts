import type { data } from '../../wailsjs/go/models.ts'
import type { Canvas } from './canvas.ts'

export class LoadedFile {
  filepath: string
  title: string
  canvas: Canvas
  data: data.StackistFileV1
}