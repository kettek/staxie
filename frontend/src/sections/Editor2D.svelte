<!--
  @component
  
  This component is a full 2D pixel editor.
-->
<script lang='ts'>
  import { onMount } from 'svelte'
  import { brushSettings } from '../stores/brush'
  import { editor2DSettings } from '../stores/editor2d'
  import { CanvasView } from '../types/canvasview'

  import { type LoadedFile } from '../types/file'
  import { EllipseShape, FilledCircle, FilledSquare, NormalizeShape, RectangleShape, ShapeToImageData, type PixelPosition } from '../types/shapes'
  import { BrushTool, EraserTool, FillTool, PickerTool, MoveTool, SelectionRectangularTool, SprayTool, RectangleTool, EllipseTool, SelectionEllipseTool, ReferenceTool } from '../types/tools'
  import Button from '../components/common/Button.svelte'
  import { ZoomIn, ZoomOut } from 'carbon-icons-svelte'
  import { toolCanvas, toolSettings } from '../stores/tool'
  import { rlog } from '../globals/log'
  import { isKeyActive } from '../components/Shortcuts.svelte'
  import { createImageReference } from '../types/imagereference'
  import Input from '../components/common/Input.svelte'

  export let file: LoadedFile
  /*export let animation: data.Animation
  export let frame: data.Frame
  export let slice: data.Slice*/

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
  // mousePixels is the absolute pixel location to the canvas.
  let mousePixelX: number = 0
  let mousePixelY: number = 0
  // viewPixels is the absolute pixel location to the current view. This is mousePixels + view.xy.
  let viewPixelX: number = 0
  let viewPixelY: number = 0
  
  let view: CanvasView = new CanvasView($file.canvas)
  $: {
    switch ($editor2DSettings.viewMode) {
      case 'slice':
        if ($file.frame) {
          let { x, y, width, height } = $file.getSliceAreaFromFrame($file.frame, $file.sliceIndex)
          view.x = x
          view.y = y
          view.width = width
          view.height = height
        }
        break
      case 'frame':
        if ($file.frame) {
          let { x, y, width, height } = $file.getFrameAreaFromFrame($file.frame)
          view.x = x
          view.y = y
          view.width = width
          view.height = height
        }
        break
      case 'animation':
        if ($file.animation) {
          let { x, y, width, height } = $file.getAnimationAreaFromAnimation($file.animation)
          view.x = x
          view.y = y
          view.width = width
          view.height = height
        }
        break
      case 'stack':
        if ($file.stack) {
          let { x, y, width, height } = $file.getStackAreaFromStack($file.stack)
          view.x = x
          view.y = y
          view.width = width
          view.height = height
        }
        break
      case 'sheet':
        view.x = 0
        view.y = 0
        view.width = $file.canvas.width
        view.height = $file.canvas.height
        break
    }
  }

  let rootCanvas: HTMLCanvasElement
  let overlayCanvas: HTMLCanvasElement = document.createElement('canvas')
  let canvas: HTMLCanvasElement = document.createElement('canvas')

  let overlayDirty: boolean = true
  let canvasDirty: boolean = true
  
  function setZoom(z: number) {
    if (z < 1) {
      z = 1
    }
    zoom = z
    capOffset()
    canvasDirty = true
    overlayDirty = true
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
      offsetX = rootCanvas.width/2 - view?.width/2??file.canvas.width/2
      offsetY = rootCanvas.height/2 - view?.height/2??file.canvas.height/2
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

    // Draw reference underneath.
    if ($file.selectedImageReference) {
      let ref = $editor2DSettings.imageReferences.list().find(v=>v.src===$file.selectedImageReference)
      if (ref && !ref.overtop && ref.image) {
        ctx.save()
        ctx.imageSmoothingEnabled = false
        ctx.imageSmoothingQuality = 'low'
        ctx.globalAlpha = ref.opacity
        ctx.drawImage(ref.image, 0, 0, ref.image.naturalWidth, ref.image.naturalHeight, offsetX+ref.x*(zoom*ref.zoom), offsetY+ref.y*(zoom*ref.zoom), ref.image.naturalWidth*zoom*ref.zoom, ref.image.naturalHeight*zoom*ref.zoom)
        ctx.restore()
      }
    }

    // Draw the actual canvas image.
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(file.canvas.canvas, view.x, view.y, view.width, view.height, offsetX, offsetY, view.width*zoom, view.height*zoom)
    ctx.restore()

    // Draw reference overtop.
    if ($file.selectedImageReference) {
      let ref = $editor2DSettings.imageReferences.list().find(v=>v.src===$file.selectedImageReference)
      if (ref && ref.overtop && ref.image) {
        ctx.save()
        ctx.imageSmoothingEnabled = false
        ctx.imageSmoothingQuality = 'low'
        ctx.globalAlpha = ref.opacity
        ctx.drawImage(ref.image, 0, 0, ref.image.naturalWidth, ref.image.naturalHeight, offsetX+ref.x*(zoom*ref.zoom), offsetY+ref.y*(zoom*ref.zoom), ref.image.naturalWidth*zoom*ref.zoom, ref.image.naturalHeight*zoom*ref.zoom)
        ctx.restore()
      }
    }

    // FIXME: Reorganize overlay drawing to have two types: regular composition, such as this pixel brush preview, and difference composition for cursors and bounding boxes.
    // Draw brush preview.
    if ($toolSettings.current instanceof BrushTool) {
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
        ctx.fillRect(offsetX+(mousePixelX+shape[i].x)*zoom, offsetY+(mousePixelY+shape[i].y)*zoom, zoom, zoom)
      }
    } else if ($toolSettings.current instanceof MoveTool && $toolSettings.current.isActive()) {
      ctx.save()
      ctx.imageSmoothingEnabled = false
      let {x, y} = $toolSettings.current.previewPosition()
      x -= view.x
      y -= view.y
      ctx.drawImage($toolSettings.current.preview.canvas, 0, 0, $toolSettings.current.preview.canvas.width, $toolSettings.current.preview.canvas.height, offsetX+x*zoom, offsetY+y*zoom, $toolSettings.current.preview.canvas.width*zoom, $toolSettings.current.preview.canvas.height*zoom)
      ctx.restore()
    } else if ($toolSettings.current instanceof RectangleTool && $toolSettings.current.isActive()) {
      ctx.save()
      ctx.imageSmoothingEnabled = false
      
      toolCanvas.width = Math.abs($toolSettings.current.x1 - $toolSettings.current.x2) + 1
      toolCanvas.height = Math.abs($toolSettings.current.y1 - $toolSettings.current.y2) + 1
      let tctx = toolCanvas.getContext('2d')
      if (tctx) {
        let { r, g, b, a } = file.canvas.getPaletteAsRGBA($toolSettings.current.colorIndex)
        let {shape, minX, minY} = NormalizeShape(RectangleShape($toolSettings.current.x1, $toolSettings.current.y1, $toolSettings.current.x2, $toolSettings.current.y2, $toolSettings.current.fill, $brushSettings.primaryIndex))
        let imageData = ShapeToImageData(shape, tctx, [r, g, b, a])
        tctx.putImageData(imageData, 0, 0)
        ctx.drawImage(toolCanvas, 0, 0, toolCanvas.width, toolCanvas.height, offsetX+minX*zoom, offsetY+minY*zoom, toolCanvas.width*zoom, toolCanvas.height*zoom)
      }
      ctx.restore()
    } else if ($toolSettings.current instanceof EllipseTool && $toolSettings.current.isActive()) {
      rlog.warn('FIXME: Implement Ellipse tool preview. (it freezes if enabled)')
      if (false) {
        ctx.save()
        ctx.imageSmoothingEnabled = false
        ctx.scale(zoom, zoom)
      
        toolCanvas.width = Math.abs($toolSettings.current.x1 - $toolSettings.current.x2) + 1
        toolCanvas.height = Math.abs($toolSettings.current.y1 - $toolSettings.current.y2) + 1
        let tctx = toolCanvas.getContext('2d')
        if (tctx) {
          let { r, g, b, a } = file.canvas.getPaletteAsRGBA($toolSettings.current.colorIndex)
          let {shape, minX, minY} = NormalizeShape(EllipseShape($toolSettings.current.x1, $toolSettings.current.y1, $toolSettings.current.x2, $toolSettings.current.y2, $toolSettings.current.fill, $brushSettings.primaryIndex))
          let imageData = ShapeToImageData(shape, tctx, [r, g, b, a])
          tctx.putImageData(imageData, 0, 0)
          ctx.drawImage(toolCanvas, offsetX+minX, offsetY+minY)
        }
        ctx.restore()
      }
    }

    // Draw our grid.
    ctx.save()
    if ($editor2DSettings.showGrid) {
      ctx.imageSmoothingEnabled = false
      ctx.imageSmoothingQuality = 'low'
      // Minor grid lines.
      ctx.strokeStyle = $editor2DSettings.gridMinorColor
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = $editor2DSettings.gridMinorSize; x < view.width; x += $editor2DSettings.gridMinorSize) {
        ctx.moveTo(offsetX+x*zoom, offsetY)
        ctx.lineTo(offsetX+x*zoom, offsetY+view.height*zoom)
      }
      for (let y = $editor2DSettings.gridMinorSize; y < view.height; y += $editor2DSettings.gridMinorSize) {
        ctx.moveTo(offsetX, offsetY+y*zoom)
        ctx.lineTo(offsetX+view.width*zoom, offsetY+y*zoom)
      }
      ctx.stroke()
      // Major grid lines.
      ctx.strokeStyle = $editor2DSettings.gridMajorColor
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = $editor2DSettings.gridMajorSize; x < view.width; x += $editor2DSettings.gridMajorSize) {
        ctx.moveTo(offsetX+x*zoom, offsetY)
        ctx.lineTo(offsetX+x*zoom, offsetY+view.height*zoom)
      }
      for (let y = $editor2DSettings.gridMajorSize; y < view.height; y += $editor2DSettings.gridMajorSize) {
        ctx.moveTo(offsetX, offsetY+y*zoom)
        ctx.lineTo(offsetX+view.width*zoom, offsetY+y*zoom)
      }
      ctx.stroke()
    }
    ctx.restore()

    // Draw our selection overlay.
    if (file.selection.active) {
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(file.selection.marchingCanvas, offsetX-view.x*zoom, offsetY-view.y*zoom)
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
    if ($editor2DSettings.showCheckerboard) {
      ctx.beginPath()
      ctx.fillStyle = $editor2DSettings.checkerboardColor1
      ctx.rect(offsetX, offsetY, view.width*zoom, view.height*zoom)
      ctx.fill()

      let rows = view.height / $editor2DSettings.checkerboardSize
      let cols = view.width / $editor2DSettings.checkerboardSize
      ctx.beginPath()
      ctx.fillStyle = $editor2DSettings.checkerboardColor2
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r % 2 === 0 && c % 2 === 1 || r % 2 === 1 && c % 2 === 0) {
            let x = c * $editor2DSettings.checkerboardSize
            let y = r * $editor2DSettings.checkerboardSize
            let w = $editor2DSettings.checkerboardSize
            let h = $editor2DSettings.checkerboardSize
            if (x+w > view.width) {
              w = view.width - x
            }
            if (y+h > view.height) {
              h = view.height - y
            }
            ctx.rect(offsetX+x*zoom, offsetY+y*zoom, w*zoom, h*zoom)
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
      if (($toolSettings.current instanceof SelectionRectangularTool || $toolSettings.current instanceof SelectionEllipseTool) && $toolSettings.current.isActive()) {
        // FIXME: Show ellipse preview!
        let {x, y, width, height} = $toolSettings.current.getArea()
        x -= view.x
        y -= view.y
        ctx.strokeRect(offsetX+x*zoom, offsetY+y*zoom, width*zoom, height*zoom)
      }
      // Draw zoomed pixel-sized square where mouse is.
      if (zoom > 1) {
        ctx.rect(offsetX+mousePixelX*zoom, offsetY+mousePixelY*zoom, 1*zoom, 1*zoom)
      }
      // Draw pixel square where mouse is.
      if (zoom <= 1 || zoom > 4) {
        ctx.rect(mouseX, mouseY, 1, 1)
      }
      ctx.stroke()
    }

    if ($toolSettings.current instanceof BrushTool && isKeyActive('shift')) {
      ctx.beginPath()
      ctx.strokeStyle = '#cc3388'
      ctx.lineWidth = zoom

      let x = Math.floor(view.x) + Math.floor($toolSettings.current.lastX)
      let y = view.y + Math.floor(Math.floor($toolSettings.current.lastY))

      let x2 = mousePixelX*zoom+zoom/2
      let y2 = mousePixelY*zoom+zoom/2

      ctx.moveTo(offsetX+(x+0.5)*zoom, offsetY+(y+0.5)*zoom)
      ctx.lineTo(offsetX+x2, offsetY+y2)
      ctx.stroke()
    }

    ctx.restore()
  }

  function capOffset() {
    if (offsetX < -view.width+30) {
      offsetX = -view.width+30
    } else if (offsetX > canvas.width-30) {
      offsetX = canvas.width-30
    }
    if (offsetY < -view.height+30) {
      offsetY = -view.height+30
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
        if ($toolSettings.current instanceof BrushTool) {
          $toolSettings.current.pointerDown({file, view, brushSize: $brushSettings.size, brushType: $brushSettings.type, colorIndex: $brushSettings.primaryIndex, color: $brushSettings.primaryColor}, {x: viewPixelX, y: viewPixelY, id: e.button, shift: e.shiftKey, control: e.ctrlKey })
        } else if ($toolSettings.current instanceof EraserTool) {
          $toolSettings.current.pointerDown({file, view, brushSize: $brushSettings.size, brushType: $brushSettings.type}, {x: viewPixelX, y: viewPixelY, id: e.button, shift: e.shiftKey, control: e.ctrlKey })
        } else if ($toolSettings.current instanceof RectangleTool || $toolSettings.current instanceof EllipseTool) {
          $toolSettings.current.pointerDown({file, view, colorIndex: $brushSettings.primaryIndex, color: $brushSettings.primaryColor, fill: $brushSettings.fill}, {x: viewPixelX, y: viewPixelY, id: e.button, shift: e.shiftKey, control: e.ctrlKey })
        } else if ($toolSettings.current instanceof SprayTool) {
          $toolSettings.current.pointerDown({file, view, radius: $brushSettings.sprayRadius, density: $brushSettings.sprayDensity, colorIndex: $brushSettings.primaryIndex, color: $brushSettings.primaryColor}, {x: viewPixelX, y: viewPixelY, id: e.button, shift: e.shiftKey, control: e.ctrlKey })
        } else if ($toolSettings.current instanceof FillTool) {
          $toolSettings.current.pointerDown({file, view, colorIndex: $brushSettings.primaryIndex, color: $brushSettings.primaryColor}, {x: viewPixelX, y: viewPixelY, id: e.button, shift: e.shiftKey, control: e.ctrlKey })
        } else if ($toolSettings.current instanceof PickerTool) {
          $toolSettings.current.pointerDown({file, view, setColorIndex: index=>$brushSettings.primaryIndex=index}, {x: viewPixelX, y: viewPixelY, id: e.button, shift: e.shiftKey, control: e.ctrlKey })
        } else if ($toolSettings.current instanceof ReferenceTool) {
          $toolSettings.current.pointerDown({file, view, imageReference: $editor2DSettings.imageReferences.list().find(v=>v.src===$file.selectedImageReference)}, {x: viewPixelX, y: viewPixelY, id: e.button, shift: e.shiftKey, control: e.ctrlKey})
        } else {
          $toolSettings.current.pointerDown({file, view}, {x: viewPixelX, y: viewPixelY, id: e.button, shift: e.shiftKey, control: e.ctrlKey })
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
        mouseX = (e.offsetX - rect.left)
        mouseY = (e.offsetY - rect.top)
        mousePixelX = Math.floor((mouseX-offsetX) / zoom)
        mousePixelY = Math.floor((mouseY-offsetY) / zoom)
        viewPixelX = mousePixelX + view.x
        viewPixelY = mousePixelY + view.y
        overlayDirty = true
      }

      if (buttons.size === 0) return
      let dx = e.clientX - x
      let dy = e.clientY - y
      x = e.clientX
      y = e.clientY

      if (buttons.has(0)) {
        if ($toolSettings.current.isActive()) {
          if ($toolSettings.current instanceof BrushTool) {
            $toolSettings.current.pointerMove({file, view, brushSize: $brushSettings.size, brushType: $brushSettings.type, colorIndex: $brushSettings.primaryIndex, color: $brushSettings.primaryColor}, {x: viewPixelX, y: viewPixelY, id: 0 })
          } else if ($toolSettings.current instanceof EraserTool) {
            $toolSettings.current.pointerMove({file, view, brushSize: $brushSettings.size, brushType: $brushSettings.type}, {x: viewPixelX, y: viewPixelY, id: 0 })
          } else if ($toolSettings.current instanceof RectangleTool) {
            $toolSettings.current.pointerMove({file, view}, {x: viewPixelX, y: viewPixelY, id: 0})
          } else if ($toolSettings.current instanceof SprayTool) {
            $toolSettings.current.pointerMove({file, view, radius: $brushSettings.sprayRadius, density: $brushSettings.sprayDensity, colorIndex: $brushSettings.primaryIndex, color: $brushSettings.primaryColor}, {x: viewPixelX, y: viewPixelY, id: e.button, shift: e.shiftKey, control: e.ctrlKey })
          } else if ($toolSettings.current instanceof FillTool) {
            $toolSettings.current.pointerMove({file, view, colorIndex: $brushSettings.primaryIndex, color: $brushSettings.primaryColor}, {x: viewPixelX, y: viewPixelY, id: 0 })
          } else if ($toolSettings.current instanceof PickerTool) {
            $toolSettings.current.pointerMove({file, view, setColorIndex: index=>$brushSettings.primaryIndex=index}, {x: viewPixelX, y: viewPixelY, id: e.button })
          } else {
            $toolSettings.current.pointerMove({file, view}, {x: viewPixelX, y: viewPixelY, id: 0 })
          }
        }
      }
      if (buttons.has(1)) {
        offsetX += dx
        offsetY += dy
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
        if ($toolSettings.current.isActive()) {
          $toolSettings.current.pointerUp({file, view}, {x: viewPixelX, y: viewPixelY, id: 0, shift: e.shiftKey, control: e.ctrlKey })
        }
      }

      buttons.delete(e.button)

    })
  }
  
  function coordToMousePixel(x: number, y: number): [number, number] {
    let rect = canvas.getBoundingClientRect()
    let mouseX = (x - rect.left)
    let mouseY = (y - rect.top)
    return [Math.floor((mouseX-offsetX) / zoom), Math.floor((mouseY-offsetY) / zoom)]
  }

  function viewDrop(node) {
    node.ondragover = "return false"
    node.addEventListener('dragenter', (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    })
    node.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    })
    node.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer && e.dataTransfer.files.length) {
        for (let f of e.dataTransfer.files) {
          if (f.type.startsWith('image/')) {
            let reader = new FileReader()
            let [mousePixelX, mousePixelY] = coordToMousePixel(e.offsetX, e.offsetY)

            reader.onload = (e) => {
              $editor2DSettings.imageReferences.add(createImageReference(f.name, e.target?.result as string, mousePixelX, mousePixelY))
              $file.selectedImageReference = f.name
            }
            reader.readAsDataURL(f)
          }
        }
      }
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
  <section class='view' use:viewDrop>
    <canvas bind:this={rootCanvas} use:canvasMousedown on:contextmenu={(e)=>e.preventDefault()}></canvas>
  </section>
  <menu>
    <section class='cursorInfo'>
      <span><aside>{Math.sign(mousePixelX)===-1?'-':' '}</aside>{Math.abs(mousePixelX)}</span><span><aside>{Math.sign(mousePixelY)===-1?'-':' '}</aside>{Math.abs(mousePixelY)}</span>
      <span>{view.width}</span><span>{view.height}</span>
    </section>
    <section class='controls'>
      <Input
        type="number"
        min={0}
        max={10}
        step={1}
        value={zoom}
        width={5}
        on:change={(e)=>setZoom(e.detail)}
      />
      <Button
        on:click={zoomIn}
        kind="ghost"
        size="small"
        icon={ZoomIn}
        tooltip="Zoom In"
        tooltipPosition="top"
        tooltipAlignment="end"
      />
      <Button
        on:click={zoomOut}
        kind="ghost"
        size="small"
        icon={ZoomOut}
        tooltip="Zoom Out"
        tooltipPosition="top"
        tooltipAlignment="end"
      />
    </section>
  </menu>
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
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    user-select: none;
  }
  canvas {
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
  }
  menu {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }
  :global(menu > .bx--form-item) {
    flex: initial;
  }
  .cursorInfo {
    display: grid;
    grid-template-columns: auto auto auto auto;
    grid-template-rows: auto;
    align-items: center;
    justify-content: stretch;
  }
  .cursorInfo span {
    min-width: 3rem;
    text-align: left;
    color: var(--cds-text-03);
    font-size: 0.75rem;
    font-family: monospace;
  }
  .cursorInfo span aside {
    display: inline-block;
    width: 0.5em;
  }
  .controls {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
  }
</style>