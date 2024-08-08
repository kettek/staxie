<!--
  @component

  This component provides a visualization of the current brush size and shape and controls for changing them.
-->
<script lang="ts">
  import { OverflowMenu, OverflowMenuItem } from 'carbon-components-svelte'
  import { FilledCircle, FilledSquare, type PixelPosition } from '../types/shapes'

  export let brushSize: number
  export let brushType: 'circle' | 'square' = 'circle'

  $: ((brushSize: number, brushType: 'circle' | 'square') => {
    if (canvas) {
      let { width, height } = getComputedStyle(canvas)
      canvas.width = parseInt(width)
      canvas.height = parseInt(height)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = 'black'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      let shape: PixelPosition[]
      if (brushType === 'square' || brushSize <= 2) {
        shape = FilledSquare(canvas.width / 2, canvas.height / 2, brushSize, 1)
      } else if (brushType === 'circle') {
        shape = FilledCircle(canvas.width / 2, canvas.height / 2, brushSize - 2, 1)
      }
      for (let i = 0; i < shape.length; i++) {
        ctx.fillStyle = 'white'
        ctx.fillRect(shape[i].x, shape[i].y, 1, 1)
      }
    }
  })(brushSize, brushType)

  function handleWheel(event: WheelEvent) {
    event.preventDefault()
    brushSize = Math.max(1, brushSize - Math.sign(event.deltaY))
  }

  let canvas: HTMLCanvasElement
</script>

<div on:wheel={handleWheel}>
  <OverflowMenu size="sm" style="width: auto">
    <canvas slot="menu" bind:this={canvas}> </canvas>
    <OverflowMenuItem primaryFocus={brushType === 'circle'} text="circle" on:click={() => (brushType = 'circle')} />
    <OverflowMenuItem primaryFocus={brushType === 'square'} text="square" on:click={() => (brushType = 'square')} />
  </OverflowMenu>
</div>

<style>
  canvas {
    width: 2rem;
    height: 2rem;
  }
</style>
