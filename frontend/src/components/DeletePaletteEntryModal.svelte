<!--
  @component
  
  This component provides a modal for deleting a swatch from the palette.
-->
<script lang='ts'>
  import { Checkbox, Column, Dropdown, Grid, Modal, NumberInput, Row, TextInput } from "carbon-components-svelte";
  import type { LoadedFile } from "../types/file"
  
  export let file: LoadedFile

  export let open: boolean = false
  export let paletteIndex: number = 0
  
  let replaceWithSwatch: boolean = false
  let replaceIndex: number = 0
</script>

<Modal
  hasScrollingContent
  bind:open
  modalHeading="Delete Palette Entry"
  primaryButtonText="Apply"
  secondaryButtonText="Cancel"
  on:close={() => open = false}
  on:click:button--secondary={() => open = false}
  on:submit={() => {
    open = false
    // TODO
    //file.push(new RemoveSwatchUndoable(paletteIndex, replaceWithSwatch ? replaceIndex : -1))
  }}
>
  <Checkbox labelText="Replace occurrences other swatch" bind:checked={replaceWithSwatch} />
  {#if replaceWithSwatch}
    <NumberInput id="replaceWith" label="Replace with" min={0} step={1} bind:value={replaceIndex} />
    <!-- TODO: Replace with a colorered drop -->
  {/if}
</Modal>