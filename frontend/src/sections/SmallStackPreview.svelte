<!--
  @component

  This component provides an embedded stack preview of a stack.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import type { LoadedFile } from '../types/file'
  import { smallPreviewSettings } from '../stores/smallpreview'

  export let file: LoadedFile

  let rotation: number = 0
  let zoom: number = 4
  let spin: boolean = false
  let sliceDistance: number = 1

  let automaticShading: boolean = true
  let minShade: number = 0.5

  let timeElapsed: number = 0
  let lastTime: DOMHighResTimeStamp = performance.now()

  let minHeight: number = 80
  $: minHeight = ($file.frameHeight + ($file.stack?.sliceCount ?? 0)) * zoom
  let minWidth: number = 80
  $: minWidth = $file.frameWidth * zoom

  let minSize: number = 1
  $: minSize = Math.max(minWidth, minHeight)

  let canvas: HTMLCanvasElement
  function draw(ts: DOMHighResTimeStamp) {
    if (!canvas) return
    timeElapsed += ts - lastTime
    lastTime = ts
    if (spin) {
      rotation += $smallPreviewSettings.spinSpeed ?? 0.5
    }

    if (canvas.width !== minWidth || canvas.height !== minHeight) {
      canvas.width = minWidth
      canvas.height = minHeight
    }

    let ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.imageSmoothingEnabled = false

    const frameWidth = file.frameWidth * zoom
    const frameHeight = file.frameHeight * zoom

    if (file.animation) {
      const animation = file.animation
      let frameIndex = Math.floor(timeElapsed / animation.frameTime) % animation.frames.length
      let frame = animation.frames[frameIndex]
      if (!frame) {
        frameIndex = 0
        return
      }
      let y = frame.slices.length * sliceDistance * zoom
      for (let sliceIndex = 0; sliceIndex < frame.slices.length; sliceIndex++) {
        const slice = frame.slices[sliceIndex]
        ctx.save()

        ctx.translate(0, y)
        ctx.translate(frameWidth / 2, frameHeight / 2)
        ctx.rotate((rotation * Math.PI) / 180)
        ctx.translate(-frameWidth / 2, -frameHeight / 2)

        if (automaticShading) {
          // FIXME: Adjust this math to use configurable min/max values.
          // FIXME: This is not affected by multiple stacks!!!
          let shade = 128 + Math.min(255, 128 * (sliceIndex / frame.slices.length))
          ctx.filter = `brightness(${minShade + (1 - minShade) * (shade / 255)})`
        }

        ctx.drawImage(file.canvas.canvas, slice.x, slice.y, file.frameWidth, file.frameHeight, 0, 0, file.frameWidth * zoom, file.frameHeight * zoom)
        ctx.restore()
        y -= 1 * sliceDistance * zoom
      }
    }
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault()
    if (event.ctrlKey) {
      if (event.deltaY < 0) {
        zoom += 1
      } else {
        zoom -= 1
      }
      zoom = Math.min(Math.max(1, zoom), 10)
    } else {
      spin = false
      if (event.deltaY < 0) {
        rotation += $smallPreviewSettings.wheelIncrement
      } else {
        rotation -= $smallPreviewSettings.wheelIncrement
      }
      if (isNaN(rotation)) {
        rotation = 0
      }
      console.log(rotation, $smallPreviewSettings.wheelIncrement)
    }
  }

  function handleClick(event: MouseEvent) {
    spin = !spin
  }

  onMount(() => {
    let frameID: number = 0
    let frameDraw = (ts: DOMHighResTimeStamp) => {
      draw(ts)
      frameID = requestAnimationFrame(frameDraw)
    }
    frameID = requestAnimationFrame(frameDraw)
    return () => cancelAnimationFrame(frameID)
  })
</script>

<main on:wheel={handleWheel} on:click={handleClick} style={`background: ${$smallPreviewSettings.background}`}>
  <canvas bind:this={canvas} style="width: {minWidth}px; height: {minHeight}px"></canvas>
</main>

<style>
  main {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    background: black;
  }
</style>
