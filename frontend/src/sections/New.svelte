<!--
  @component

  This component provides a modal for creating a new file.
-->
<script lang="ts">
  import { Canvas } from '../types/canvas'
  import { IndexedPNG } from '../types/png'

  import { ModalHeader, ModalBody, ModalFooter, NumberInput, Checkbox } from 'carbon-components-svelte'

  let width: number = 64
  let height: number = 64
  let indexed: boolean = true
  export let png: IndexedPNG
  export let canvas: Canvas
  export let open: boolean = false

  $: {
    if (open) {
      png = new IndexedPNG()
      png.width = width || 1
      png.height = height || 1
      png.frameWidth = width || 1
      png.frameHeight = height || 1

      png.stacks = [
        {
          name: 'stack',
          sliceCount: 1,
          animations: [
            {
              name: 'animation',
              frameTime: 100,
              frames: [
                {
                  slices: [{ shading: 1, x: 0, y: 0 }],
                },
              ],
            },
          ],
        },
      ]
      canvas = new Canvas(png.width, png.height)
      canvas.addNewPaletteColor(0, 0, 0, 0)
      canvas.isIndexed = indexed
    }
  }
</script>

<ModalHeader label="Create New File" />
<ModalBody>
  <NumberInput id="width" label="Slice Width" min={1} max={1024} bind:value={width} />
  <NumberInput id="height" label="Slice Height" min={1} max={1024} bind:value={height} />
  <Checkbox labelText="Indexed" bind:checked={indexed} />
</ModalBody>
<ModalFooter primaryButtonText="Create" secondaryButtonText="Cancel" on:click:button--secondary={() => (open = false)} />
