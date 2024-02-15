<script lang='ts'>
  import type { LoadedFile } from '../types/file'

  export let file: LoadedFile
  
  export let primaryColorIndex: number = 1
  export let secondaryColorIndex: number = 0
  
  function paletteClick(event: MouseEvent) {
    const target = event.target as HTMLSpanElement
    const index = parseInt(target.getAttribute('x-index') || '0')
    if (event.shiftKey) {
      secondaryColorIndex = index
    } else {
      primaryColorIndex = index
    }
  }
</script>

<main>
  {#if file}
    {#each file.canvas.palette as palette, paletteIndex}
      <span on:click={paletteClick} x-index={paletteIndex} class='entry{paletteIndex===primaryColorIndex?' primary':''}{paletteIndex===secondaryColorIndex?' secondary':''}'>
        <span class="checkerboard"></span>
        <span style="background-color: rgba({palette&0xFF},{(palette>>8)&0xFF},{(palette>>16)&0xFF},{((palette>>24)&0xFF)/255})" class="color"></span>
      </span>
    {/each}
  {/if}
</main>

<style>
  main {
    background-color: var(--cds-background-selected);
    text-align: left;
  }
  .entry {
    position: relative;
    display: inline-block;
    width: 2em;
    height: 2em;
    margin: 2px;
    padding: 2px;
    border: 2px solid transparent;
  }
  .entry.primary {
    border: 2px dashed white;
  }
  .entry.secondary {
    border: 2px dashed black;
  }
  .color {
    pointer-events: none;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  .checkerboard {
    pointer-events: none;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%);
    background-size: 10px 10px;
    background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
  }
</style>