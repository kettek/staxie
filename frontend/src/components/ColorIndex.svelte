<!--
  @component
  
  This component shows a given color swatch/index and provides controls for adding and replacing swatches within the palette.
-->
<script lang='ts'>
  import { Button, NumberInput, TextInput } from "carbon-components-svelte";
  import { AddLarge, ColorSwitch } from "carbon-icons-svelte";
  import { ReplaceSwatchUndoable, type LoadedFile, AddSwatchUndoable } from "../types/file";
  import { createEventDispatcher } from "svelte";

  import { brushSettings } from '../stores/brush'
  import { PaletteAddSwatchUndoable, PaletteReplaceSwatchUndoable, type Palette } from '../types/palette'

  export let file: LoadedFile
  export let palette: Palette | undefined

  export let red: number = 255
  export let green: number = 0
  export let blue: number = 255
  export let alpha: number = 255
  
  let hexCode: string = ''
  $: hexCode = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}${alpha.toString(16).padStart(2, '0')}`

  let hexGood: boolean = false
  $: {
    hexGood = /^#[0-9A-Fa-f]{8}$/.test(hexCode)
  }
  
  function adjustHex(e: Event) {
    const target = e.currentTarget as HTMLInputElement
    const value = target.value
    if (!value.startsWith('#')) alert('bad hex code')
    if (/^#[0-9A-Fa-f]{8}$/.test(value)) {
      const [r, g, b, a] = value.slice(1).match(/.{2}/g)!.map(x => parseInt(x, 16))
      red = r
      green = g
      blue = b
      alpha = a
    } else if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      const [r, g, b] = value.slice(1).match(/.{2}/g)!.map(x => parseInt(x, 16))
      red = r
      green = g
      blue = b
    }
  }

  let swatchExists: boolean = false
  $: {
    if (palette) {
      swatchExists = palette.hasPaletteColor(red, green, blue, alpha)
    } else {
      swatchExists = file?.canvas.hasPaletteColor(red, green, blue, alpha)
    }
  }

  const dispatch = createEventDispatcher()

  function addSwatch() {
    if (palette) {
      palette.push(new PaletteAddSwatchUndoable(red, green, blue, alpha))
      // Refresh file so as to update any live previews.
      if (file?.canvas) {
        file.canvas.refreshImageData()
        file.canvas.refreshCanvas()
      }
    } else {
      file.push(new AddSwatchUndoable(red, green, blue, alpha))
    }
    dispatch('refresh', {})
    ;(document.activeElement as HTMLElement).blur()
  }

  function replaceSwatch() {
    if (palette) {
      palette.push(new PaletteReplaceSwatchUndoable($brushSettings.primaryIndex, red, green, blue, alpha))
      // Refresh file so as to update any live previews.
      if (file?.canvas) {
        file.canvas.refreshImageData()
        file.canvas.refreshCanvas()
      }
    } else {
      file.push(new ReplaceSwatchUndoable($brushSettings.primaryIndex, red, green, blue, alpha))
    }
    dispatch('refresh', {})
    ;(document.activeElement as HTMLElement).blur()
  }
</script>

<main>
  <div class="color" style="background-color: rgba({red},{green},{blue},{alpha})">
    <div class="label" style="color: rgb({255-red}, {255-green}, {255-blue})">
      <span class="index">
        {#if swatchExists}
          {$brushSettings.primaryIndex}:
        {:else}
          -:
        {/if}
      </span>
      <input type="text" style="color: rgb({255-red}, {255-green}, {255-blue})" value={hexCode} on:input={adjustHex}/>
    </div>
  </div>
  <Button kind="ghost" size="small" disabled={swatchExists} iconDescription="replace swatch" tooltipPosition="top" icon={ColorSwitch} on:click={replaceSwatch}></Button>
  <Button kind="ghost" size="small" disabled={swatchExists} iconDescription="add swatch" tooltipPosition="top" icon={AddLarge} on:click={addSwatch}></Button>
</main>

<style>
  main {
    display: grid;
    grid-template-columns: 1fr auto auto;
  }
  .color {
    display: flex;
    justify-content: stretch;
    align-items: stretch;
  }
  .color .label {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr;
  }
  .label .index {
    padding-right: 0.5em;
    padding-left: 0.5em;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2.5em;
  }
  input {
    background: transparent;
    display: block;
    border: 0;
    font-family: 'Courier New', Courier, monospace;
  }
</style>