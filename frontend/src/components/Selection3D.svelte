<script lang="ts" context="module">
  import { writable, type Writable } from 'svelte/store'
  export const rotateOrigin: Writable<[number, number, number]> = writable([0, 0, 0])
  export const rotateAngle: Writable<[number, number, number]> = writable([0, 0, 0])
  export const rotateActive: Writable<boolean> = writable(false)
</script>

<script lang="ts">
  import Button from './common/Button.svelte'
  import { fileStates } from '../stores/file'
  import { PixelsPlaceUndoable } from '../types/file/undoables'
  import Input from './common/Input.svelte'
  import { Checkmark } from 'carbon-icons-svelte'
  import { onMount } from 'svelte'

  let radX: number = 0
  let radY: number = 0
  let radZ: number = 0
  $: radX = $rotateAngle[0] * (Math.PI / 180)
  $: radY = $rotateAngle[1] * (Math.PI / 180)
  $: radZ = $rotateAngle[2] * (Math.PI / 180)
  function doRotate() {
    if (!$fileStates.focused) return
    const c1 = $fileStates.focused.threeDCursor1
    const c2 = $fileStates.focused.threeDCursor2
    if (c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2]) {
      c1[0] = 0
      c1[1] = 0
      c1[2] = 0
      c2[0] = $fileStates.focused.frameWidth - 1
      c2[2] = $fileStates.focused.frameHeight - 1
      c2[1] = $fileStates.focused.frame?.slices.length || 0 - 1
    }
    const minX = Math.min(c1[0], c2[0])
    const minY = Math.min(c1[1], c2[1])
    const minZ = Math.min(c1[2], c2[2])
    const maxX = Math.max(c1[0], c2[0])
    const maxY = Math.max(c1[1], c2[1])
    const maxZ = Math.max(c1[2], c2[2])

    const size = [maxX - minX, maxY - minY, maxZ - minZ]
    let center = [Math.floor(minX + size[0] / 2), Math.floor(minY + size[1] / 2), Math.floor(minZ + size[2] / 2)]
    center[0] += Number($rotateOrigin[0]) || 0
    center[1] += Number($rotateOrigin[1]) || 0
    center[2] += Number($rotateOrigin[2]) || 0

    const oldPixels: { x: number; y: number; index: number }[] = []
    const newPixels: { x: number; y: number; index: number }[] = []
    for (let y = minY; y <= maxY; y++) {
      const slice = $fileStates.focused.frame?.slices[y]
      if (!slice) continue
      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          const p = $fileStates.focused.canvas.getPixel(slice.x + x, slice.y + z)
          if (p == -1) continue
          oldPixels.push({ x: slice.x + x, y: slice.y + z, index: 0 })

          const x1 = x - center[0]
          const y1 = y - center[1]
          const z1 = z - center[2]
          const x2 = x1 * Math.cos(radY) - z1 * Math.sin(radY)
          const z2 = x1 * Math.sin(radY) + z1 * Math.cos(radY)
          const y2 = y1 * Math.cos(radX) - z2 * Math.sin(radX)
          const z3 = y1 * Math.sin(radX) + z2 * Math.cos(radX)
          const x3 = x2 * Math.cos(radZ) - y2 * Math.sin(radZ)
          const y3 = x2 * Math.sin(radZ) + y2 * Math.cos(radZ)
          const x4 = Math.floor(x3 + center[0])
          const y4 = Math.floor(y3 + center[1])
          const z4 = Math.floor(z3 + center[2])

          const nslice = $fileStates.focused.frame?.slices[y4]
          if (!nslice) continue
          if (nslice.x + x4 < nslice.x || nslice.x + x4 >= nslice.x + $fileStates.focused.frameWidth || nslice.y + z4 < nslice.y || nslice.y + z4 >= nslice.y + $fileStates.focused.frameHeight) continue
          newPixels.push({ x: nslice.x + x4, y: nslice.y + z4, index: p })
        }
      }
    }
    $fileStates.focused.push(new PixelsPlaceUndoable([...oldPixels, ...newPixels]))
  }
  onMount(() => {
    $rotateActive = true
    return () => {
      $rotateActive = false
    }
  })
</script>

<div>
  <Input type="number" width={4} bind:value={$rotateAngle[0]} labelColor="#ff3553">
    <svelte:fragment slot="label">X°</svelte:fragment>
  </Input>
  <Input type="number" width={6} bind:value={$rotateOrigin[0]} labelColor="#ff3553" placeholder="0">
    <svelte:fragment slot="label">Origin</svelte:fragment>
  </Input>
</div>
<div>
  <Input type="number" width={4} bind:value={$rotateAngle[1]} labelColor="#8adb00">
    <svelte:fragment slot="label">Y°</svelte:fragment>
  </Input>
  <Input type="number" width={6} bind:value={$rotateOrigin[1]} labelColor="#8adb00" placeholder="0">
    <svelte:fragment slot="label">Origin</svelte:fragment>
  </Input>
</div>
<div>
  <Input type="number" width={4} bind:value={$rotateAngle[2]} labelColor="#2a8fff">
    <svelte:fragment slot="label">Z°</svelte:fragment>
  </Input>
  <Input type="number" width={6} bind:value={$rotateOrigin[2]} labelColor="#2a8fff" placeholder="0">
    <svelte:fragment slot="label">Origin</svelte:fragment>
  </Input>
</div>
<Button icon={Checkmark} kind="primary" on:click={doRotate}>Apply</Button>

<style>
  div {
    display: flex;
    gap: 1rem;
  }
</style>
