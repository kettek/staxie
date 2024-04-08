<!--
  @component
  
  This component provides a modal for creating a new file.
-->
<script lang='ts'>
  import { onMount } from 'svelte';
  import { data } from '../../wailsjs/go/models.js'
  import { Canvas } from '../types/canvas'

  import {
    ModalHeader,
    ModalBody,
    ModalFooter,
    NumberInput,
    Checkbox,
  } from "carbon-components-svelte"

  let width: number = 64
  let height: number = 64
  let indexed: boolean = true
  export let file: data.StackistFileV1
  export let canvas: Canvas
  export let open: boolean = false

  $: {
    if (open) {
      canvas = new Canvas(width, height)
      canvas.addNewPaletteColor(0, 0, 0, 0)
      canvas.isIndexed = indexed
      file = data.StackistFileV1.createFrom({
        width: width,
        height: height,
        groups: {}
      })
    }
  }

  onMount(() => {
    canvas = new Canvas(width, height)
    canvas.addNewPaletteColor(0, 0, 0, 0)
    canvas.isIndexed = indexed
    file = data.StackistFileV1.createFrom({
      width: width,
      height: height,
      groups: {}
    })
  })
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
  <Checkbox labelText="Indexed" bind:checked={indexed}/>
</ModalBody>
<ModalFooter
  primaryButtonText="Create"
  secondaryButtonText="Cancel"
  on:click:button--secondary={() => open = false}
/>

