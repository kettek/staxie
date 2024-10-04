<!--
  @component

  This component shows a minified list of swatches for selecting a swap.
-->
<script lang="ts">
  import { type LoadedFile } from '../types/file'
  import type { Palette } from '../types/palette'

  export let file: LoadedFile

  //export let fakePalette: Palette | undefined
  let palette: Uint32Array
  palette = $file ? $file.canvas.palette : []
  /*$: {
    if ($fakePalette) {
      palette = $fakePalette.swatches
    } else {
      palette = $file ? $file.canvas.palette : []
    }
  }*/

  export let selected: number = 0

  function swatchClick(event: MouseEvent) {
    const target = event.target as HTMLSpanElement
    selected = parseInt(target.getAttribute('data-index') || '0')
  }
</script>

<main>
  {#each palette as swatch, i}
    <button class="swatch{selected === i ? ' --selected' : ''}" data-index={i} on:click={swatchClick}>
      <span class="checkerboard"></span>
      <span style="background-color: rgba({swatch & 0xff},{(swatch >> 8) & 0xff},{(swatch >> 16) & 0xff},{((swatch >> 24) & 0xff) / 255})" class="color"></span>
      <span class="label">{i}</span>
    </button>
  {/each}
</main>

<style>
  main {
    display: flex;
    flex-wrap: wrap;
  }
  button {
    position: relative;
    display: inline-block;
    width: 1em;
    height: 1em;
    border: none;
    cursor: pointer;
    outline: 1px solid transparent;
  }
  button.--selected {
    outline: 1px solid white;
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
    background-position:
      0 0,
      0 5px,
      5px -5px,
      -5px 0px;
  }
  .label {
    position: absolute;
    pointer-events: none;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 0.4rem;
    mix-blend-mode: difference;
  }
</style>
