<script lang='ts'>
  import { Palette } from '../types/palette'
  import { PaletteRenameUndoable } from '../types/palette/undoables'
  import { TextInput } from "carbon-components-svelte"
  import Button from './common/Button.svelte'
  import { Undo, Redo, DocumentImport, DocumentExport, DocumentAdd, TrashCan, CopyFile } from "carbon-icons-svelte"
  
  import { palettesStore } from '../stores/palettes'
  import { type LoadedFile } from '../types/file'
  import { ReplacePaletteUndoable } from '../types/file/undoables'
  import { GetFilePath, GetFileSavePath, OpenFileBytes, SaveFileBytes } from '../../wailsjs/go/main/App'

  export let file: LoadedFile
  export let palette: Palette | undefined
  
  function setName(event: CustomEvent) {
    if (!palette) return
    palette.push(new PaletteRenameUndoable(event.detail))
  }
  function redo() {
    if (!palette) return
    palette.redo()
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  function undo() {
    if (!palette) return
    palette.undo()
    file.canvas.refreshImageData()
    file.canvas.refreshCanvas()
  }
  function newPalette() {
    palettesStore.addPalette(new Palette('Untitled', new Uint32Array([0x00000000, 0xFF000000, 0xFFFFFFFF])))
  }
  async function importPalette() {
    // Import expecting JASC-PAL.
    let p = await GetFilePath(["JASC-PAL"], ["*.pal"])
    let b = (await OpenFileBytes(p)) as unknown as string
    let s = atob(b)
    let name = p.split('/').pop() || 'Untitled'
    name = name.split('.').slice(0, -1).join('.')
    let pal = Palette.fromJASCPAL(name, s)
    palettesStore.addPalette(pal)
  }
  async function replacePalette() {
    // Import expecting JASC-PAL.
    let p = await GetFilePath(["JASC-PAL"], ["*.pal"])
    let b = (await OpenFileBytes(p)) as unknown as string
    let s = atob(b)
    let name = p.split('/').pop() || 'Untitled'
    name = name.split('.').slice(0, -1).join('.')
    let pal = Palette.fromJASCPAL(name, s)
    if (file) {
      // Replace file's palette.
      file.push(new ReplacePaletteUndoable(pal.swatches))
    }
  }
  async function exportPalette() {
    let swatches: Uint32Array
    if (file && !palette) {
      swatches = file.canvas.palette
    } else if (palette) {
      swatches = palette.swatches
    } else {
      return
    }
    // Export as JASC-PAL, but with 4 elements.
    let out = `JASC-PAL\n0100\n${swatches.length}\n`
    for (let swatch of swatches) {
      let a = (swatch >> 24) & 0xFF
      let b = (swatch >> 16) & 0xFF
      let g = (swatch >> 8) & 0xFF
      let r = swatch & 0xFF
      out += `${r} ${g} ${b} ${a}\n`
    }
    const p = await GetFileSavePath(['JASC-PAL'], ['*.pal'])
    await SaveFileBytes(p, window.btoa(out))
  }
</script>

<menu>
  <Button kind="ghost" size="small" icon={Undo} on:click={undo} disabled={!palette||!$palette.canUndo()}/>
  <Button kind="ghost" size="small" icon={Redo} on:click={redo} disabled={!palette||!$palette.canRedo()}/>
  <Button kind="ghost" size="small" tooltip="new palette" tooltipPosition='top' icon={DocumentAdd} on:click={newPalette}/>
  {#if !palette}
    <Button kind="ghost" size="small" tooltip="replace with PAL" tooltipPosition='top' icon={CopyFile} on:click={replacePalette}/>
  {/if}
  <Button kind="ghost" size="small" tooltip="import PAL" tooltipPosition='top' icon={DocumentImport} on:click={importPalette}/>
  <Button kind="ghost" size="small" tooltip="export PAL" tooltipPosition='top' icon={DocumentExport} on:click={exportPalette}/>
  <aside></aside>
  {#if palette}
    <Button kind="ghost" size="small" tooltip="delete palette" tooltipPosition='top' icon={TrashCan} on:click={()=>{palettesStore.removePalette(palette)}}/>
  {/if}
</menu>
<span>
  {#if palette}
    <TextInput size="sm" hideLabel value={$palette?.name} on:change={setName}/>
  {/if}
</span>

<style>
  menu {
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    grid-template-columns: auto auto auto auto auto minmax(0, 1fr) auto;
    justify-content: start;
  }
  span {
    display: flex;
    align-items: center;
  }
</style>