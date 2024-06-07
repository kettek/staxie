<script lang='ts'>
  import { LoadedFile } from "../../types/file"
  import { interactivity } from "@threlte/extras"
  import { T } from '@threlte/core'
  import Voxel from './Voxel.svelte'
  import { Grid, Gizmo, OrbitControls, Align } from '@threlte/extras'
  import { Palette } from "../../types/palette"
  
  export let file: LoadedFile
  export let palette: Palette|undefined
  export let orthographic: boolean = false
  
  interactivity()
</script>

{#if orthographic}
  <T.OrthographicCamera
    makeDefault
    position={[40, 10, 10]}
    zoom={15}
    on:create={({ ref }) => {
      ref.lookAt(0, 0, 0)
    }}
  >
    <OrbitControls
    />
  </T.OrthographicCamera>
{:else}
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
{/if}

<T.DirectionalLight position={[0, 10, 10]} />
<T.AmbientLight color={0xffffff} intensity={0.9} />

{#if $file.frame}
  <T.Group>
    {#each $file.frame.slices as slice, y}
      {#each $file.canvas.getPixels(slice.x, slice.y, $file.frameWidth, $file.frameHeight) as pixel, index}
        {#if pixel !== 0}
          <Voxel
            position={[index%$file.frameWidth-$file.frameWidth/2, y, Math.floor(index/$file.frameWidth)-$file.frameHeight/2]}
            color={$palette?$palette.swatches[pixel]:$file.canvas.getPaletteColor(pixel)}
          />
        {/if}
      {/each}
    {/each}
  </T.Group>
{/if}

<Grid
  position={[0, -0.01, 0]}
  cellColor={0xff00ff}
  sectionColor={0x00ff00}
  gridSize={[$file.frameWidth, $file.frameHeight]}
/>
