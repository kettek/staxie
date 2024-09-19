<script lang="ts">
  import * as THREE from 'three'
  import { T } from '@threlte/core'
  import type { LoadedFile } from 'src/types/file'
  import { onMount } from 'svelte'
  import type { Palette } from 'src/types/palette'

  export let file: LoadedFile
  $: $file ? refreshMesh() : null

  export let palette: Palette | undefined

  function getColor(pixel: number) {
    const c = $palette ? $palette.swatches[pixel] : $file.canvas.getPaletteColor(pixel)
    // Reverse RGBA
    return ((c & 0xff) << 16) | (((c >> 8) & 0xff) << 8) | ((c >> 16) & 0xff)
  }

  let meshes: THREE.Mesh[] = []

  function refreshMesh() {
    // TODO: Here we would run a greedy mesher against our slices.
    let frame = file.frame
    if (!frame) return
    const width = file.frameWidth
    const depth = file.frameHeight
    const height = file.stack?.sliceCount || 1

    meshes = []

    let traversed: boolean[][][] = new Array(height).fill(0).map(() => new Array(width).fill(0).map(() => new Array(depth).fill(false)))

    function isEmpty(y: number, x: number, z: number) {
      if (x < 0 || x >= width || z < 0 || z >= depth) return true
      if (y < 0 || y >= height) return true
      const slice = frame.slices[y]
      const pixel = file.canvas.getPixel(slice.x + x, slice.y + z)
      return pixel === 0
    }
    function isSame(pixel: number, y: number, x: number, z: number) {
      if (x < 0 || x >= width || z < 0 || z >= depth) return false
      if (y < 0 || y >= height) return false
      const slice = frame.slices[y]
      const otherPixel = file.canvas.getPixel(slice.x + x, slice.y + z)
      return pixel === otherPixel
    }

    while (true) {
      let startY = 0
      let startX = 0
      let startZ = 0
      let found = false

      // Get our start.
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          for (let z = 0; z < depth; z++) {
            if (!isEmpty(y, x, z) && !traversed[y][x][z]) {
              startY = y
              startX = x
              startZ = z
              found = true
              break
            }
          }
        }
      }
      if (!found) {
        break
      }

      // Get our end.
      let endY = startY
      let endX = startX
      let endZ = startZ
      let slice = frame.slices[startY]
      let pixel = file.canvas.getPixel(slice.x + startX, slice.y + startZ)
      for (let y = startY; y < height; y++) {
        let shouldBreak = false
        for (let x = startX; x < width; x++) {
          if (isEmpty(y, x, endZ) || !isSame(pixel, y, x, endZ)) {
            endY = y
            endX = x
            shouldBreak = true
            break
          }
        }
        if (shouldBreak) {
          break
        }
        for (let z = startZ; z < depth; z++) {
          if (isEmpty(y, endX, z) || !isSame(pixel, y, endX, z)) {
            endY = y
            endZ = z
            break
          }
        }
      }

      console.log('start', startY, startX, startZ, 'end', endY, endX, endZ)

      // If we didn't find anything, we're done.
      if (startY === endY && startX === endX && startZ === endZ) {
        break
      }

      // Mark as traversed.
      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          for (let z = startZ; z <= endZ; z++) {
            traversed[y][x][z] = true
          }
        }
      }

      // Create our mesh.
      let w = endX - startX
      if (w === 0) w = 1
      let h = endY - startY
      if (h === 0) h = 1
      let d = endZ - startZ
      if (d === 0) d = 1
      const geometry = new THREE.BoxGeometry(w, h, d)
      const material = new THREE.MeshBasicMaterial({ color: getColor(pixel) })
      material.wireframe = true
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(startX + (endX - startX) / 2, startY + (endY - startY) / 2, startZ + (endZ - startZ) / 2)
      meshes.push(mesh)
    }
    meshes = [...meshes]
  }

  onMount(() => {
    refreshMesh()
  })
</script>

{#each meshes as mesh}
  <T is={mesh} />
{/each}
