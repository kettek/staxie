<!--
  @component
  
  This component provides a modal for creating a new file.
-->
<script lang='ts'>
  import { onMount } from 'svelte';
  import { Canvas } from '../types/canvas'
  import { IndexedPNG } from '../types/png'

  import {
    ModalHeader,
    ModalBody,
    ModalFooter,
    NumberInput,
    Checkbox,
  } from "carbon-components-svelte"

  let width: number = 64
  let height: number = 64
  let frameWidth: number = 64
  let frameHeight: number = 64
  let indexed: boolean = true
  export let png: IndexedPNG
  export let canvas: Canvas
  export let open: boolean = false

  $: {
    if (open) {
      png = new IndexedPNG()
      png.width = width
      png.height = height
      png.frameWidth = frameWidth
      png.frameHeight = frameHeight
      
      let rows = Math.floor(height / frameHeight)
      let cols = Math.floor(width / frameWidth)

      png.groups = [{
        name: 'group',
        sliceCount: 1,
        animations: [{
          name: 'animation',
          frameTime: 100,
          frames: [{
            slices: [{shading: 1, x: 0, y: 0}]
          }]
        }]
      }]
      canvas = new Canvas(width, height)
      canvas.addNewPaletteColor(0, 0, 0, 0)
      canvas.isIndexed = indexed
    }
  }
</script>

<ModalHeader label="Create New File"/>
<ModalBody>
  <NumberInput
    id="width"
    label="Width"
    min={1}
    max={1024}
    bind:value={width}/>
  <NumberInput
    id="height"
    label="Height"
    min={1}
    max={1024}
    bind:value={height}/>
  <NumberInput
    id="frameWidth"
    label="Frame Width"
    min={1}
    max={1024}
    bind:value={frameWidth}/>
  <NumberInput
    id="frameHeight"
    label="Frame Height"
    min={1}
    max={1024}
    bind:value={frameHeight}/>
  <Checkbox labelText="Indexed" bind:checked={indexed}/>
</ModalBody>
<ModalFooter
  primaryButtonText="Create"
  secondaryButtonText="Cancel"
  on:click:button--secondary={() => open = false}
/>

