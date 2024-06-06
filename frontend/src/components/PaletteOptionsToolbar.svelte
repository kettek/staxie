<script lang='ts'>
  import { PaletteRenameUndoable, type Palette } from '../types/palette'
  import { Button, TextInput } from "carbon-components-svelte"
  import { Undo, Redo, Close } from "carbon-icons-svelte"
  
  import { palettesStore } from '../stores/palettes'
  import type { LoadedFile } from '../types/file'

  export let file: LoadedFile
  export let palette: Palette | undefined
  
  function setName(event: CustomEvent) {
    palette.push(new PaletteRenameUndoable(event.detail))
  }
  function redo() {
    palette.redo()
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  function undo() {
    palette.undo()
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
</script>

{#if palette}
  <menu>
    <Button kind="ghost" size="small" icon={Undo} on:click={undo} disabled={!$palette.canUndo()}/>
    <Button kind="ghost" size="small" icon={Redo} on:click={redo} disabled={!$palette.canRedo()}/>
    <Button kind="ghost" size="small" iconDescription="delete palette" icon={Close} on:click={()=>{palettesStore.removePalette(palette)}}/>
  </menu>
  <span>
    <TextInput size="sm" hideLabel value={$palette.name} on:change={setName}/>
  </span>
{/if}

<style>
  menu {
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    grid-template-columns: auto auto auto;
    justify-content: start;
  }
  span {
    display: flex;
    align-items: center;
  }
</style>