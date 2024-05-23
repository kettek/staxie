<script lang='ts'>
  import { GetFilePath, OpenFileBytes } from '../../wailsjs/go/main/App'
  import { Canvas } from '../types/canvas'
  import { IndexedPNG } from '../types/png'
  import YAML from 'yaml'

  import { onMount } from 'svelte'

  import {
    ComposedModal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Dropdown,
    Button,
    Grid,
    Row,
    Column,
    Checkbox
  } from "carbon-components-svelte"

  export let open: boolean = false
  export let valid: boolean = false
  export let canvas: Canvas
  export let png: IndexedPNG
  export let importFilepath: string = ''
  export let importTitle: string = ''

  let selectedId: string = 'ves'
  let selectedFilePath: string = ''
  let updateSource: boolean = false
  
  async function openFile() {
    valid = false
    let filters: string[][] = []
    if (selectedId === 'ves') {
      filters = [
        ["VES Spritestack"],
        ["*.yaml"],
      ]
    }

    selectedFilePath = await GetFilePath(filters[0], filters[1])
    let b = atob((await OpenFileBytes(selectedFilePath)) as unknown as string)
    if (selectedId === 'ves') {
      await parseVES(b)
    }
  }
  async function parseVES(yamlBytes: string) {
    const yml = YAML.parse(yamlBytes)
    // Find our root sprites path and append source.
    const i = selectedFilePath.lastIndexOf('Sprites')
    if (i === -1) {
      alert('could not find root for imported YAML -- is it in a Sprites directory?')
      return
    }
    const root = selectedFilePath.substring(0, i+('Sprites'.length))
    const spritePath = root + '/' + yml.source
    
    importFilepath = spritePath
    importTitle = /[^/\\]*$/.exec(importFilepath)[0]

    // Read in our sprite PNG
    const b = (await OpenFileBytes(spritePath)) as unknown as string
    png = new IndexedPNG(Uint8Array.from(atob(b), (v) => v.charCodeAt(0)))
    await png.decode()

    // Convert png to a canvas that we can use to write all our reformulated sprite data to. NOTE: This is inefficient, but it works fine for now.
    canvas = new Canvas(png)

    // Let's collect our imports.
    type ImportSlice = {
      x: number
      y: number
      pixels: Uint8Array
    }
    type ImportFrame = ImportSlice[]
    type ImportAnimation = {
      name: string
      frames: ImportFrame[]
    }
    type ImportGroup = {
      name: string
      animations: ImportAnimation[]
      sliceCount: number
    }
    let maxWidth = 0
    let maxHeight = 0
    let frameWidth = 0
    let frameHeight = 0
    let importGroups: ImportGroup[] = []
    for (let [animationName, animation] of Object.entries(yml.animations)) {
      if (animationName !== 'top' && animationName !== 'bot') continue
      let ingroup: ImportGroup = {
        name: animationName,
        animations: [],
        sliceCount: 0,
      }
      for (let [setName, set] of Object.entries(animation.sets)) {
        let parts = setName.split('_')
        let animation = parts[0]
        let frame = Number(parts[1])

        let inanimation: ImportAnimation = ingroup.animations.find(v=>v.name === animation)
        if (!inanimation) {
          ingroup.animations.push({
            name: animation,
            frames: [],
          })
          inanimation = ingroup.animations[ingroup.animations.length-1]
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
          }
          ingroup.sliceCount = Math.max(ingroup.sliceCount, sliceIndex+1)
          inanimation.frames[frame][sliceIndex] = inslice
          frameWidth = slice.width
          frameHeight = slice.height
        }
      }
      importGroups.push(ingroup)
    }

    canvas.clear()

    let y = 0
    maxWidth = 0
    maxHeight = 0
    png.frameWidth = frameWidth
    png.frameHeight = frameHeight
    png.groups = []
    for (let group of importGroups) {
      let pngGroup = {
        animations: [],
        name: group.name,
        sliceCount: group.sliceCount,
      }
      for (let animation of group.animations) {
        console.log(y)
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

            x += frameWidth
            maxWidth = Math.max(maxWidth, x)
          }
          y += frameHeight
          maxHeight = Math.max(maxHeight, y)
          pngAnimation.frames.push(pngFrame)
        }
        pngGroup.animations.push(pngAnimation)
      }
      png.groups.push(pngGroup)
    }
    canvas.resizeCanvas(maxWidth, maxHeight)
    canvas.refreshCanvas()

    valid = true
  }
  
  onMount(() => {
    valid = false
  })
</script>

<ModalHeader label="Importie"/>
<ModalBody hasForm>
  <Grid condensed narrow>
    <Row condensed narrow>
      <Column>
        <Dropdown
          bind:selectedId
          items={[
            { id: 'ves', text: "VES Spritestack"}
          ]}
        />
      </Column>
      <Column>
        <Button
          size="field"
          kind="secondary"
          on:click={openFile}
        >
        Open File
        </Button>
      </Column>
    </Row>
    {#if selectedId==='ves'}
      <Row condensed narrow>
        <Column>
          <Checkbox labelText="Update Source VES File" bind:checked={updateSource} />
        </Column>
      </Row>
    {/if}
  </Grid>
</ModalBody>
<ModalFooter
  primaryButtonText="Import"
  secondaryButtonText="Cancel"
  primaryButtonDisabled={!valid}
  on:click:button--secondary={() => open = false}
/>
