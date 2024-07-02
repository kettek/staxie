<!--
  @component
  
  This component provides a modal for moving or swapping a swatch within the palette.
-->
<script lang='ts'>
  import { Checkbox, Modal, NumberInput, RadioButton, RadioButtonGroup } from "carbon-components-svelte"
  import { type LoadedFile } from "../types/file"
  import { MoveSwatchUndoable, RemoveSwatchUndoable, SwapSwatchUndoable } from "../types/file/undoables"
  
  export let file: LoadedFile

  export let paletteIndex: number = 0
  export let open: boolean = false
  
  let swapIndex: number = 0
  let updatePixels: boolean = true
  let selected: string = "move"
</script>

<Modal
  preventCloseOnClickOutside
  hasScrollingContent
  bind:open
  modalHeading="Move Palette Swatch"
  primaryButtonText="Apply"
  secondaryButtonText="Cancel"
  on:close={() => open = false}
  on:click:button--secondary={() => open = false}
  on:submit={() => {
    open = false
    if (selected === "move") {
      file.push(new MoveSwatchUndoable(paletteIndex, swapIndex, updatePixels))
    } else {
      file.push(new SwapSwatchUndoable(paletteIndex, swapIndex, updatePixels))
    }
  }}
>
  <RadioButtonGroup
    legendText="Move/Swap"
    name="moveOrSwap"
    bind:selected
  >
    <RadioButton labelText="Move To" value="move" />
    <RadioButton labelText="Swap With" value="swap" />
  </RadioButtonGroup>
  <NumberInput label="Index" min={0} step={1} bind:value={swapIndex} />
  <Checkbox labelText="Update pixels" bind:checked={updatePixels} />
</Modal>