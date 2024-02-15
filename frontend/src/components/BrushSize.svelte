<script lang='ts'>
  import { FilledCircle } from "../types/shapes"

  export let brushSize: number
  
  $: ((brushSize: number) => {
    if (canvas) {
      let {width, height} = getComputedStyle(canvas)
      canvas.width = parseInt(width)
      canvas.height = parseInt(height)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = 'black'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      let shape = FilledCircle(canvas.width/2, canvas.height/2, brushSize, 1)
      for (let i = 0; i < shape.length; i++) {
        ctx.fillStyle = 'white'
        ctx.fillRect(shape[i].x, shape[i].y, 1, 1)
      }
    }
  })(brushSize)
  
  let canvas: HTMLCanvasElement
</script>

<canvas bind:this={canvas}>
</canvas>

<style>
  canvas {
    width: 2rem;
    height: 2rem;
  }
</style>