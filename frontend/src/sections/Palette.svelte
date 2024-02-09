<script lang='ts'>
  import { Palette, defaultPalette } from '../types/palette'
  
  export let palette: Palette = defaultPalette()
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
  {#each palette.entries as color, index}
    <span on:click={paletteClick} style="background-color: {color.color}" x-index={index} class="color {index===primaryColorIndex?'primary':''} {index===secondaryColorIndex?'secondary':''}"></span>
  {/each}
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