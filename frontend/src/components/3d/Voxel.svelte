<script lang='ts'>
  import { T } from '@threlte/core'
  import { spring } from 'svelte/motion'
  
  export let position: [number, number, number] = [0, 0, 0]
  export let color: number = 0xff00ffff // RGBA
  
  let realColor: number = 0xff00ff // RGB
  let opacity = 1
  
  $: {
    let r = (color) & 0xff
    let g = (color >> 8) & 0xff
    let b = (color >> 16) & 0xff
    let a = (color >> 24) & 0xff
    realColor = (r << 16) | (g << 8) | b
    opacity = a / 0xff
  }
  
  const scale = spring(1)
  let hovered = false
  
  function hover(e: PointerEvent) {
    e.stopPropagation()
    $scale = 1.2
    hovered = true
  }
  function leave(e: PointerEvent) {
    $scale = 1.0
    hovered = false
  }
  function click(e: PointerEvent) {
    console.log('click', position, e)
  }
</script>

<T.Mesh
  scale={$scale}
  position={[position[0]+0.5, position[1]+0.5, position[2]+0.5]}
  on:pointerenter={hover}
  on:pointerleave={leave}
  on:click={click}
>
  <T.BoxGeometry />
  <T.MeshStandardMaterial
    transparent={opacity < 1}
    opacity={hovered?1:opacity}
    color={hovered?(0xffffff-realColor)|0xff0000:realColor}
  />
</T.Mesh>