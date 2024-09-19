<!--
  @component

  This component provides a modal for creating a new file.
-->
<script lang="ts">
  import { ModalHeader, ModalBody, ModalFooter, NumberInput, Checkbox } from 'carbon-components-svelte'

  import { Canvas } from '../types/canvas'
  import { IndexedPNG } from '../types/png'
  import { generalSettings } from '../stores/general'

  let indexed: boolean = true
  export let png: IndexedPNG
  export let canvas: Canvas
  export let open: boolean = false

  $: {
    if (open) {
      png = new IndexedPNG()
      png.width = $generalSettings.frameWidth || 1
      png.height = $generalSettings.frameHeight || 1
      png.frameWidth = $generalSettings.frameWidth || 1
      png.frameHeight = $generalSettings.frameHeight || 1

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
  <NumberInput id="width" label="Slice Width" min={1} max={1024} bind:value={$generalSettings.frameWidth} />
  <NumberInput id="height" label="Slice Height" min={1} max={1024} bind:value={$generalSettings.frameHeight} />
  <Checkbox labelText="Indexed" bind:checked={indexed} />
</ModalBody>
<ModalFooter primaryButtonText="Create" secondaryButtonText="Cancel" on:click:button--secondary={() => (open = false)} />
