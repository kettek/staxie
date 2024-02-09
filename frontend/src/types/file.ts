import type { data } from '../../wailsjs/go/models.ts'

export class LoadedFile {
  filepath: string
  title: string
  image: HTMLImageElement
  data: data.StackistFile
}