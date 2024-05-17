<!--
  @component
  
  This component is a full 2D pixel editor.
-->
<script lang='ts'>
  import { onMount } from 'svelte'
  import { brushSettings } from '../stores/brush'
  import { editor2DSettings } from '../stores/editor2d'

  import { fileStates } from '../stores/file'
  import { AddAnimationFrameUndoable, ClearAnimationFrameUndoable, RemoveAnimationFrameUndoable, type LoadedFile } from '../types/file'
  import { FilledCircle, FilledSquare, type PixelPosition } from '../types/shapes'
  import { BrushTool, EraserTool, FillTool, PickerTool, MoveTool, type BrushType, type Tool, SelectionTool, SprayTool } from '../types/tools'
  import { Button, ContextMenu, ContextMenuOption, NumberInput, OverflowMenu, OverflowMenuItem, Slider } from 'carbon-components-svelte';
  import { Add, AddAlt, AddLarge, FaceAdd, NewTab, ZoomIn, ZoomOut } from 'carbon-icons-svelte';

  export let file: LoadedFile
  /*export let animation: data.Animation
  export let frame: data.Frame
  export let slice: data.Slice*/
  export const refresh: {} = {}

  $: ((...args) => {
    canvasDirty = true
  })($editor2DSettings.showCheckerboard, $editor2DSettings.checkerboardSize, $editor2DSettings.checkerboardColor1, $editor2DSettings.checkerboardColor2, $editor2DSettings.backgroundColor)

  let offsetX: number
  let offsetY: number
  let zoom: number = 1.0
  $: file.selection.resize(file.canvas.width, file.canvas.height, zoom)
  $: $file ? canvasDirty = true : null

  let mouseX: number = 0
  let mouseY: number = 0
  let mousePixelX: number = 0
  let mousePixelY: number = 0
  
  export let currentTool: Tool

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
  
  function zoomIn() {
    if (zoom < 1) {
      zoom *=2
    } else {
      zoom++
    }
    if (zoom > 1) {
      zoom = Math.round(zoom)
    }

    capOffset()
    canvasDirty = true
    overlayDirty = true
  }
  function zoomOut() {
    if (zoom-1 <= 0) {
      zoom /= 2
    } else {
      zoom--
    }
    if (zoom > 1) {
      zoom = Math.round(zoom)
    }
    capOffset()
    canvasDirty = true
    overlayDirty = true
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

    file.selection.update()

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

    // FIXME: Reorganize overlay drawing to have two types: regular composition, such as this pixel brush preview, and difference composition for cursors and bounding boxes.
    // Draw brush preview.
    if (currentTool instanceof BrushTool) {
      let shape: PixelPosition[]
      if ($brushSettings.type === 'square' || $brushSettings.size <= 2) {
        // FIXME: This is daft to adjust +1,+1 for size 2 -- without this, the rect preview draws one pixel offset to the top-left, which is not the same as when the filled rect is placed.
        if ($brushSettings.size === 2) {
          shape = FilledSquare(1, 1, $brushSettings.size, 1)
        } else {
          shape = FilledSquare(0, 0, $brushSettings.size, 1)
        }
      } else if ($brushSettings.type === 'circle') {
        shape = FilledCircle(0, 0, $brushSettings.size-2, 1)
      }
      let {r, g, b, a } = file.canvas.getPaletteAsRGBA($brushSettings.primaryIndex)
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`
      for (let i = 0; i < shape.length; i++) {
        ctx.fillRect(offsetX*zoom+(mousePixelX+shape[i].x)*zoom, offsetY*zoom+(mousePixelY+shape[i].y)*zoom, zoom, zoom)
      }
    } else if (currentTool instanceof MoveTool && currentTool.isActive()) {
      ctx.save()
      ctx.imageSmoothingEnabled = false
      ctx.scale(zoom, zoom)
      let {x, y} = currentTool.previewPosition()
      ctx.drawImage(currentTool.preview.canvas, offsetX+x, offsetY+y)
      ctx.restore()
    }

    // Draw our grid.
    if ($editor2DSettings.showGrid) {
      // Minor grid lines.
      ctx.strokeStyle = $editor2DSettings.gridMinorColor
      ctx.lineWidth = 0.5
      ctx.beginPath()
      for (let x = $editor2DSettings.gridMinorSize; x < file.canvas.width; x += $editor2DSettings.gridMinorSize) {
        ctx.moveTo(offsetX*zoom+x*zoom, offsetY*zoom)
        ctx.lineTo(offsetX*zoom+x*zoom, offsetY*zoom+file.canvas.height*zoom)
      }
      for (let y = $editor2DSettings.gridMinorSize; y < file.canvas.height; y += $editor2DSettings.gridMinorSize) {
        ctx.moveTo(offsetX*zoom, offsetY*zoom+y*zoom)
        ctx.lineTo(offsetX*zoom+file.canvas.width*zoom, offsetY*zoom+y*zoom)
      }
      ctx.stroke()
      // Major grid lines.
      ctx.strokeStyle = $editor2DSettings.gridMajorColor
      ctx.lineWidth = 0.5
      ctx.beginPath()
      for (let x = $editor2DSettings.gridMajorSize; x < file.canvas.width; x += $editor2DSettings.gridMajorSize) {
        ctx.moveTo(offsetX*zoom+x*zoom, offsetY*zoom)
        ctx.lineTo(offsetX*zoom+x*zoom, offsetY*zoom+file.canvas.height*zoom)
      }
      for (let y = $editor2DSettings.gridMajorSize; y < file.canvas.height; y += $editor2DSettings.gridMajorSize) {
        ctx.moveTo(offsetX*zoom, offsetY*zoom+y*zoom)
        ctx.lineTo(offsetX*zoom+file.canvas.width*zoom, offsetY*zoom+y*zoom)
      }
      ctx.stroke()
    }

    // Draw our selection overlay.
    if (file.selection.active) {
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(file.selection.marchingCanvas, offsetX*zoom, offsetY*zoom)
    }

    // Draw our overlay with difference composition so visibility is better.
    ctx.save()
    ctx.globalCompositeOperation = 'difference'
    ctx.drawImage(overlayCanvas, 0, 0)
    ctx.restore()
  }

  function drawCanvas() {
    let ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = $editor2DSettings.backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw checkboard.
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.scale(zoom, zoom)
    if ($editor2DSettings.showCheckerboard) {
      ctx.beginPath()
      ctx.fillStyle = $editor2DSettings.checkerboardColor1
      ctx.rect(offsetX, offsetY, file.canvas.width, file.canvas.height)
      ctx.fill()

      let rows = file.canvas.height / $editor2DSettings.checkerboardSize
      let cols = file.canvas.width / $editor2DSettings.checkerboardSize
      ctx.beginPath()
      ctx.fillStyle = $editor2DSettings.checkerboardColor2
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r % 2 === 0 && c % 2 === 1 || r % 2 === 1 && c % 2 === 0) {
            ctx.rect(
              offsetX+c * $editor2DSettings.checkerboardSize,
              offsetY+r * $editor2DSettings.checkerboardSize,
              $editor2DSettings.checkerboardSize,
              $editor2DSettings.checkerboardSize,
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
      ctx.strokeStyle = '#cc3388'
      ctx.lineWidth = 1
      
      // Draw bounding box selection preview.
      if (currentTool instanceof SelectionTool && currentTool.isActive()) {
        let {x, y, width, height} = currentTool.getArea()
        ctx.strokeRect(offsetX*zoom+x*zoom, offsetY*zoom+y*zoom, width*zoom, height*zoom)
      }
      // Draw zoomed pixel-sized square where mouse is.
      if (zoom > 1) {
        ctx.rect(offsetX*zoom+mousePixelX*zoom, offsetY*zoom+mousePixelY*zoom, 1*zoom, 1*zoom)
      }
      // Draw  pixel square where mouse is.
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
  
  function canvasMousedown(node) {
    let buttons: Set<number> = new Set()
    let x: number = 0
    let y: number = 0
    let entered: boolean = false

    node.addEventListener('mouseenter', (e: MouseEvent) => {
      entered = true
      // hide cursor
      document.body.style.cursor = 'none'
    })
    node.addEventListener('mouseleave', (e: MouseEvent) => {
      entered = false
      // show cursor
      document.body.style.cursor = 'default'
    })

    node.addEventListener('mousedown', (e: MouseEvent) => {
      buttons.add(e.button)
      x = e.clientX
      y = e.clientY
      
      if (e.button === 0) {
        if (currentTool instanceof BrushTool) {
          currentTool.pointerDown({file, brushSize: $brushSettings.size, brushType: $brushSettings.type, colorIndex: $brushSettings.primaryIndex, color: $brushSettings.primaryColor}, {x: mousePixelX, y: mousePixelY, id: e.button, shift: e.shiftKey, control: e.ctrlKey })
        } else if (currentTool instanceof EraserTool) {
          currentTool.pointerDown({file, brushSize: $brushSettings.size, brushType: $brushSettings.type}, {x: mousePixelX, y: mousePixelY, id: e.button, shift: e.shiftKey, control: e.ctrlKey })
        } else if (currentTool instanceof SprayTool) {
          currentTool.pointerDown({file, radius: $brushSettings.sprayRadius, density: $brushSettings.sprayDensity, colorIndex: $brushSettings.primaryIndex, color: $brushSettings.primaryColor}, {x: mousePixelX, y: mousePixelY, id: e.button, shift: e.shiftKey, control: e.ctrlKey })
        } else if (currentTool instanceof FillTool) {
          currentTool.pointerDown({file, colorIndex: $brushSettings.primaryIndex, color: $brushSettings.primaryColor}, {x: mousePixelX, y: mousePixelY, id: e.button, shift: e.shiftKey, control: e.ctrlKey })
        } else if (currentTool instanceof PickerTool) {
          currentTool.pointerDown({file, setColorIndex: index=>$brushSettings.primaryIndex=index}, {x: mousePixelX, y: mousePixelY, id: e.button, shift: e.shiftKey, control: e.ctrlKey })
        } else {
          currentTool.pointerDown({file}, {x: mousePixelX, y: mousePixelY, id: e.button, shift: e.shiftKey, control: e.ctrlKey })
        }
      }
    })

    node.addEventListener('wheel', (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        if (e.deltaY < 0) {
          zoomIn()
        } else if (e.deltaY > 0) {
          zoomOut()
        }
        return
      }
      if (e.altKey) return
      // FIXME: Do we have to invert this for Mac OS?
      if (e.deltaY > 0) {
        if (e.shiftKey) {
          offsetX--
        } else {
          offsetY--
        }
      } else if (e.deltaY < 0) {
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
      if (!entered && buttons.size === 0) return
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
            currentTool.pointerMove({file, brushSize: $brushSettings.size, brushType: $brushSettings.type, colorIndex: $brushSettings.primaryIndex, color: $brushSettings.primaryColor}, {x: mousePixelX, y: mousePixelY, id: 0 })
          } else if (currentTool instanceof EraserTool) {
            currentTool.pointerMove({file, brushSize: $brushSettings.size, brushType: $brushSettings.type}, {x: mousePixelX, y: mousePixelY, id: 0 })
          } else if (currentTool instanceof SprayTool) {
            currentTool.pointerMove({file, radius: $brushSettings.sprayRadius, density: $brushSettings.sprayDensity, colorIndex: $brushSettings.primaryIndex, color: $brushSettings.primaryColor}, {x: mousePixelX, y: mousePixelY, id: e.button, shift: e.shiftKey, control: e.ctrlKey })
          } else if (currentTool instanceof FillTool) {
            currentTool.pointerMove({file, colorIndex: $brushSettings.primaryIndex, color: $brushSettings.primaryColor}, {x: mousePixelX, y: mousePixelY, id: 0 })
          } else if (currentTool instanceof PickerTool) {
            currentTool.pointerMove({file, setColorIndex: index=>$brushSettings.primaryIndex=index}, {x: mousePixelX, y: mousePixelY, id: e.button })
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
          currentTool.pointerUp({file}, {x: mousePixelX, y: mousePixelY, id: 0, shift: e.shiftKey, control: e.ctrlKey })
        }
      }

      buttons.delete(e.button)

    })
  }
  
  function setSlice(sliceIndex: number) {
    file.setSliceIndex(sliceIndex)
    fileStates.refresh()
  }

  function setFrame(frameIndex: number) {
    file.setFrameIndex(frameIndex)
    fileStates.refresh()
  }
  
  function addFrame() {
    file.push(new AddAnimationFrameUndoable(file.group.name, file.animation.name))
  }
  
  let contextFrameOpen: boolean = false
  let contextFrameIndex: number = -1
  let contextX: number = 0
  let contextY: number = 0
  function onFrameRightClick(e: MouseEvent, frameIndex: number) {
    contextFrameOpen = true
    contextX = e.clientX
    contextY = e.clientY
    contextFrameIndex = frameIndex
  }
  function contextFrameDelete() {
    if (file.animation.frames.length === 1) {
      alert('thou shalt not delete the last frame')
      return
    }
    file.push(new RemoveAnimationFrameUndoable(file.group.name, file.animation.name, contextFrameIndex))
  }
  function contextFrameClear() {
    file.push(new ClearAnimationFrameUndoable(file.group.name, file.animation.name, contextFrameIndex))
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
  <section class='view'>
    <canvas bind:this={rootCanvas} use:canvasMousedown on:contextmenu={(e)=>e.preventDefault()}></canvas>
    <section class='slicesContainer'>
      <!--<Button
        kind="ghost"
        size="small"
        icon={NewTab}
        iconDescription="Add Slice"
        tooltipPosition="top"
        tooltipAlignment="end"
        disabled={!file || !file.frame}
      />-->
      <section class='slices'>
        {#if $file.frame}
          {#each $file.frame.slices as slice, sliceIndex}
            <article class='slice{sliceIndex===file.sliceIndex?' --selected':''}' on:click={()=>setSlice(sliceIndex)}>
              <span class='sliceIndex'>{sliceIndex+1}</span>
            </article>
          {/each}
        {/if}
      </section>
    </section>
    <section class='framesContainer'>
      <Button
        kind="ghost"
        size="small"
        icon={AddAlt}
        iconDescription="Add Frame"
        tooltipPosition="top"
        tooltipAlignment="end"
        disabled={!file || !file.animation}
        on:click={addFrame}
      />
      <section class='frames'>
        {#if $file.animation}
          {#each $file.animation.frames as frame, frameIndex}
            <article class='frame{frameIndex===file.frameIndex?' --selected':''}' on:click={()=>setFrame(frameIndex)} on:contextmenu|preventDefault={(e)=>onFrameRightClick(e, frameIndex)}>
              <span class='frameIndex'>{frameIndex+1}</span>
            </article>
          {/each}
        {/if}
      </section>
    </section>
  </section>
  <menu>
    <NumberInput
      min={0}
      max={10}
      step={1}
      bind:value={zoom}
      size="sm"
      hideSteppers
    />
    <Button
      on:click={zoomIn}
      kind="ghost"
      size="small"
      icon={ZoomIn}
      iconDescription="Zoom In"
      tooltipPosition="top"
      tooltipAlignment="end"
    />
    <Button
      on:click={zoomOut}
      kind="ghost"
      size="small"
      icon={ZoomOut}
      iconDescription="Zoom Out"
      tooltipPosition="top"
      tooltipAlignment="end"
    />
  </menu>
  <ContextMenu bind:open={contextFrameOpen} bind:x={contextX} bind:y={contextY} target={[]}>
    <ContextMenuOption labelText="Clear Frame" on:click={contextFrameClear} />
    <ContextMenuOption labelText="Delete Frame" kind="danger" on:click={contextFrameDelete} />
  </ContextMenu>
</main>

<style>
  main {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
  }
  .view {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    grid-template-rows: minmax(0, 1fr);
    user-select: none;
  }
  .slicesContainer {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: /*auto*/ minmax(0, 1fr);
  }
  .slices {
    font-family: monospace;
    font-size: 0.75rem;
    overflow-y: scroll;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
  }
  .slices::-webkit-scrollbar {
    width: 0.2rem !important;
  }
  .slices::-webkit-scrollbar-track {
    background: var(--cds-ui-01) !important;
  }
  .slices::-webkit-scrollbar-thumb {
    background: var(--cds-text-03) !important;
  }
  .slices::-webkit-scrollbar-thumb:hover {
    background: var(--cds-hover-primary) !important;
  }
  .slices::-webkit-scrollbar-thumb:active {
    background: var(--cds-active-primary) !important;
  }
  .slice {
    text-align: center;
    padding: 0.2rem;
    border-bottom: 1px solid var(--cds-ui-01);
    background: var(--cds-ui-02);
  }
  .slice.--selected {
    background: var(--cds-active-primary);
  }
  .slice:hover {
    background: var(--cds-hover-primary);
    cursor: pointer;
  }
  .framesContainer {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }
  .frames {
    font-family: monospace;
    font-size: 0.75rem;
    overflow-x: hidden;
    overflow-y: scroll;
    display: flex;
    flex-direction: column;
    min-width: 1.5em;
  }
  .frames::-webkit-scrollbar {
    width: 0.2rem !important;
  }
  .frames::-webkit-scrollbar-track {
    background: var(--cds-ui-01) !important;
  }
  .frames::-webkit-scrollbar-thumb {
    background: var(--cds-text-03) !important;
  }
  .frames::-webkit-scrollbar-thumb:hover {
    background: var(--cds-hover-primary) !important;
  }
  .frames::-webkit-scrollbar-thumb:active {
    background: var(--cds-active-primary) !important;
  }
  .frame {
    text-align: center;
    padding: 0.2rem;
    border-bottom: 1px solid var(--cds-ui-01);
    background: var(--cds-ui-02);
  }
  .frame.--selected {
    background: var(--cds-active-primary);
  }
  .frame:hover {
    background: var(--cds-hover-primary);
    cursor: pointer;
  }
  canvas {
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
  }
  menu {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
  }
  :global(menu > .bx--form-item) {
    flex: initial;
  }
</style>