<script lang="ts">
  import { T } from '@threlte/core'
  import { Outlines } from '@threlte/extras'

  export let position: [number, number, number] = [0, 0, 0]
  export let offset: [number, number, number] = [0, 0, 0]
  export let radius: number = 1
</script>

<T.Mesh position={[position[0] + offset[0] + 0.5, position[1] + offset[1] + 0.5, position[2] + offset[2] + 0.5]}>
  <T.OctahedronGeometry args={[radius]} />
  <T.MeshBasicMaterial color={0xffffff} />
  <Outlines color={0x000000} />
</T.Mesh>
