<!--
  @component

  This component provides a sprite stack view of a file.
-->
<script lang="ts">
  import { Grid, Row, Column, Checkbox, Slider, Dropdown } from 'carbon-components-svelte'
  import { SaveFileBytes, GetFolderPath } from '../../wailsjs/go/main/App'
  import { fileStates } from '../stores/file'
  import { onMount } from 'svelte'
  import { previewSettings } from '../stores/preview'
  import type { LoadedFile } from '../types/file'
  import type { StaxStack } from '../types/png'
  import Input from '../components/common/Input.svelte'
  import Button from '../components/common/Button.svelte'
  import { RecordingFilled, StopFilledAlt } from 'carbon-icons-svelte'

  type StackState = {
    visible: boolean
    animation: string
    frameIndex: number
    orderIndex: number
    sliceStart: number
    sliceEnd: number
    frameStart: number
    frameEnd: number
  }
  type VisibleState = {
    visible: boolean
    stacks: Record<string, StackState>
  }

  export let shronked: boolean = false

  let backgroundImage: HTMLImageElement | null = null

  let img = new Image()
  img.onload = () => {
    backgroundImage = img
  }
  img.onerror = () => {
    backgroundImage = null
  }
  $: img.src = $previewSettings.background

  let visibleFiles: Record<number, VisibleState> = {}

  let filePositions: Record<number, { x: number; y: number; z: number }> = {}
  $: {
    for (let file of $fileStates.files) {
      if (visibleFiles[file.id] && !filePositions[file.id]) {
        filePositions[file.id] = { x: 0, y: 0, z: 0 }
      }
    }
  }

  let rotation: number = 0
  let zoom: number = 1
  let sliceDistance: number = 1

  let automaticShading: boolean = true
  let minShade: number = 0.5

  let timeElapsed: number = 0
  let lastTime: DOMHighResTimeStamp = performance.now()

  let recording: boolean = false
  let recordTimer: number = 0
  async function record() {
    if (!recording) {
      const folder = await GetFolderPath()
      if (folder === '') {
        return
      }
      recordTimer = window.setInterval(() => {
        const data = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '')
        const ts = Date.now()
        const p = `${folder}/${$previewSettings.framePrefix}${ts}${$previewSettings.frameSuffix}.png`
        SaveFileBytes(p, data as any)
      }, $previewSettings.secondsBetweenFrames * 1000)
    } else {
      clearInterval(recordTimer)
    }
    recording = !recording
  }

  let canvas: HTMLCanvasElement
  function draw(ts: DOMHighResTimeStamp) {
    if (!canvas) return
    timeElapsed += ts - lastTime
    lastTime = ts

    let rect = canvas.getBoundingClientRect()
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width
      canvas.height = rect.height
    }

    let ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (backgroundImage) {
      let pattern = ctx.createPattern(backgroundImage, 'repeat')
      if (pattern) {
        ctx.fillStyle = pattern
        ctx.save()
        ctx.scale(zoom, zoom)
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.restore()
      }
    } else {
      ctx.fillStyle = $previewSettings.background
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    ctx.imageSmoothingEnabled = false

    let x = canvas.width / 2
    let y = canvas.height / 2
    let sortedFiles = $fileStates.files.filter((file) => visibleFiles[file.id]).sort((a, b) => filePositions[a.id].z - filePositions[b.id].z)
    for (let file of sortedFiles) {
      if (visibleFiles[file.id]?.visible) {
        let sortedStacks = visibleFiles[file.id].stacks ? file.stacks.filter((stack) => visibleFiles[file.id].stacks[stack.name]?.visible).sort((a, b) => visibleFiles[file.id].stacks[a.name].orderIndex - visibleFiles[file.id].stacks[b.name].orderIndex) : []
        let sliceOffset = 0
        for (let stack of sortedStacks) {
          let done = false
          if (!visibleFiles[file.id]?.stacks[stack.name]?.visible) continue
          let animation = stack.animations.find((animation) => animation.name === visibleFiles[file.id].stacks[stack.name].animation)
          if (animation) {
            const frameStart = Math.max(visibleFiles[file.id].stacks[stack.name].frameStart || 0, 0)
            const frameEnd = Math.min(visibleFiles[file.id].stacks[stack.name].frameEnd || animation.frames.length, animation.frames.length)
            let frameIndex = frameStart + (Math.floor(timeElapsed / animation.frameTime) % (frameEnd - frameStart))
            let frame = animation.frames[frameIndex]
            if (!frame) continue
            let sliceStart = Math.max(visibleFiles[file.id].stacks[stack.name].sliceStart || 0, 0)
            let sliceEnd = Math.min(visibleFiles[file.id].stacks[stack.name].sliceEnd || frame.slices.length, frame.slices.length)
            for (let sliceIndex = sliceStart; sliceIndex < sliceEnd; sliceIndex++) {
              let slice = frame.slices[sliceIndex]
              if (sliceIndex === 0) {
                if ($previewSettings.showBaseSizeOutline) {
                  ctx.save()
                  ctx.translate(x, y)
                  ctx.translate(filePositions[file.id].x, filePositions[file.id].y)
                  ctx.scale(zoom, zoom)
                  ctx.strokeStyle = $previewSettings.baseSizeOutlineColor
                  ctx.lineWidth = 1 / zoom
                  ctx.strokeRect(-file.frameWidth / 2, -file.frameHeight / 2, file.frameWidth, file.frameHeight)
                  ctx.restore()
                }
                if ($previewSettings.showSizeOutline) {
                  ctx.save()
                  ctx.translate(x, y)
                  ctx.translate(filePositions[file.id].x, filePositions[file.id].y)
                  ctx.scale(zoom, zoom)
                  ctx.rotate((rotation * Math.PI) / 180)
                  ctx.strokeStyle = $previewSettings.sizeOutlineColor
                  ctx.lineWidth = 1 / zoom
                  ctx.strokeRect(-file.frameWidth / 2, -file.frameHeight / 2, file.frameWidth, file.frameHeight)
                  ctx.restore()
                }
              }
              ctx.save()
              ctx.translate(x, y - sliceOffset * sliceDistance * zoom)
              ctx.translate(filePositions[file.id].x, filePositions[file.id].y)
              ctx.scale(zoom, zoom)
              ctx.rotate((rotation * Math.PI) / 180)

              if (automaticShading) {
                // FIXME: Adjust this math to use configurable min/max values.
                // FIXME: This is not affected by multiple stacks!!!
                let shade = 128 + Math.min(255, 128 * (sliceIndex / frame.slices.length))
                ctx.filter = `brightness(${minShade + (1 - minShade) * (shade / 255)})`
              }

              ctx.drawImage(file.canvas.canvas, slice.x, slice.y, file.frameWidth, file.frameHeight, -file.frameWidth / 2, -file.frameHeight / 2, file.frameWidth, file.frameHeight)
              ctx.restore()
              y -= 1 * sliceDistance * zoom
            }
            sliceOffset += frame.slices.length
          }
          y = canvas.height / 2
        }
      }
    }
  }

  function hitsFile(x: number, y: number): number {
    x /= zoom
    y /= zoom
    x -= canvas.width / 2
    y -= canvas.height / 2
    for (let file of $fileStates.files) {
      if (!visibleFiles[file.id]?.visible) continue
      let x1 = filePositions[file.id].x - (file.frameWidth / 2) * zoom
      let x2 = filePositions[file.id].x + (file.frameWidth / 2) * zoom
      let y1 = filePositions[file.id].y - (file.frameHeight / 2) * zoom
      let y2 = filePositions[file.id].y + (file.frameHeight / 2) * zoom
      if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
        return file.id
      }
    }
    return -1
  }

  function mousedown(e: MouseEvent) {
    let fileId = hitsFile(e.offsetX, e.offsetY)
    if (fileId === -1) return
    filePositions[fileId].z = Object.values(filePositions).reduce((acc, val) => Math.max(acc, val.z), 0) + 1

    let mouseup = (e: MouseEvent) => {
      window.removeEventListener('mouseup', mouseup)
      window.removeEventListener('mousemove', mousemove)
    }
    let mousemove = (e: MouseEvent) => {
      filePositions[fileId].x = e.offsetX - canvas.width / 2
      filePositions[fileId].y = e.offsetY - canvas.height / 2
    }
    window.addEventListener('mouseup', mouseup)
    window.addEventListener('mousemove', mousemove)
  }
  function mousewheel(e: WheelEvent) {
    if (e.ctrlKey) {
      if (e.deltaY > 0) {
        zoom /= 2
      } else {
        zoom *= 2
      }
    } else {
      if (e.deltaY > 0) {
        rotation++
      } else {
        rotation--
      }
    }
  }

  function toggleFile(file: LoadedFile, i: number, e: any) {
    visibleFiles[file.id] = visibleFiles[file.id] || { visible: e.target.checked, stacks: {} }
    visibleFiles[file.id].visible = e.target.checked
    for (let stack of file.stacks) {
      visibleFiles[file.id].stacks[stack.name] = visibleFiles[file.id].stacks[stack.name] || { visible: e.target.checked, animation: stack.animations[0]?.name, frameIndex: 0, orderIndex: 0 }
      visibleFiles[file.id].stacks[stack.name].visible = e.target.checked
    }
    visibleFiles = { ...visibleFiles }
    timeElapsed = 0 // Reset time on change
  }

  function toggleStack(file: LoadedFile, stack: StaxStack, e: any) {
    if (!visibleFiles[file.id]) visibleFiles[file.id] = { visible: true, stacks: {} }
    visibleFiles[file.id].stacks[stack.name] = visibleFiles[file.id].stacks[stack.name] || { visible: e.target.checked, animation: stack.animations[0]?.name, frameIndex: 0, orderIndex: 0 }
    visibleFiles[file.id].stacks[stack.name].visible = e.target.checked

    visibleFiles[file.id].stacks[stack.name].orderIndex = Object.values(visibleFiles[file.id].stacks).reduce((acc, val) => Math.max(acc, val.orderIndex), 0) + 1

    visibleFiles = { ...visibleFiles }
    timeElapsed = 0 // Reset time on change
  }

  function isFileIndeterminate(file: LoadedFile) {
    let visible = visibleFiles[file.id]?.visible
    let stackCount = 0
    let visibleStackCount = 0
    for (let stack of file.stacks) {
      stackCount++
      if (visibleFiles[file.id]?.stacks[stack.name]) {
        visibleStackCount++
      }
    }
    return (visible && visibleStackCount !== stackCount) || (!visible && visibleStackCount === 0)
  }
  function changeStackAnimation(file: LoadedFile, stack: StaxStack, e: any) {
    if (!visibleFiles[file.id]) visibleFiles[file.id] = { visible: true, stacks: {} }
    visibleFiles[file.id].stacks[stack.name] = visibleFiles[file.id].stacks[stack.name] || { visible: true, animation: stack.animations[0]?.name, frameIndex: 0, orderIndex: 0 }
    visibleFiles[file.id].stacks[stack.name].animation = e.detail.selectedId
    visibleFiles = { ...visibleFiles }
    timeElapsed = 0 // Reset time on change
  }
  function setStackStart(file: LoadedFile, stack: StaxStack, e: any) {
    if (!visibleFiles[file.id]) visibleFiles[file.id] = { visible: true, stacks: {} }
    visibleFiles[file.id].stacks[stack.name] = visibleFiles[file.id].stacks[stack.name] || { visible: true, animation: stack.animations[0]?.name, frameIndex: 0, orderIndex: 0 }
    if (e.detail < 0) e.detail = 0
    if (e.detail > stack.animations[0].frames[0].slices.length) e.detail = stack.animations[0].frames[0].slices.length
    visibleFiles[file.id].stacks[stack.name].sliceStart = e.detail
    visibleFiles = { ...visibleFiles }
  }
  function setStackEnd(file: LoadedFile, stack: StaxStack, e: any) {
    if (!visibleFiles[file.id]) visibleFiles[file.id] = { visible: true, stacks: {} }
    visibleFiles[file.id].stacks[stack.name] = visibleFiles[file.id].stacks[stack.name] || { visible: true, animation: stack.animations[0]?.name, frameIndex: 0, orderIndex: 0 }
    if (e.detail < 0) e.detail = 0
    if (e.detail > stack.animations[0].frames[0].slices.length) e.detail = stack.animations[0].frames[0].slices.length
    visibleFiles[file.id].stacks[stack.name].sliceEnd = e.detail
    visibleFiles = { ...visibleFiles }
  }
  function setStackFrameStart(file: LoadedFile, stack: StaxStack, e: any) {
    if (!visibleFiles[file.id]) visibleFiles[file.id] = { visible: true, stacks: {} }
    visibleFiles[file.id].stacks[stack.name] = visibleFiles[file.id].stacks[stack.name] || { visible: true, animation: stack.animations[0]?.name, frameIndex: 0, orderIndex: 0 }
    const frameCount = stack.animations.find((v) => v.name === visibleFiles[file.id].stacks[stack.name].animation)?.frames.length ?? 0
    visibleFiles[file.id].stacks[stack.name].frameStart = e.detail < 0 ? 0 : e.detail > frameCount ? frameCount : e.detail
    visibleFiles = { ...visibleFiles }
  }
  function setStackFrameEnd(file: LoadedFile, stack: StaxStack, e: any) {
    if (!visibleFiles[file.id]) visibleFiles[file.id] = { visible: true, stacks: {} }
    visibleFiles[file.id].stacks[stack.name] = visibleFiles[file.id].stacks[stack.name] || { visible: true, animation: stack.animations[0]?.name, frameIndex: 0, orderIndex: 0 }
    const frameCount = stack.animations.find((v) => v.name === visibleFiles[file.id].stacks[stack.name].animation)?.frames.length ?? 0
    visibleFiles[file.id].stacks[stack.name].frameEnd = e.detail < 0 ? 0 : e.detail > frameCount ? frameCount : e.detail
    visibleFiles = { ...visibleFiles }
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

<main class:shronked>
  {#if !shronked}
    <section class="settings">
      {#each $fileStates.files as file, i}
        <fieldset>
          <legend>
            <Checkbox on:change={(e) => toggleFile(file, i, e)} checked={visibleFiles[file.id]?.visible} indeterminate={isFileIndeterminate(file)} labelText={file.title.length > 20 ? '…' + file.title.substring(file.title.length - 20) : file.title}></Checkbox>
          </legend>
          {#each file.stacks as stack, stackIndex}
            {@const stackState = visibleFiles[file.id]?.stacks[stack.name] || { visible: false, animation: '', frameIndex: 0, orderIndex: 0 }}
            <article class="stack">
              <div class="subcheck">
                <Checkbox on:change={(e) => toggleStack(file, stack, e)} checked={stackState.visible} labelText={stack.name.length > 20 ? '…' + stack.name.substring(stack.name.length - 20) : stack.name}></Checkbox>
                {#if stackState.visible}
                  <Dropdown on:select={(e) => changeStackAnimation(file, stack, e)} selectedId={stackState.animation} items={stack.animations.map((animation) => ({ id: animation.name, text: animation.name }))}></Dropdown>
                  <div class="spinner">
                    <span>Frames</span>
                    <Input type="number" size="small" width={4} showSpinner on:change={(e) => setStackFrameStart(file, stack, e)} value={stackState.frameStart || 0}></Input>
                    →
                    <Input type="number" size="small" width={4} showSpinner on:change={(e) => setStackFrameEnd(file, stack, e)} value={stackState.frameEnd || stack.animations.find((v) => v.name === stackState.animation)?.frames.length}></Input>
                  </div>
                  <div class="spinner">
                    <span>Slices</span>
                    <Input type="number" size="small" width={4} showSpinner on:change={(e) => setStackStart(file, stack, e)} value={visibleFiles[file.id]?.stacks[stack.name]?.sliceStart || 0}></Input>
                    →
                    <Input type="number" size="small" width={4} showSpinner on:change={(e) => setStackEnd(file, stack, e)} value={visibleFiles[file.id]?.stacks[stack.name]?.sliceEnd || stack.animations[0].frames[0].slices.length}></Input>
                  </div>
                {/if}
              </div>
            </article>
          {/each}
        </fieldset>
      {/each}
      <Button on:click={record} icon={recording ? StopFilledAlt : RecordingFilled} size="large" />
    </section>
  {/if}
  <section class="canvasGroup">
    <canvas bind:this={canvas} on:mousedown={mousedown} on:mousewheel={mousewheel}></canvas>
    {#if !shronked}
      <Slider labelText="Global Zoom" min={1} max={10} step={1} bind:value={zoom} fullWidth></Slider>
      <Slider labelText="Global Rotation" min={0} max={360} step={1} bind:value={rotation} fullWidth></Slider>
      <Slider labelText="Global Slice Distance" min={0} max={2} step={0.1} bind:value={sliceDistance} fullWidth></Slider>
      <Checkbox bind:checked={automaticShading} labelText="Automatic Shading"></Checkbox>
    {/if}
  </section>
</main>

<style>
  main {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    height: 100%;
  }
  main.shronked {
    grid-template-columns: minmax(0, 1fr);
  }
  fieldset {
    margin: var(--cds-spacing-03);
    background: var(--cds-background);
  }
  .stack {
    padding: 1rem;
  }
  .canvasGroup {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto auto auto auto;
    grid-template-columns: minmax(0, 1fr);
    background: var(--cds-background);
    padding: var(--cds-spacing-03);
  }
  canvas {
    width: 100%;
    height: 100%;
  }
  .spinner {
    display: flex;
  }
  .spinner span {
    font-size: var(--cds-label-01-font-size, 0.75rem);
    color: var(--cds-text-02, #525252);
  }
</style>
