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
      <span on:click={paletteClick} style="background-color: rgba({palette&0xFF},{(palette>>8)&0xFF},{(palette>>16)&0xFF},{(palette>>24)&0xFF})" x-index={paletteIndex} class="color {paletteIndex===primaryColorIndex?'primary':''} {paletteIndex===secondaryColorIndex?'secondary':''}"></span>
    {/each}
  {/if}
</main>

<style>
  .color {
    display: inline-block;
    width: 2em;
    height: 2em;
    margin: 2px;
    padding: 2px;
    border: 2px solid transparent;
  }
  .color.primary {
    border: 2px dashed black;
  }
  .color.secondary {
    border: 2px dashed white;
  }
</style>