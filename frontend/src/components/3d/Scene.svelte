<script lang='ts'>
  import { LoadedFile, PixelPlaceUndoable } from "../../types/file"
  import { interactivity } from "@threlte/extras"
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import Voxel from './Voxel.svelte'
  import { Grid, Gizmo, OrbitControls, Align } from '@threlte/extras'
  import { Palette } from "../../types/palette"
  import type { VoxelClickEvent, VoxelEvent } from "../../types/editor3d"
  import { brushSettings } from "../../stores/brush"
  
  export let file: LoadedFile
  export let palette: Palette|undefined
  export let orthographic: boolean = false
  
  let showTarget = false
  let target: { x: number, y: number, z: number } = { x: 0, y: 0, z: 0 }
  let hover: { x: number, y: number, z: number }|null = null
  
  function onVoxelHover(e: CustomEvent & {detail: VoxelEvent}) {
    target = {
      x: e.detail.position.x + e.detail.face.x,
      y: e.detail.position.y + e.detail.face.y,
      z: e.detail.position.z + e.detail.face.z,
    }
    hover = {
      x: e.detail.position.x,
      y: e.detail.position.y,
      z: e.detail.position.z,
    }
    showTarget = true
  }
  function onVoxelMove(e: CustomEvent & {detail: VoxelEvent}) {
    target = {
      x: e.detail.position.x + e.detail.face.x,
      y: e.detail.position.y + e.detail.face.y,
      z: e.detail.position.z + e.detail.face.z,
    }
    showTarget = true
  }
  function onVoxelLeave(e: CustomEvent & {detail: VoxelEvent}) {
    hover = null
    showTarget = false
  }
  function onVoxelClick(e: CustomEvent & {detail: VoxelClickEvent}) {
    let slice = file.frame?.slices[target.y]
    if (!slice) return
    let x = slice.x + target.x
    let y = slice.y + target.z
    if (e.detail.button === 0) {
      let p = file.canvas.getPixel(x, y)
      if (p !== -1 && file.selection.isPixelMarked(x, y)) {
        file.push(new PixelPlaceUndoable(slice.x + target.x, slice.y + target.z, p, $brushSettings.primaryIndex))
      }
    }
  }
  
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
      mouseButtons={{
        LEFT: -1,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
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
      mouseButtons={{
        LEFT: -1,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
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
            position={[index%$file.frameWidth, y, Math.floor(index/$file.frameWidth)]}
            offset={[-$file.frameWidth/2, 0, -$file.frameHeight/2]}
            color={$palette?$palette.swatches[pixel]:$file.canvas.getPaletteColor(pixel)}
            on:hover={onVoxelHover}
            on:move={onVoxelMove}
            on:leave={onVoxelLeave}
            on:click={onVoxelClick}
          />
        {/if}
      {/each}
    {/each}
  </T.Group>
{/if}

<Voxel
  position={[target.x, target.y, target.z]}
  offset={[-$file.frameWidth/2, 0, -$file.frameHeight/2]}
  color={0x880000ff}
  ignoreEvents
  visible={showTarget}
/>

<Grid
  position={[0, -0.01, 0]}
  cellColor={0xff00ff}
  sectionColor={0x00ff00}
  gridSize={[$file.frameWidth, $file.frameHeight]}
/>
