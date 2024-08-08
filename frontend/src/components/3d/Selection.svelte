<script lang="ts">
  import { T } from '@threlte/core'
  import { BoxGeometry, EdgesGeometry, LineBasicMaterial, LineSegments } from 'three'

  export let offset: [number, number, number] = [0, 0, 0]
  export let selection: [[number, number, number], [number, number, number]] = [
    [0, 0, 0],
    [0, 0, 0],
  ]
  let position: [number, number, number] = [0, 0, 0]
  let width: number = 1
  let height: number = 1
  let depth: number = 1

  $: width = Math.abs(selection[0][0] - selection[1][0]) + 1
  $: height = Math.abs(selection[0][1] - selection[1][1]) + 1
  $: depth = Math.abs(selection[0][2] - selection[1][2]) + 1
  $: position[0] = Math.min(selection[0][0], selection[1][0]) + width / 2
  $: position[1] = Math.min(selection[0][1], selection[1][1]) + height / 2
  $: position[2] = Math.min(selection[0][2], selection[1][2]) + depth / 2
</script>

<T.LineSegments position={[position[0] + offset[0], position[1] + offset[1], position[2] + offset[2]]} geometry={new EdgesGeometry(new BoxGeometry(width, height, depth))}>
  <T.EdgesGeometry args={[new BoxGeometry(width, height, depth)]} />
  <T.LineBasicMaterial />
</T.LineSegments>
