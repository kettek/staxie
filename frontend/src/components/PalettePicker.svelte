<script lang="ts">
  import type { Palette } from '../types/palette'
  import { brushSettings } from '../stores/brush'
  import type { LoadedFile } from '../types/file'
  import { createEventDispatcher } from 'svelte'

  export let file: LoadedFile | undefined

  export let fakePalette: Palette | undefined
  let palette: Uint32Array | undefined = undefined
  $: {
    if ($fakePalette) {
      palette = $fakePalette.swatches
    } else {
      palette = $file ? $file.canvas.palette : undefined
    }
  }

  let primarySwatch: string = ''
  let secondarySwatch: string = ''

  const dispatch = createEventDispatcher()

  $: {
    if (palette) {
      let primaryIndex = $brushSettings.primaryIndex
      if (primaryIndex >= 0 && primaryIndex < palette.length) {
        primarySwatch = `rgba(${palette[primaryIndex] & 0xff},${(palette[primaryIndex] >> 8) & 0xff},${(palette[primaryIndex] >> 16) & 0xff},${((palette[primaryIndex] >> 24) & 0xff) / 255})`
      }
      let secondaryIndex = $brushSettings.secondaryIndex
      if (secondaryIndex >= 0 && secondaryIndex < palette.length) {
        secondarySwatch = `rgba(${palette[secondaryIndex] & 0xff},${(palette[secondaryIndex] >> 8) & 0xff},${(palette[secondaryIndex] >> 16) & 0xff},${((palette[secondaryIndex] >> 24) & 0xff) / 255})`
      }
    }
  }

  function swapEm() {
    let temp = $brushSettings.primaryIndex
    $brushSettings.primaryIndex = $brushSettings.secondaryIndex
    $brushSettings.secondaryIndex = temp
  }
  function selectPrimary() {
    dispatch('selectPrimarySwatch', { index: $brushSettings.primaryIndex })
  }
  function selectSecondary() {
    dispatch('selectSecondarySwatch', { index: $brushSettings.secondaryIndex })
  }
</script>

<main>
  <section>
    <div class="secondary" style="background: {secondarySwatch}" on:click={selectSecondary}></div>
    <div class="primary" style="background: {primarySwatch}" on:click={selectPrimary}></div>
    <div class="swapper" on:click={swapEm}></div>
  </section>
</main>

<style>
  main {
    display: flex;
    align-items: flex-end;
    height: 100%;
    padding: 0.25rem;
  }
  section {
    position: relative;
    width: 1.5rem;
    height: 1.5rem;
  }
  .primary {
    position: absolute;
    top: 0;
    left: 0;
    width: 1rem;
    height: 1rem;
    border: 1px solid black;
  }
  .secondary {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 1rem;
    height: 1rem;
    border: 1px solid black;
  }
  .swapper {
    position: absolute;
    top: 0;
    right: 0;
    width: 0.5rem;
    height: 0.5rem;
  }
  .swapper::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    border: 1px solid white;
    border-radius: 50%;
    pointer-events: none;
    width: 0.25rem;
    height: 0.25rem;
    pointer-events: none;
  }
</style>
