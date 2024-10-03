<script lang="ts">
  import { LoadedFile } from '../../types/file'
  import { PixelPlaceUndoable, PixelsPlaceUndoable, ThreeDSelectionBoxSetUndoable } from '../../types/file/undoables'
  import { interactivity } from '@threlte/extras'
  import { T, type CurrentWritable, currentWritable } from '@threlte/core'
  import * as THREE from 'three'
  import Voxel from './Voxel.svelte'
  import { Grid, Gizmo, OrbitControls, Align } from '@threlte/extras'
  import { Palette } from '../../types/palette'
  import type { VoxelClickEvent, VoxelEvent } from '../../types/editor3d'
  import { brushSettings } from '../../stores/brush'
  import { editor3DSettings } from '../../stores/editor3d'
  import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
  import { editor2DSettings } from '../../stores/editor2d'

  import { toolSettings, toolVoxelPlace, toolVoxelReplace, toolErase, toolPicker, toolFill, toolVoxelCursor, toolVoxelBoxSelection } from '../../stores/tool'
  import Cursor from './Cursor.svelte'
  import Selection from './Selection.svelte'
  import ShortcutHandlers from '../ShortcutHandlers.svelte'
  import ShortcutHandler from '../ShortcutHandler.svelte'
  import { ThreeDCopyPaste } from '../../types/copypaste'
  import { isKeyActive } from '../Shortcuts.svelte'
  import OptimizedRender from './OptimizedRender.svelte'

  export let file: LoadedFile
  export let palette: Palette | undefined
  export let orthographic: boolean = false
  let xOffset: number = 0
  let yOffset: number = 0
  let widthOdd: boolean = false
  let heightOdd: boolean = false
  $: widthOdd = $file.frameWidth % 2 === 1
  $: heightOdd = $file.frameHeight % 2 === 1
  $: xOffset = widthOdd ? 0.5 : 0
  $: yOffset = heightOdd ? 0.5 : 0

  let pasting: { x: number; y: number; z: number; index: number }[] = []

  let showTarget = false
  export let target: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }
  export let hover: { x: number; y: number; z: number } | null = null
  let draggingVoxel: { x: number; y: number; z: number } | null = null
  let cursorGrabbed: boolean = false
  let grabbed: [number, number, number] = [0, 0, 0]
  function constrainCursor(c: [number, number, number]): [number, number, number] {
    return [Math.min(Math.max(c[0], 0), file.frameWidth - 1), Math.min(Math.max(c[1], 0), file.frame?.slices.length - 1), Math.min(Math.max(c[2], 0), file.frameHeight - 1)]
  }
  function isSelectionSame(a: [number, number, number], b: [number, number, number]): boolean {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
  }
  let showSelection: boolean = false
  $: showSelection = !isSelectionSame($file.threeDCursor1, $file.threeDCursor2)
  let cursorFirstMove = true

  let orbitControls: ThreeOrbitControls
  let center: CurrentWritable<[number, number, number]> = currentWritable([0, 0, 0])

  function placePixelAt({ x, y, z }: { x: number; y: number; z: number }, color: number) {
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

  function fillPixelAt({ x, y, z }: { x: number; y: number; z: number }, color: number) {
    if (x === -1 || x === file.frameWidth) return
    if (z === -1 || z === file.frameHeight) return
    if (y === -1 || y === file.frame?.slices.length) return

    let traversed = new Set<number>()

    let pixels: { x: number; y: number; index: number }[] = []

    if (!file.frame) return

    let slice = file.frame?.slices[y]
    if (!slice) return
    let p = file.canvas.getPixel(slice.x + x, slice.y + z)
    if (p !== -1) {
      let queue: [{ x: number; y: number; z: number }] = [{ x, y, z }]
      while (queue.length > 0) {
        let { x, y, z } = queue.shift()
        if (x === -1 || x === file.frameWidth) continue
        if (z === -1 || z === file.frameHeight) continue
        if (y === -1 || y === file.frame?.slices.length) continue
        let index = y * file.frameWidth * file.frameHeight + z * file.frameWidth + x
        if (traversed.has(index)) continue
        traversed.add(index)
        let slice = file.frame?.slices[y]
        if (!slice) continue
        let p2 = file.canvas.getPixel(slice.x + x, slice.y + z)
        if (p2 === p) {
          pixels.push({ x: slice.x + x, y: slice.y + z, index: color })
          if ($editor3DSettings.floodFillX) {
            if (slice.x + x > 0) queue.push({ x: x + 1, y, z })
            if (slice.x + x < file.canvas.width - 1) queue.push({ x: x - 1, y, z })
          }
          if ($editor3DSettings.floodFillZ) {
            if (slice.y + z > 0) queue.push({ x, y, z: z + 1 })
            if (slice.y + z < file.canvas.height - 1) queue.push({ x, y, z: z - 1 })
          }
          if ($editor3DSettings.floodFillY) {
            if (y > 0) queue.push({ x, y: y - 1, z })
            if (y < file.frame.slices.length - 1) queue.push({ x, y: y + 1, z })
          }
        }
      }
    }
    file.push(new PixelsPlaceUndoable(pixels))
  }

  function onVoxelHover(e: CustomEvent & { detail: VoxelEvent }) {
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
  function onVoxelMove(e: CustomEvent & { detail: VoxelEvent }) {
    target = {
      x: e.detail.position.x + e.detail.face.x,
      y: e.detail.position.y + e.detail.face.y,
      z: e.detail.position.z + e.detail.face.z,
    }
    showTarget = true
  }
  function onVoxelLeave(e: CustomEvent & { detail: VoxelEvent }) {
    hover = null
    showTarget = false
  }
  function onVoxelClick(e: CustomEvent & { detail: VoxelClickEvent }) {
    console.log('voxel Click')
    if ($toolSettings.current === toolVoxelPlace) {
      placePixelAt(target, $brushSettings.primaryIndex)
    } else if ($toolSettings.current === toolFill) {
      if (!hover) return
      fillPixelAt(hover, $brushSettings.primaryIndex)
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
    } else if ($toolSettings.current === toolVoxelCursor) {
      console.log('click', hover)
      if (!hover) return
      $file.threeDCursor1 = [hover.x, hover.y, hover.z]
      $file.threeDCursor2 = [hover.x, hover.y, hover.z]
    }
  }

  function onCursorHover(e: CustomEvent & { detail: VoxelEvent }) {
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
  function onCursorMove(e: CustomEvent & { detail: VoxelEvent }) {
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
  function onCursorLeave(e: CustomEvent & { detail: VoxelEvent }) {
    hover = null
    showTarget = false
  }
  function onCursorClick(e: CustomEvent & { detail: VoxelClickEvent }) {
    if ($toolSettings.current === toolVoxelPlace) {
      placePixelAt(target, $brushSettings.primaryIndex)
    } else if ($toolSettings.current === toolVoxelReplace) {
      if (!hover) return
      placePixelAt(hover, $brushSettings.primaryIndex)
    }
  }

  function onCursorChange(e: CustomEvent & { detail: [number, number, number] }) {
    const detail: [number, number, number] = e.detail
    if ($toolSettings.current === toolVoxelCursor) {
      $file.threeDCursor1 = [...detail]
      $file.threeDCursor2 = [...detail]
    } else if ($toolSettings.current === toolVoxelBoxSelection) {
      if (isSelectionSame($file.threeDCursor1, $file.threeDCursor2)) {
        cursorFirstMove = true
      }
      if (cursorFirstMove) {
        $file.threeDCursor2 = [...detail]
      } else {
        $file.threeDCursor1 = [...detail]
      }
    }
  }
  function onCursorGrab(e: CustomEvent) {
    cursorGrabbed = true
    grabbed = [...$file.threeDCursor1]
  }
  function onCursorRelease(e: CustomEvent) {
    if (cursorGrabbed) {
      if (isKeyActive('shift')) {
        if ($toolSettings.current === toolVoxelBoxSelection) {
          const x1 = Math.min($file.threeDCursor1[0], $file.threeDCursor2[0])
          const y1 = Math.min($file.threeDCursor1[1], $file.threeDCursor2[1])
          const z1 = Math.min($file.threeDCursor1[2], $file.threeDCursor2[2])
          const x2 = Math.max($file.threeDCursor1[0], $file.threeDCursor2[0])
          const y2 = Math.max($file.threeDCursor1[1], $file.threeDCursor2[1])
          const z2 = Math.max($file.threeDCursor1[2], $file.threeDCursor2[2])
          for (let x = x1; x <= x2; x++) {
            for (let y = y1; y <= y2; y++) {
              for (let z = z1; z <= z2; z++) {
                const slice = file.frame?.slices[y]
                if (slice) {
                  const p = file.canvas.getPixel(slice.x + x, slice.y + z)
                  if (p !== -1 && file.selection.isPixelMarked(slice.x + x, slice.y + z)) {
                    file.push(
                      new PixelsPlaceUndoable([
                        { x: slice.x + x, y: slice.y + z, index: 0 },
                        { x: slice.x + x, y: slice.y + z, index: p },
                      ]),
                    )
                  }
                }
              }
            }
          }
        } else {
          const x = grabbed[0]
          const y = grabbed[1]
          const z = grabbed[2]
          const nx = $file.threeDCursor1[0]
          const ny = $file.threeDCursor1[1]
          const nz = $file.threeDCursor1[2]
          const slice = file.frame?.slices[y]
          const nslice = file.frame?.slices[ny]
          if (slice && nslice) {
            const p = file.canvas.getPixel(slice.x + x, slice.y + z)
            if (p !== -1 && file.selection.isPixelMarked(slice.x + x, slice.y + z)) {
              file.push(
                new PixelsPlaceUndoable([
                  { x: slice.x + x, y: slice.y + z, index: 0 },
                  { x: nslice.x + nx, y: nslice.y + nz, index: p },
                ]),
              )
            }
          }
        }
      }
      cursorGrabbed = false
    }
    if ($toolSettings.current === toolVoxelBoxSelection) {
      cursorFirstMove = false
      file.push(new ThreeDSelectionBoxSetUndoable([...$file.threeDCursor1], [...$file.threeDCursor2]))
    }
  }
  function onCursor2Change(e: CustomEvent & { detail: [number, number, number] }) {
    const detail: [number, number, number] = e.detail
    console.log('change2...', detail, $file.threeDCursor2)
    $file.threeDCursor2 = [...detail]
  }
  function onCursor2Release(e: CustomEvent) {
    if ($toolSettings.current === toolVoxelBoxSelection) {
      file.push(new ThreeDSelectionBoxSetUndoable([...$file.threeDCursor1], [...$file.threeDCursor2]))
    }
  }

  function getGridXY(e: any): [number, number] {
    let x = Math.floor(e.point.x + file.frameWidth / 2)
    let y = Math.floor(e.point.z + file.frameHeight / 2)
    return [x, y]
  }
  function onGridHover(e: any) {
    let [x, z] = getGridXY(e)
    target = { x, y: 0, z }
    showTarget = true
  }
  function onGridMove(e: any) {
    let [x, z] = getGridXY(e)
    target = { x, y: 0, z }
    showTarget = true
  }
  function onGridLeave(e: any) {
    showTarget = false
  }
  function onGridClick(e: any) {
    if (e.nativeEvent.button !== 0) return
    if ($toolSettings.current === toolVoxelPlace) {
      let [x, z] = getGridXY(e)
      placePixelAt({ x, y: 0, z }, $brushSettings.primaryIndex)
    } else if ($toolSettings.current === toolVoxelCursor) {
      let [x, z] = getGridXY(e)
      $file.threeDCursor1 = [x, 0, z]
      $file.threeDCursor2 = [x, 0, z]
    }
  }

  function doPaste() {
    pasting = ThreeDCopyPaste.getCopy()
  }
  function clearPaste() {
    pasting = []
  }
  function doApplyPaste() {
    if (pasting === null) return
    let pixels: { x: number; y: number; index: number }[] = []
    for (let { x, y, z, index } of pasting) {
      x += $file.threeDCursor1[0]
      y += $file.threeDCursor1[1]
      z += $file.threeDCursor1[2]
      if (x < 0 || x >= file.frameWidth) continue
      if (z < 0 || z >= file.frameHeight) continue
      if (y < 0 || y >= file.frame?.slices.length) continue

      let slice = file.frame?.slices[y]
      if (!slice) continue
      pixels.push({
        x: slice.x + x,
        y: slice.y + z,
        index,
      })
    }
    file.push(new PixelsPlaceUndoable(pixels))
    clearPaste()
  }

  interactivity()
</script>

<ShortcutHandlers>
  <ShortcutHandler fileId={$file.id} group="editor3D" cmd="clear paste" on:trigger={clearPaste} />
  <ShortcutHandler fileId={$file.id} group="editor3D" cmd="paste" on:trigger={doPaste} />
  <ShortcutHandler fileId={$file.id} group="editor3D" cmd="apply paste" on:trigger={doApplyPaste} />
</ShortcutHandlers>

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
      bind:ref={orbitControls}
      mouseButtons={{
        LEFT: -1,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
      on:change={() => {
        center.set([orbitControls.target.x, orbitControls.target.y, orbitControls.target.z])
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
          {@const x = index % $file.frameWidth}
          {@const z = Math.floor(index / $file.frameWidth)}
          <Voxel hoverScale={$editor3DSettings.hoverScale} hideTransparent={$editor3DSettings.hideTransparent} ignoreAlpha={$editor3DSettings.ignoreAlpha} position={[x, y, z]} offset={[-$file.frameWidth / 2, 0, -$file.frameHeight / 2]} color={$palette ? $palette.swatches[pixel] : $file.canvas.getPaletteColor(pixel)} on:hover={onVoxelHover} on:move={onVoxelMove} on:leave={onVoxelLeave} on:click={onVoxelClick} ignoreEvents={cursorGrabbed} />
        {/if}
      {/each}
    {/each}
  </T.Group>
{/if}
<!--OptimizedRender {file} {palette} /-->

{#if pasting.length > 0}
  {#each pasting as { x, y, z, index }}
    <Voxel position={[x + $file.threeDCursor1[0], y + $file.threeDCursor1[1], z + $file.threeDCursor1[2]]} offset={[-$file.frameWidth / 2, 0, -$file.frameHeight / 2]} color={$palette ? $palette.swatches[index] : $file.canvas.getPaletteColor(index)} forceTransparent ignoreEvents />
  {/each}
{/if}

<Voxel position={[target.x, target.y, target.z]} offset={[-$file.frameWidth / 2, 0, -$file.frameHeight / 2]} color={0x880000ff} ignoreEvents visible={showTarget && $toolSettings.current === toolVoxelPlace} />

<Grid position={[0, -0.01, 0]} cellColor={$editor2DSettings.gridMinorColor} sectionColor={$editor2DSettings.gridMajorColor} gridSize={[$file.frameWidth, $file.frameHeight]} cellThickness={1} sectionThickness={1} />

<T.Mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} on:pointerenter={onGridHover} on:pointermove={onGridMove} on:pointerleave={onGridLeave} on:click={onGridClick}>
  <T.PlaneGeometry args={[$file.frameWidth, $file.frameHeight]} />
  <T.MeshBasicMaterial transparent={true} opacity={0} color={0x0000ff} />
</T.Mesh>

<T.Mesh visible={$toolSettings.current === toolVoxelPlace && target.y === $file?.frame?.slices.length} position={[0, ($file?.frame?.slices.length ?? 0) + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
  <T.PlaneGeometry args={[$file.frameWidth, $file.frameHeight]} />
  <T.MeshBasicMaterial transparent={true} opacity={0.2} color={0xff0000} />
</T.Mesh>

<T.Mesh visible={$toolSettings.current === toolVoxelPlace && (target.x === -1 || target.x === $file.frameWidth)} position={[target.x - $file.frameWidth / 2 + (target.x === $file.frameWidth ? 0 : 1), ($file.frame?.slices.length ?? 0) / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
  <T.PlaneGeometry args={[$file.frameHeight, $file.frame?.slices.length]} />
  <T.MeshBasicMaterial transparent={true} opacity={0.2} color={0xff0000} side={THREE.DoubleSide} />
</T.Mesh>

<T.Mesh visible={$toolSettings.current === toolVoxelPlace && (target.z === -1 || target.z === $file.frameHeight)} position={[0, ($file.frame?.slices.length ?? 0) / 2, target.z - $file.frameHeight / 2 + (target.z === $file.frameHeight ? 0 : 1)]}>
  <T.PlaneGeometry args={[$file.frameWidth, $file.frame?.slices.length]} />
  <T.MeshBasicMaterial transparent={true} opacity={0.2} color={0xff0000} side={THREE.DoubleSide} />
</T.Mesh>

{#if $toolSettings.current === toolVoxelCursor || $toolSettings.current === toolVoxelBoxSelection || pasting.length > 0}
  <Cursor position={$file.threeDCursor1} on:move={onCursorChange} on:grab={onCursorGrab} on:release={onCursorRelease} offset={[-$file.frameWidth / 2 + xOffset, 0, -$file.frameHeight / 2 + yOffset]} />
{/if}
{#if $toolSettings.current === toolVoxelBoxSelection && showSelection}
  <Cursor position={$file.threeDCursor2} on:move={onCursor2Change} on:release={onCursor2Release} offset={[-$file.frameWidth / 2 + xOffset, 0, -$file.frameHeight / 2 + yOffset]} />
{/if}
{#if $editor3DSettings.showCursor}
  <Voxel position={$file.threeDCursor1} offset={[-$file.frameWidth / 2, 0, -$file.frameHeight / 2]} color={0x44ff00ff} baseScale={1.1} ignoreEvents={$toolSettings.current !== toolVoxelPlace && $toolSettings.current !== toolVoxelReplace} on:hover={onCursorHover} on:move={onCursorMove} on:leave={onCursorLeave} on:click={onCursorClick} alwaysOnTop wireframe />
{/if}

{#if showSelection}
  <Selection selection={[$file.threeDCursor1, $file.threeDCursor2]} offset={[-$file.frameWidth / 2, 0, -$file.frameHeight / 2]} />
{/if}

<Gizmo center={$center} verticalPlacement={'top'} size={64} paddingX={8} paddingY={8} />
