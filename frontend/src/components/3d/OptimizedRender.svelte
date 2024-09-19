<script lang="ts">
  import type { LoadedFile } from 'src/types/file'
  import { onMount } from 'svelte'

  export let file: LoadedFile
  $: file ? refreshMesh() : null

  function refreshMesh() {
    // TODO: Here we would run a greedy mesher against our slices.
    let frame = file.frame
    if (!frame) return
    const width = file.frameWidth
    const depth = file.frameHeight
    const height = file.stack?.sliceCount || 1

    let traversed: boolean[][][] = new Array(height).fill(0).map(() => new Array(width).fill(0).map(() => new Array(depth).fill(false)))
    let quads: [number, number, number, number][] = []

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

    let currentY = 0
    let currentX = 0
    let currentZ = 0
    while (true) {
      let startY = currentY
      let startX = currentX
      let startZ = currentZ
      let endY = currentY
      let endX = currentX
      let endZ = currentZ
      // Traverse until we find a non-empty pixel.
      while (isEmpty(startY, startX, startZ)) {
        startZ++
        if (startZ >= depth) {
          startZ = 0
          startX++
          if (startX >= width) {
            startX = 0
            startY++
            if (startY >= height) {
              traversed[startY][startX][startZ] = true
              break
            }
          }
        }
        traversed[startY][startX][startZ] = true
      }
      if (startY >= height || startX >= width || startZ >= depth) {
        break
      }

      // Traverse until we find an empty or non-same pixel.
      let slice = frame.slices[startY]
      let pixel = file.canvas.getPixel(slice.x + startX, slice.y + startZ)
      while (isSame(pixel, endY, endX, endZ)) {
        traversed[endY][endX][endZ] = true
        endZ++
        if (endZ >= depth) {
          endZ = 0
          endX++
          if (endX >= width) {
            endX = 0
            endY++
            if (endY >= height) {
              break
            }
          }
        }
      }
    }
  }

  onMount(() => {
    refreshMesh()
  })
</script>
