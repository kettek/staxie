<script lang='ts'>
  import { LoadedFile } from "../../types/file"
  import { interactivity } from "@threlte/extras"
  import { T } from '@threlte/core'
  import Voxel from './Voxel.svelte'
  import { Grid, Gizmo, OrbitControls, Align } from '@threlte/extras'
  import { Palette } from "../../types/palette"
  
  export let file: LoadedFile
  export let palette: Palette|undefined
  
  interactivity()
</script>

<T.PerspectiveCamera
  makeDefault
  position={[40, 10, 10]}
  on:create={({ ref }) => {
    ref.lookAt(0, 0, 0)
  }}
>
  <OrbitControls
  />
</T.PerspectiveCamera>

<T.DirectionalLight position={[0, 10, 10]} />
<T.AmbientLight color={0xffffff} intensity={0.9} />

{#if $file.frame}
  <T.Group>
    {#each $file.frame.slices as slice, y}
      {#each $file.canvas.getPixels(slice.x, slice.y, $file.frameWidth, $file.frameHeight) as pixel, index}
        {#if pixel !== 0}
          <Voxel
            position={[Math.floor(index/$file.frameWidth), y, index%$file.frameWidth]}
            color={$palette?$palette.swatches[pixel]:$file.canvas.getPaletteColor(pixel)}
          />
        {/if}
      {/each}
    {/each}
  </T.Group>
{/if}

<Grid
  cellColor={0xff00ff}
  sectionColor={0x00ff00}
  gridSize={[$file.frameWidth, $file.frameHeight]}
/>
<Grid
  plane="zy"
  cellColor={0xff00ff}
  sectionColor={0x00ff00}
  gridSize={[$file.frameWidth, $file.frameHeight]}
/>
