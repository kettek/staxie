<script lang='ts'>
  import { T } from '@threlte/core'
  import { createEventDispatcher } from 'svelte';
  import { spring } from 'svelte/motion'
  
  const dispatch = createEventDispatcher()
  
  export let position: [number, number, number] = [0, 0, 0]
  export let offset: [number, number, number] = [0, 0, 0]
  export let color: number = 0xff00ffff // RGBA
  export let ignoreEvents: boolean = false
  export let visible: boolean = true
  
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
  
  function hover(e: any) {
    if (ignoreEvents) return
    e.stopPropagation()
    $scale = 1.2
    hovered = true
    dispatch('hover', {
      position: {
        x: position[0],
        y: position[1],
        z: position[2],
      },
      face: {
        x: e.normal.x,
        y: e.normal.y,
        z: e.normal.z,
      },
      original: e,
    })
  }
  function move(e: any) {
    if (ignoreEvents) return
    e.stopPropagation()
    dispatch('move', {
      position: {
        x: position[0],
        y: position[1],
        z: position[2],
      },
      face: {
        x: e.normal.x,
        y: e.normal.y,
        z: e.normal.z,
      },
      original: e,
    })
  }
  function leave(e: any) {
    if (ignoreEvents) return
    e.stopPropagation()
    $scale = 1.0
    hovered = false
    dispatch('leave', {
      position: {
        x: position[0],
        y: position[1],
        z: position[2],
      },
      face: {
        x: e.normal.x,
        y: e.normal.y,
        z: e.normal.z,
      },
      original: e,
    })
  }
  function click(e: any) {
    if (ignoreEvents) return
    e.stopPropagation()
    dispatch('click', {
      position: {
        x: position[0],
        y: position[1],
        z: position[2],
      },
      button: 0,
      face: {
        x: e.normal.x,
        y: e.normal.y,
        z: e.normal.z,
      },
      original: e,
    })
  }
  function contextmenu(e: any) {
    if (ignoreEvents) return
    e.stopPropagation()
    dispatch('click', {
      position: {
        x: position[0],
        y: position[1],
        z: position[2],
      },
      button: 2,
      face: {
        x: e.normal.x,
        y: e.normal.y,
        z: e.normal.z,
      },
      original: e,
    })
  }
</script>

<T.Mesh
  scale={$scale}
  position={[position[0]+offset[0]+0.5, position[1]+offset[1]+0.5, position[2]+offset[2]+0.5]}
  visible={visible}
  on:pointerenter={hover}
  on:pointerleave={leave}
  on:pointermove={move}
  on:click={click}
  on:contextmenu={contextmenu}
>
  <T.BoxGeometry />
  <T.MeshStandardMaterial
    transparent={opacity < 1}
    opacity={hovered?1:opacity}
    color={hovered?(0xffffff-realColor)|0xff0000:realColor}
  />
</T.Mesh>