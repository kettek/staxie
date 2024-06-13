<script lang='ts'>
  import { LoadedFile } from "../../types/file"
  import { PixelPlaceUndoable } from "../../types/file/undoables"
  import { interactivity } from "@threlte/extras"
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import Voxel from './Voxel.svelte'
  import { Grid, Gizmo, OrbitControls, Align } from '@threlte/extras'
  import { Palette } from "../../types/palette"
  import type { VoxelClickEvent, VoxelEvent } from "../../types/editor3d"
  import { brushSettings } from "../../stores/brush"
  import { editor3DSettings } from "../../stores/editor3d"
  
  import { toolSettings, toolVoxelPlace, toolVoxelReplace, toolErase, toolPicker } from "../../stores/tool"
  
  export let file: LoadedFile
  export let palette: Palette|undefined
  export let orthographic: boolean = false
  
  let showTarget = false
  export let target: { x: number, y: number, z: number } = { x: 0, y: 0, z: 0 }
  export let hover: { x: number, y: number, z: number }|null = null
  
  function placePixelAt({ x, y, z }: { x: number, y: number, z: number }, color: number) {
    // TODO: whinge about being OOB in a lil footer err/warn thing.
    if (x === -1 || x === file.frameWidth) return
    if (z === -1 || z === file.frameHeight) return
    if (y === -1 || y === file.frame?.slices.length) return
    
    let slice = file.frame?.slices[y]
    if (!slice) return
    let p = file.canvas.getPixel(slice.x + x, slice.y + z)
    if (p !== -1 && file.selection.isPixelMarked(slice.x + x, slice.y + z)) {
      file.push(new PixelPlaceUndoable(slice.x + x, slice.y + z, p, color))
    }
  }
  
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
    
    if ($toolSettings.current === toolVoxelPlace) {
      placePixelAt(target, $brushSettings.primaryIndex)
    } else if ($toolSettings.current === toolErase) {
      if (!hover) return
      placePixelAt(hover, 0)
    } else if ($toolSettings.current === toolVoxelReplace) {
      if (!hover) return
      placePixelAt(hover, $brushSettings.primaryIndex)
    } else if ($toolSettings.current === toolPicker) {
      if (!hover) return
      let slice = file.frame?.slices[hover.y]
      if (!slice) return
      let p = file.canvas.getPixel(slice.x + hover.x, slice.y + hover.z)
      if (p !== -1) $brushSettings.primaryIndex = p
    }
  }
  
  function getGridXY(e: any): [number, number] {
    let x = Math.floor(e.point.x + file.frameWidth/2)
    let y = Math.floor(e.point.z + file.frameHeight/2)
    return [x, y]
  }
  function onGridHover(e: any) {
    let [x, z] = getGridXY(e)
    target = { x, y: 0, z}
    showTarget = true
  }
  function onGridMove(e: any) {
    let [x, z] = getGridXY(e)
    target = { x, y: 0, z}
    showTarget = true
  }
  function onGridLeave(e: any) {
    showTarget = false
  }
  function onGridClick(e: any) {
    let [x, z] = getGridXY(e)
    placePixelAt({ x, y: 0, z }, $brushSettings.primaryIndex)
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
            hideTransparent={$editor3DSettings.hideTransparent}
            ignoreAlpha={$editor3DSettings.ignoreAlpha}
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
  visible={showTarget&&$toolSettings.current===toolVoxelPlace}
/>

<Grid
  position={[0, -0.01, 0]}
  cellColor={0xff00ff}
  sectionColor={0x00ff00}
  gridSize={[$file.frameWidth, $file.frameHeight]}
/>

<T.Mesh
  position={[0, 0, 0]}
  rotation={[-Math.PI/2, 0, 0]}
  on:pointerenter={onGridHover}
  on:pointermove={onGridMove}
  on:pointerleave={onGridLeave}
  on:click={onGridClick}
>
  <T.PlaneGeometry args={[$file.frameWidth, $file.frameHeight]} />
  <T.MeshBasicMaterial
    transparent={true}
    opacity={0}
    color={0x0000ff}
  />
</T.Mesh>

<T.Mesh
  visible={target.y === $file?.frame?.slices.length}
  position={[0, ($file?.frame?.slices.length??0)+0.01, 0]}
  rotation={[-Math.PI/2, 0, 0]}
>
  <T.PlaneGeometry args={[$file.frameWidth, $file.frameHeight]} />
  <T.MeshBasicMaterial
    transparent={true}
    opacity={0.2}
    color={0xff0000}
  />
</T.Mesh>

<T.Mesh
  visible={target.x === -1 || target.x === $file.frameWidth}
  position={[target.x-$file.frameWidth/2+(target.x===$file.frameWidth?0:1), ($file.frame?.slices.length??0)/2, 0]}
  rotation={[0, Math.PI/2, 0]}
>
  <T.PlaneGeometry args={[$file.frameHeight, $file.frame?.slices.length]} />
  <T.MeshBasicMaterial
    transparent={true}
    opacity={0.2}
    color={0xff0000}
    side={THREE.DoubleSide}
  />
</T.Mesh>

<T.Mesh
  visible={target.z === -1 || target.z === $file.frameHeight}
  position={[0, ($file.frame?.slices.length??0)/2, target.z-$file.frameHeight/2+(target.z===$file.frameHeight?0:1)]}
>
  <T.PlaneGeometry args={[$file.frameWidth, $file.frame?.slices.length]} />
  <T.MeshBasicMaterial
    transparent={true}
    opacity={0.2}
    color={0xff0000}
    side={THREE.DoubleSide}
  />
</T.Mesh>