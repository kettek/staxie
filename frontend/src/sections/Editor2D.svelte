<script lang='ts'>
  import { onMount } from 'svelte'

  import type { data } from '../../wailsjs/go/models.ts'

  export let img: HTMLImageElement
  export let animation: data.Animation
  export let frame: data.Frame
  export let layer: data.Layer
  export let refresh: {}

  export let checkerboardSize: number = 8

  let offsetX: number
  let offsetY: number

  $: ((animation, frame, layer, img, refresh) => {
    setTimeout(() => {
      redraw()
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
    }

    if (offsetX === undefined || offsetY === undefined) {
      // Adjust offset to center image on first LOAD.
      offsetX = canvas.width/2 - img.width/2
      offsetY = canvas.height/2 - img.height/2
    }

    ctx.fillStyle = '#111111'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw checkboard.
    {
      ctx.beginPath()
      ctx.fillStyle = '#888888'
      ctx.rect(offsetX, offsetY, img.width, img.height)
      ctx.fill()

      let rows = img.height / checkerboardSize
      let cols = img.width / checkerboardSize
      ctx.beginPath()
      ctx.fillStyle = '#444444'
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r % 2 === 0 && c % 2 === 1 || r % 2 === 1 && c % 2 === 0) {
            ctx.rect(
              offsetX+c * checkerboardSize,
              offsetY+r * checkerboardSize,
              checkerboardSize,
              checkerboardSize,
            )
          }
        }
      }
      ctx.fill()
    }

    // TODO: Draw the current layer of the current frame.
    ctx.drawImage(img, offsetX, offsetY)
  }

  function capOffset() {
    if (offsetX < -img.width+30) {
      offsetX = -img.width+30
    } else if (offsetX > canvas.width-30) {
      offsetX = canvas.width-30
    }
    if (offsetY < -img.height+30) {
      offsetY = -img.height+30
    } else if (offsetY > canvas.height-30) {
      offsetY = canvas.height-30
    }
  }

  function canvasMousedown(node) {
    let buttons: Set<number> = new Set()

    node.addEventListener('mousedown', (e: MouseEvent) => {
      buttons.add(e.button)
    })

    node.addEventListener('wheel', (e: WheelEvent) => {
      if (e.deltaY < 0) {
        if (e.shiftKey) {
          offsetX--
        } else {
          offsetY--
        }
      } else if (e.deltaY > 0) {
        if (e.shiftKey) {
          offsetX++
        } else {
          offsetY++
        }
      }
      capOffset()
      redraw()
    })

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (buttons.size === 0) return
      if (buttons.has(0)) {
        console.log('0')
      }
      if (buttons.has(1)) {
        offsetX += e.movementX
        offsetY += e.movementY
        capOffset()
      }
      if (buttons.has(2)) {
        console.log('2')
      }
      redraw()
    })

    window.addEventListener('mouseup', (e: MouseEvent) => {
      buttons.delete(e.button)
    })
  }
  
  onMount(() => {
    redraw()
  })
</script>

<main>
  <canvas bind:this={canvas} use:canvasMousedown></canvas>
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