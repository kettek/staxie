<script lang='ts'>
  import { Button } from "carbon-components-svelte";
  import { AddLarge, ColorSwitch } from "carbon-icons-svelte";
  import { ReplaceSwatchUndoable, type LoadedFile, AddSwatchUndoable } from "../types/file";
  import { createEventDispatcher } from "svelte";

  export let file: LoadedFile

  export let index: number = 0
  export let red: number = 255
  export let green: number = 0
  export let blue: number = 255
  export let alpha: number = 255

  let swatchExists: boolean = false
  $: {
    swatchExists = file?.canvas.hasPaletteColor(red, green, blue, alpha)
  }

  const dispatch = createEventDispatcher()

  function addSwatch() {
    file.push(new AddSwatchUndoable(red, green, blue, alpha))
    dispatch('refresh', {})
    ;(document.activeElement as HTMLElement).blur()
  }

  function replaceSwatch() {
    file.push(new ReplaceSwatchUndoable(index, red, green, blue, alpha))
    dispatch('refresh', {})
    ;(document.activeElement as HTMLElement).blur()
  }
</script>

<main>
  <div class="color" style="background-color: rgba({red},{green},{blue},{alpha})">
    <div class="label" style="color: rgb({255-red}, {255-green}, {255-blue})">
      {#if swatchExists}
        {index}
      {/if}
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
    justify-content: center;
    align-items: center;
  }
</style>