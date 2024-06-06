<script lang='ts'>
  import { interactivity } from "@threlte/extras"
  import { T } from '@threlte/core'

  interactivity()
</script>

<T.PerspectiveCamera
  makeDefault
  position={[20, 20, 20]}
  on:create={({ ref }) => {
    ref.lookAt(0, 1, 0)
  }}
/>

<T.DirectionalLight position={[0, 10, 10]} />

<T.Mesh
  on:pointerenter={()=>console.log('hover')}
>
  <T.BoxGeometry args={[1, 1, 1]} />
  <T.MeshStandardMaterial color={0xff0000} />
</T.Mesh>

<T.Mesh
  rotation.x={-Math.PI / 2}
  position.y={-1}
  receiveShadow
>
  <T.PlaneGeometry args={[32, 32]} />
  <T.MeshStandardMaterial color={0x777777} />
</T.Mesh>
