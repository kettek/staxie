<script lang='ts'>
  import { onMount } from 'svelte'

  import type { data } from '../../wailsjs/go/models.ts'

  export let img: HTMLImageElement
  export let animation: data.Animation
  export let frame: data.Frame
  export let layer: data.Layer
  export let refresh: {}

  $: ((animation, frame, layer, img, refresh) => {
    setTimeout(() => {
      redraw()
      console.log('redraw')
    }, 0)
  })(animation, frame, layer, img, refresh)
  
  let canvas: HTMLCanvasElement
  function redraw() {
    if (!canvas) return
    let ctx = canvas.getContext('2d')
    if (!ctx) return
    let computedSize = getComputedStyle(canvas)
    if (canvas.width !== parseInt(computedSize.width) || canvas.height !== parseInt(computedSize.height)) {
      canvas.width = parseInt(computedSize.width)
      canvas.height = parseInt(computedSize.height)
      console.log('resize')
    }
    //
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // TODO: Draw the current layer of the current frame.
    ctx.drawImage(img, 0, 0)
  }
  
  onMount(() => {
    redraw()
  })
</script>

<main>
  <canvas bind:this={canvas}></canvas>
</main>

<style>
  main {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  canvas {
    width: 100%;
    height: 100%;
  }
</style>