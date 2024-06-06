<script lang='ts'>
  import { Palette, PaletteRenameUndoable } from '../types/palette'
  import { Button, TextInput } from "carbon-components-svelte"
  import { Undo, Redo, Close, DocumentImport, DocumentExport, DocumentAdd } from "carbon-icons-svelte"
  
  import { palettesStore } from '../stores/palettes'
  import { ReplacePaletteUndoable, type LoadedFile } from '../types/file'
  import { GetFilePath, OpenFileBytes } from '../../wailsjs/go/main/App'

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
  function newPalette() {
    palettesStore.addPalette(new Palette('Untitled', new Uint32Array([0x00000000, 0xFF000000, 0xFFFFFFFF])))
  }
  async function importPalette() {
    // Import expecting JASC-PAL.
    let p = await GetFilePath(["JASC-PAL"], ["*.pal"])
    let b = (await OpenFileBytes(p)) as unknown as string
    let s = atob(b)
    let lines = s.split('\n')
    if (lines.length < 4 || lines[0] !== 'JASC-PAL' || lines[1] !== '0100') {
      alert('Invalid JASC-PAL file')
      return
    }
    let swatches = new Uint32Array(parseInt(lines[2]))
    for (let i = 3; i < lines.length; i++) {
      let [r, g, b, a] = lines[i].split(' ').map(x => parseInt(x))
      if (a === undefined) a = 255
      swatches[i - 3] = (a << 24) | (b << 16) | (g << 8) | r
    }
    let name = p.split('/').pop() || 'Untitled'
    name = name.split('.').slice(0, -1).join('.')
    if (file && !palette) {
      // Replace file's palette.
      file.push(new ReplacePaletteUndoable(swatches))
    } else {
      palettesStore.addPalette(new Palette(name, swatches))
    }
  }
  function exportPalette() {
    let swatches: Uint32Array
    if (file && !palette) {
      swatches = file.canvas.palette
    } else {
      swatches = palette.swatches
    }
    // Export as JASC-PAL, but with 4 elements.
    let out = `JASC-PAL\n0100\n${swatches.length}\n`
    for (let swatch of swatches) {
      let r = (swatch >> 24) & 0xFF
      let g = (swatch >> 16) & 0xFF
      let b = (swatch >> 8) & 0xFF
      let a = swatch & 0xFF
      out += `${r} ${g} ${b} ${a}\n`
    }
    alert('exportPalette not yet implemented')
    console.log('write', out)
  }
</script>

<menu>
  <Button kind="ghost" size="small" icon={Undo} on:click={undo} disabled={!palette||!$palette.canUndo()}/>
  <Button kind="ghost" size="small" icon={Redo} on:click={redo} disabled={!palette||!$palette.canRedo()}/>
  <Button kind="ghost" size="small" iconDescription="new palette" icon={DocumentAdd} on:click={newPalette}/>
  <Button kind="ghost" size="small" iconDescription="import PAL" icon={DocumentImport} on:click={importPalette}/>
  <Button kind="ghost" size="small" iconDescription="export PAL" icon={DocumentExport} on:click={exportPalette}/>
  {#if palette}
    <Button kind="ghost" size="small" iconDescription="delete palette" icon={Close} on:click={()=>{palettesStore.removePalette(palette)}}/>
  {/if}
</menu>
<span>
  {#if palette}
    <TextInput size="sm" hideLabel value={$palette.name} on:change={setName}/>
  {/if}
</span>

<style>
  menu {
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    grid-template-columns: auto auto auto auto auto;
    justify-content: start;
  }
  span {
    display: flex;
    align-items: center;
  }
</style>