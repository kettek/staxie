<script lang="ts">
  import { T } from '@threlte/core'
  import { BoxGeometry, EdgesGeometry } from 'three'

  export let offset: [number, number, number] = [0, 0, 0]
  export let x: number = 0
  export let y: number = 0
  export let z: number = 0
  export let w: number = 1
  export let h: number = 1
  export let d: number = 1
</script>

<T.LineSegments position={[x + offset[0] + (w + 1) / 2, y + offset[1] + (h + 1) / 2, z + offset[2] + (d + 1) / 2]} geometry={new EdgesGeometry(new BoxGeometry(w, h, d))}>
  <T.EdgesGeometry args={[new BoxGeometry(w + 1, h + 1, d + 1)]} />
  <T.LineBasicMaterial />
</T.LineSegments>
