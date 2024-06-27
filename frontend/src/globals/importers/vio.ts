import { LoadedFile } from '../../types/file'
import { GetFilePath, OpenFileBytes, SaveFileBytes } from '../../../wailsjs/go/main/App'
import { Canvas } from '../../types/canvas'
import { IndexedPNG } from '../../types/png'
import YAML from 'yaml'

export async function Open(): Promise<string> {
  let filters: string[][] = [
    ["VES Spritestack"],
    ["*.yaml"],
  ]
  return GetFilePath(filters[0], filters[1])
}

export type VioImportResults = {
  png: IndexedPNG
  canvas: Canvas
  title: string
  filePath: string
  spritePath: string
  parsed: any
}

export type ImportSlice = {
  x: number
  y: number
  pixels?: Uint8Array
  origSubset: any
}
export type ImportFrame = ImportSlice[]
export type ImportAnimation = {
  name: string
  frames: ImportFrame[]
  frameTime: number
}
export type ImportStack = {
  name: string
  animations: ImportAnimation[]
  sliceCount: number
}
export type ImportStaxie = {
  frameWidth: number
  frameHeight: number
  stacks: ImportStack[]
}

export async function Read(filepath: string): Promise<VioImportResults> {
  let filePath: string = filepath
  let spritePath: string = ''
  let title: string = ''
  let png: IndexedPNG
  let canvas: Canvas

  // Read our filepath to a YAML.
  let data = atob((await OpenFileBytes(filePath)) as unknown as string)
  const yml = YAML.parse(data)
  // Find our root sprites path and append source.
  const i = filePath.lastIndexOf('Sprites')
  if (i === -1) {
    alert('could not find root for imported YAML -- is it in a Sprites directory?')
    return
  }
  const root = filePath.substring(0, i+('Sprites'.length))
  spritePath = root + '/' + yml.source
  
  title = /[^/\\]*$/.exec(filePath)[0]

  // Read in our sprite PNG
  const b = (await OpenFileBytes(spritePath)) as unknown as string
  png = new IndexedPNG(Uint8Array.from(atob(b), (v) => v.charCodeAt(0)))
  await png.decode()

  // Convert png to a canvas that we can use to write all our reformulated sprite data to. NOTE: This is inefficient, but it works fine for now.
  canvas = new Canvas(png)

  // Let's collect our imports.
  let maxWidth = 0
  let maxHeight = 0
  let frameSizeCounts: Record<string, number> = {}
  let importStacks: ImportStack[] = []
  for (let [animationName, animation] of Object.entries(yml.animations)) {
    if (animationName !== 'top' && animationName !== 'bot') continue
    let instack: ImportStack = {
      name: animationName,
      animations: [],
      sliceCount: 0,
    }
    for (let [setName, set] of Object.entries(animation.sets)) {
      let parts = setName.split('_')
      let anim = parts[0]
      let frame = Number(parts[1])

      let inanimation: ImportAnimation|undefined = instack.animations.find(v=>v.name === anim)
      if (!inanimation) {
        instack.animations.push({
          name: anim,
          frames: [],
        })
        inanimation = instack.animations[instack.animations.length-1]
      }

      for (let i = inanimation.frames.length; i <= frame; i++) {
        inanimation.frames.push([])
      }
      // Read in our slices...
      for (let [subsetName, subset] of Object.entries(set.subsets)) {
        let sliceIndex = Number(subsetName)
        let slice = subset.frames[0]
        let inslice: ImportSlice = {
          x: slice.x,
          y: slice.y,
          pixels: canvas.getPixels(slice.x, slice.y, slice.width, slice.height),
          origSubset: subset,
        }
        instack.sliceCount = Math.max(instack.sliceCount, sliceIndex+1)
        inanimation.frames[frame][sliceIndex] = inslice
        frameSizeCounts[`${slice.width}x${slice.height}`] = (frameSizeCounts[`${slice.width}x${slice.height}`] || 0) + 1
      }
    }
    importStacks.push(instack)
  }

  canvas.clear()

  let y = 0
  maxWidth = 0
  maxHeight = 0
  
  let bestFrameSize = Object.keys(frameSizeCounts).sort((a, b) => frameSizeCounts[b] - frameSizeCounts[a])[0]

  let frameWidth = Number(bestFrameSize.split('x')[0])
  let frameHeight = Number(bestFrameSize.split('x')[1])

  png.frameWidth = frameWidth
  png.frameHeight = frameHeight
  png.stacks = []
  for (let stack of importStacks) {
    let pngStack = {
      animations: [],
      name: stack.name,
      sliceCount: stack.sliceCount,
    }
    for (let animation of stack.animations) {
      let pngAnimation = {
        name: animation.name,
        frames: [],
        frameTime: 100,
      }
      for (let frameIndex = 0; frameIndex < animation.frames.length; frameIndex++) {
        let pngFrame = {
          slices: [],
        }
        let frame = animation.frames[frameIndex]
        let x = 0
        for (let sliceIndex = 0; sliceIndex < frame.length; sliceIndex++) {
          let slice = frame[sliceIndex]

          canvas.setPixels(x, y, frameWidth, frameHeight, slice.pixels)

          let pngSlice = {
            shading: 255,
            x: x,
            y: y,
          }
          pngFrame.slices.push(pngSlice)
          
          // Update original
          slice.origSubset.frames[0].x = x
          slice.origSubset.frames[0].y = y

          x += frameWidth
          maxWidth = Math.max(maxWidth, x)
        }
        y += frameHeight
        maxHeight = Math.max(maxHeight, y)
        pngAnimation.frames.push(pngFrame)
      }
      pngStack.animations.push(pngAnimation)
    }
    png.stacks.push(pngStack)
  }
  canvas.resizeCanvas(maxWidth, maxHeight)
  canvas.refreshCanvas()
  
  return {
    png,
    canvas,
    title,
    filePath,
    spritePath,
    parsed: yml,
  }
}

export async function Import(results: VioImportResults, updateSource: boolean = false, updatePNG: boolean = false): Promise<LoadedFile> {
  let { png, canvas, title, filePath, spritePath, parsed } = results
  let file = new LoadedFile({filepath: spritePath, title: title, canvas: canvas, data: png})
  if (updateSource) {
    let newYaml = YAML.stringify(parsed)
    await SaveFileBytes(filePath, btoa(newYaml) as any)
  }
  if (updatePNG) {
    let b = await canvas.toPNG(file)
    await SaveFileBytes(spritePath, [...b])
  }
  return file
}