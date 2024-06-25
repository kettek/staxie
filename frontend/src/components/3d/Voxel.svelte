<script lang='ts'>
  import { T } from '@threlte/core'
  import { Outlines } from '@threlte/extras'
  import { createEventDispatcher } from 'svelte'
  import { spring } from 'svelte/motion'
  
  const dispatch = createEventDispatcher()
  
  export let position: [number, number, number] = [0, 0, 0]
  export let offset: [number, number, number] = [0, 0, 0]
  export let color: number = 0xff00ffff // RGBA
  export let ignoreEvents: boolean = false
  export let visible: boolean = true
  export let hideTransparent: boolean = false
  export let ignoreAlpha: boolean = false
  
  let realColor: number = 0xff00ff // RGB
  let opacity = 1
  export let alwaysOnTop: boolean = false
  export let wireframe: boolean = false
  
  $: {
    let r = (color) & 0xff
    let g = (color >> 8) & 0xff
    let b = (color >> 16) & 0xff
    let a = (color >> 24) & 0xff
    if (ignoreAlpha) a = 0xff
    realColor = (r << 16) | (g << 8) | b
    opacity = a / 0xff
  }
  
  export let baseScale: number = 1
  const scale = spring(baseScale)
  let hovered = false
  
  let hidden = false
  $: hidden = !visible || (hideTransparent && opacity < 1)

  let suppressLeaveDueToLinuxBug = false // For some reason, on Linux wails, the "click" event is causing the "pointerleave" event to be emitted. This leave event, unfortunately, occurs _before_ the click event finishes, so it messes with voxel tool logic.
  
  function hover(e: any) {
    if (ignoreEvents || hidden) return
    e.stopPropagation()
    if (!wireframe) {
      $scale = baseScale+.15
      hovered = true
    }
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
    if (ignoreEvents || hidden) return
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
    if (ignoreEvents || hidden) return
    if (!wireframe) {
      $scale = baseScale
      hovered = false
    }
    if (suppressLeaveDueToLinuxBug) return
    e.stopPropagation()
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
    if (ignoreEvents || hidden) return
    if (e.nativeEvent.button !== 0) return
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
  function down(e: any) {
    suppressLeaveDueToLinuxBug = true
  }
  function up(e: any) {
    // This forces the suppression to be maintained until the _next_ event flush, browser update, or whatever it actually is.
    setTimeout(() => suppressLeaveDueToLinuxBug = false, 0)
  }
  /*function contextmenu(e: any) {
    if (ignoreEvents || hidden) return
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
  }*/
</script>

<T.Mesh
  scale={$scale}
  position={[position[0]+offset[0]+0.5, position[1]+offset[1]+0.5, position[2]+offset[2]+0.5]}
  visible={!hidden}
  on:pointerover={hover}
  on:pointerout={leave}
  on:pointermove={move}
  on:pointerdown={down}
  on:pointerup={up}
  on:click={click}
>
  <T.BoxGeometry />
  <T.MeshStandardMaterial
    transparent={opacity < 1}
    opacity={wireframe?0.2:hovered?1:opacity}
    color={hovered?(0xffffff-realColor)|0xff0000:realColor}
    depthTest={!alwaysOnTop}
    depthWrite={!alwaysOnTop}
  />
  {#if wireframe}
    <Outlines color={0x000000}/>
  {/if}
</T.Mesh>