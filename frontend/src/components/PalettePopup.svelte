<script lang="ts">
  import ColorIndex from './ColorIndex.svelte'
  import ColorSelector from './ColorSelector.svelte'
  import PaletteOptionsToolbar from './PaletteOptionsToolbar.svelte'
  import PaletteSection from '../sections/Palette.svelte'
  import type { Palette } from '../types/palette'
  import type { LoadedFile } from '../types/file'

  export let file: LoadedFile
  export let fakePalette: Palette | undefined = undefined

  let refreshPalette = {}

  let red: number = 0
  let green: number = 0
  let blue: number = 0
  let alpha: number = 255

  function handlePaletteSelect(event) {
    console.log(event.detail)
  }
</script>

<section class="palette">
  <PaletteOptionsToolbar palette={fakePalette} {file} />
  <PaletteSection refresh={refreshPalette} {file} {fakePalette} on:select={handlePaletteSelect} />
  <article>
    <ColorSelector bind:red bind:green bind:blue bind:alpha />
    <ColorIndex bind:red bind:green bind:blue bind:alpha {file} palette={fakePalette} on:refresh={() => (refreshPalette = {})} />
  </article>
</section>

<style>
  .palette {
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    grid-template-columns: minmax(0, 1fr);
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
</style>
