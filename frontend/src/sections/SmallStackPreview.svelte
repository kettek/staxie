<!--
  @component

  This component provides a sprite stack view of a file.
-->
<script lang="ts">
  import { Grid, Row, Column, Checkbox, Slider, Dropdown } from 'carbon-components-svelte'
  import { fileStates } from '../stores/file'
  import { onMount } from 'svelte'
  import { previewSettings } from '../stores/preview'
  import type { LoadedFile } from '../types/file'
  import type { StaxStack } from '../types/png'
  import Input from '../components/common/Input.svelte'

  export let file: LoadedFile

  let rotation: number = 0
  let zoom: number = 2
  let sliceDistance: number = 1

  let automaticShading: boolean = true
  let minShade: number = 0.5

  let timeElapsed: number = 0
  let lastTime: DOMHighResTimeStamp = performance.now()

  let minHeight: number = 80
  $: minHeight = ($file.frameHeight + ($file.stack?.sliceCount ?? 0)) * zoom
  let minWidth: number = 80
  $: minWidth = $file.frameWidth * zoom

  let canvas: HTMLCanvasElement
  function draw(ts: DOMHighResTimeStamp) {
    if (!canvas) return
    timeElapsed += ts - lastTime
    lastTime = ts
    rotation += 0.5

    if (canvas.width !== minWidth || canvas.height !== minHeight) {
      canvas.width = minWidth
      canvas.height = minHeight
    }

    let ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.imageSmoothingEnabled = false

    let y = 0
    if (file.animation) {
      const animation = file.animation
      let frameIndex = Math.floor(timeElapsed / animation.frameTime) % animation.frames.length
      let frame = animation.frames[frameIndex]
      for (let sliceIndex = 0; sliceIndex < frame.slices.length; sliceIndex++) {
        const slice = frame.slices[sliceIndex]
        ctx.save()
        ctx.translate(canvas.width / 2, canvas.height / 2)
        //ctx.translate(cx, cy)
        ctx.translate(0, y - sliceDistance * zoom)
        ctx.translate((file.frameWidth * zoom) / 2, (file.frameHeight * zoom) / 2)
        ctx.rotate((rotation * Math.PI) / 180)
        ctx.translate((-file.frameWidth * zoom) / 2, (-file.frameHeight * zoom) / 2)

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

<canvas bind:this={canvas} style="width: {minWidth}px; height: {minHeight}px"></canvas>
