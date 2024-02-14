<script lang='ts'>
  import { onMount } from 'svelte'

  import type { data } from '../../wailsjs/go/models.ts'
  import type { LoadedFile } from '../types/file'
  import type { PixelPosition } from '../types/shapes'
  import { BrushTool, EraserTool, FillTool, type Tool } from '../types/tools'

  export let file: LoadedFile
  export let animation: data.Animation
  export let frame: data.Frame
  export let layer: data.Layer
  export let refresh: {}

  export let checkerboardSize: number = 8

  let offsetX: number
  let offsetY: number
  let zoom: number = 1.0

  let mouseX: number = 0
  let mouseY: number = 0
  let mousePixelX: number = 0
  let mousePixelY: number = 0
  
  export let primaryColorIndex: number
  export let secondaryColorIndex: number

  let rootCanvas: HTMLCanvasElement
  let overlayCanvas: HTMLCanvasElement = document.createElement('canvas')
  let canvas: HTMLCanvasElement = document.createElement('canvas')

  let overlayDirty: boolean = true
  let canvasDirty: boolean = true
  
  let traversedPixels: Set<number> = new Set()
  function addTraversedPixels(pixels: PixelPosition[]) {
    for (let p of pixels) {
      traversedPixels.add(p.x+p.y*file.canvas.width)
    }
  }

  // check resizes canvases, etc.
  function check() {
    let ctx = rootCanvas.getContext('2d')
    if (!ctx) return
    let computedSize = getComputedStyle(rootCanvas)
    if (rootCanvas.width !== parseInt(computedSize.width) || rootCanvas.height !== parseInt(computedSize.height)) {
      rootCanvas.width = parseInt(computedSize.width)
      rootCanvas.height = parseInt(computedSize.height)
      canvas.width = rootCanvas.width
      canvas.height = rootCanvas.height
      overlayCanvas.width = rootCanvas.width
      overlayCanvas.height = rootCanvas.height
      overlayDirty = true
      canvasDirty = true
    }
    if (offsetX === undefined || offsetY === undefined) {
      // Adjust offset to center image on first LOAD.
      offsetX = rootCanvas.width/2 - file.canvas.width/2
      offsetY = rootCanvas.height/2 - file.canvas.height/2
    }
  }

  function draw() {
    if (!rootCanvas) return
    check()
    if (canvasDirty) {
      drawCanvas()
      canvasDirty = false
    }
    if (overlayDirty) {
      drawOverlay()
      overlayDirty = false
    }
    let ctx = rootCanvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, rootCanvas.width, rootCanvas.height)
    ctx.drawImage(canvas, 0, 0)

    // Draw the actual canvas image.
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.scale(zoom, zoom)
    ctx.drawImage(file.canvas.canvas, offsetX, offsetY)
    ctx.restore()

    ctx.drawImage(overlayCanvas, 0, 0)
  }

  function drawCanvas() {
    let ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#111111'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw checkboard.
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.scale(zoom, zoom)
    {
      ctx.beginPath()
      ctx.fillStyle = '#888888'
      ctx.rect(offsetX, offsetY, file.canvas.width, file.canvas.height)
      ctx.fill()

      let rows = file.canvas.height / checkerboardSize
      let cols = file.canvas.width / checkerboardSize
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
    ctx.restore()
  }

  function drawOverlay() {
    if (!overlayCanvas) return
    let ctx = overlayCanvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
    ctx.save()
    ctx.translate(0.5, 0.5)
    // Draw a cursor.
    {
      ctx.beginPath()
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 1

      if (zoom > 1) {
        ctx.rect(offsetX*zoom+mousePixelX*zoom, offsetY*zoom+mousePixelY*zoom, 1*zoom, 1*zoom)
      }
      if (zoom <= 1 || zoom > 4) {
        ctx.rect(mouseX, mouseY, 1, 1)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  function capOffset() {
    if (offsetX < -file.canvas.width+30) {
      offsetX = -file.canvas.width+30
    } else if (offsetX > canvas.width-30) {
      offsetX = canvas.width-30
    }
    if (offsetY < -file.canvas.height+30) {
      offsetY = -file.canvas.height+30
    } else if (offsetY > canvas.height-30) {
      offsetY = canvas.height-30
    }
  }
  
  export let currentTool: Tool
  
  function canvasMousedown(node) {
    let buttons: Set<number> = new Set()
    let x: number = 0
    let y: number = 0

    node.addEventListener('mouseenter', (e: MouseEvent) => {
      // hide cursor
      document.body.style.cursor = 'none'
    })
    node.addEventListener('mouseleave', (e: MouseEvent) => {
      // show cursor
      document.body.style.cursor = 'default'
    })

    node.addEventListener('mousedown', (e: MouseEvent) => {
      buttons.add(e.button)
      x = e.clientX
      y = e.clientY
      
      if (e.button === 0) {
        if (currentTool instanceof BrushTool) {
          currentTool.pointerDown({file, brushSize: 3, colorIndex: primaryColorIndex}, {x: mousePixelX, y: mousePixelY, id: e.button })
        } else if (currentTool instanceof EraserTool) {
          currentTool.pointerDown({file, brushSize: 3}, {x: mousePixelX, y: mousePixelY, id: e.button })
        } else if (currentTool instanceof FillTool) {
          currentTool.pointerDown({file, colorIndex: primaryColorIndex}, {x: mousePixelX, y: mousePixelY, id: e.button })
        } else {
          currentTool.pointerDown({file}, {x: mousePixelX, y: mousePixelY, id: e.button })
        }
      }
    })

    node.addEventListener('wheel', (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        if (e.deltaY < 0) {
          zoom *= 2
        } else if (e.deltaY > 0) {
          zoom /= 2
        }
        if (zoom > 1) {
          zoom = Math.round(zoom)
        }

        capOffset()
        canvasDirty = true
        overlayDirty = true
        return
      }
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
      canvasDirty = true
      overlayDirty = true
    })

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!canvas) return
      // Get mouse position relative to canvas.
      {
        let rect = canvas.getBoundingClientRect()
        mouseX = e.offsetX - rect.left
        mouseY = e.offsetY - rect.top
        mousePixelX = Math.floor(mouseX / zoom - offsetX)
        mousePixelY = Math.floor(mouseY / zoom - offsetY)
        overlayDirty = true
      }

      if (buttons.size === 0) return
      let dx = e.clientX - x
      let dy = e.clientY - y
      x = e.clientX
      y = e.clientY

      if (buttons.has(0)) {
        if (currentTool.isActive()) {
          if (currentTool instanceof BrushTool) {
            currentTool.pointerMove({file, brushSize: 3, colorIndex: primaryColorIndex}, {x: mousePixelX, y: mousePixelY, id: 0 })
          } else if (currentTool instanceof EraserTool) {
            currentTool.pointerMove({file, brushSize: 3}, {x: mousePixelX, y: mousePixelY, id: 0 })
          } else if (currentTool instanceof FillTool) {
            currentTool.pointerMove({file, colorIndex: primaryColorIndex}, {x: mousePixelX, y: mousePixelY, id: 0 })
          } else {
            currentTool.pointerMove({file}, {x: mousePixelX, y: mousePixelY, id: 0 })
          }
        }
      }
      if (buttons.has(1)) {
        offsetX += dx / zoom
        offsetY += dy / zoom
        capOffset()
        canvasDirty = true
        overlayDirty = true
      }
      if (buttons.has(2)) {
        console.log('2')
      }
    })

    window.addEventListener('mouseup', (e: MouseEvent) => {
      if (buttons.size === 0) return

      if (e.button === 0) {
        if (currentTool.isActive()) {
          currentTool.pointerUp({file}, {x: mousePixelX, y: mousePixelY, id: 0 })
        }
      }

      buttons.delete(e.button)

    })
  }
  
  onMount(() => {
    let frameID: number = 0
    let frameDraw = () => {
      draw()
      frameID = window.requestAnimationFrame(frameDraw)
    }
    frameID = window.requestAnimationFrame(frameDraw)
    return () => {
      window.cancelAnimationFrame(frameID)
    }
  })
</script>

<main>
  <canvas bind:this={rootCanvas} use:canvasMousedown on:contextmenu={(e)=>e.preventDefault()}></canvas>
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
    image-rendering: pixelated;
  }
</style>