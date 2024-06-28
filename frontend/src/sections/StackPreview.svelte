<!--
  @component
  
  This component provides a sprite stack view of a file.
-->
<script lang='ts'>
  import { Grid, Row, Column, Checkbox, Slider, Dropdown } from "carbon-components-svelte"
  import { fileStates } from "../stores/file"
  import { onMount } from "svelte"
  import { previewSettings } from '../stores/preview'
  import type { LoadedFile } from "../types/file"
  import type { StaxStack } from "../types/png"
  
  type StackState = {
    visible: boolean
    animation: string
    frameIndex: number
    orderIndex: number
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
  
  let filePositions: Record<number, {x: number, y: number, z: number}> = {}
  $: {
    for (let file of $fileStates.files) {
      if (visibleFiles[file.id] && !filePositions[file.id]) {
        filePositions[file.id] = {x: 0, y: 0, z: 0}
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
  
  let canvas: HTMLCanvasElement
  function draw(ts: DOMHighResTimeStamp) {
    if (!canvas) return
    timeElapsed += (ts - lastTime)
    lastTime = ts
    
    let computedSize = getComputedStyle(canvas)
    if (canvas.width !== parseInt(computedSize.width) || canvas.height !== parseInt(computedSize.height)) {
      canvas.width = parseInt(computedSize.width)
      canvas.height = parseInt(computedSize.height)
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
    
    let x = canvas.width/2
    let y = canvas.height/2
    let sortedFiles = $fileStates.files.filter(file => visibleFiles[file.id]).sort((a, b) => filePositions[a.id].z - filePositions[b.id].z)
    for (let file of sortedFiles) {
      if (visibleFiles[file.id]?.visible) {
        let sortedStacks = visibleFiles[file.id].stacks ? file.stacks.filter(stack => visibleFiles[file.id].stacks[stack.name]?.visible).sort((a, b) => visibleFiles[file.id].stacks[a.name].orderIndex - visibleFiles[file.id].stacks[b.name].orderIndex) : []
        let sliceOffset = 0
        for (let stack of sortedStacks) {
          let done = false
          if (!visibleFiles[file.id]?.stacks[stack.name]?.visible) continue
          let animation = stack.animations.find(animation => animation.name === visibleFiles[file.id].stacks[stack.name].animation)
          if (animation) {
            let frameIndex = Math.floor(timeElapsed / animation.frameTime) % animation.frames.length
            let frame = animation.frames[frameIndex]
            for (let sliceIndex = 0; sliceIndex < frame.slices.length; sliceIndex++) {
              let slice = frame.slices[sliceIndex]
              if (sliceIndex === 0) {
                if ($previewSettings.showBaseSizeOutline) {
                  ctx.save()
                  ctx.translate(x, y)
                  ctx.translate(filePositions[file.id].x, filePositions[file.id].y)
                  ctx.scale(zoom, zoom)
                  ctx.strokeStyle = $previewSettings.baseSizeOutlineColor
                  ctx.lineWidth = 1 / zoom
                  ctx.strokeRect(-file.frameWidth/2, -file.frameHeight/2, file.frameWidth, file.frameHeight)
                  ctx.restore()
                }
                if ($previewSettings.showSizeOutline) {
                  ctx.save()
                  ctx.translate(x, y)
                  ctx.translate(filePositions[file.id].x, filePositions[file.id].y)
                  ctx.scale(zoom, zoom)
                  ctx.rotate(rotation * Math.PI / 180)
                  ctx.strokeStyle = $previewSettings.sizeOutlineColor
                  ctx.lineWidth = 1 / zoom
                  ctx.strokeRect(-file.frameWidth/2, -file.frameHeight/2, file.frameWidth, file.frameHeight)
                  ctx.restore()
                }
              }
              ctx.save()
              ctx.translate(x, y-(sliceOffset * sliceDistance * zoom))
              ctx.translate(filePositions[file.id].x, filePositions[file.id].y)
              ctx.scale(zoom, zoom)
              ctx.rotate(rotation * Math.PI / 180)
              
              if (automaticShading) {
                // FIXME: Adjust this math to use configurable min/max values.
                // FIXME: This is not affected by multiple stacks!!!
                let shade = 128 + Math.min(255, 128 * (sliceIndex / frame.slices.length))
                ctx.filter = `brightness(${minShade + (1-minShade) * (shade/255)})`
              }

              ctx.drawImage(file.canvas.canvas, slice.x, slice.y, file.frameWidth, file.frameHeight, -file.frameWidth/2, -file.frameHeight/2, file.frameWidth, file.frameHeight)
              ctx.restore()
              y -= 1 * sliceDistance * zoom
            }
            sliceOffset += frame.slices.length
          }
          y = canvas.height/2
        }
      }
    }
  }
  
  function hitsFile(x: number, y: number): number {
    x /= zoom
    y /= zoom
    x -= canvas.width/2
    y -= canvas.height/2
    for (let file of $fileStates.files) {
      if (!visibleFiles[file.id]?.visible) continue
      let x1 = filePositions[file.id].x - (file.frameWidth/2*zoom)
      let x2 = filePositions[file.id].x + (file.frameWidth/2*zoom)
      let y1 = filePositions[file.id].y - (file.frameHeight/2*zoom)
      let y2 = filePositions[file.id].y + (file.frameHeight/2*zoom)
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
      filePositions[fileId].x = e.offsetX - canvas.width/2
      filePositions[fileId].y = e.offsetY - canvas.height/2
    }
    window.addEventListener('mouseup', mouseup)
    window.addEventListener('mousemove', mousemove)
  }
  
  function toggleFile(file: LoadedFile, i: number, e: any) {
    visibleFiles[file.id] = visibleFiles[file.id] || {visible: e.target.checked, stacks: {}}
    visibleFiles[file.id].visible = e.target.checked
    for (let stack of file.stacks) {
      visibleFiles[file.id].stacks[stack.name] = visibleFiles[file.id].stacks[stack.name] || {visible: e.target.checked, animation: stack.animations[0]?.name, frameIndex: 0, orderIndex: 0}
      visibleFiles[file.id].stacks[stack.name].visible = e.target.checked
    }
    visibleFiles = {...visibleFiles}
    timeElapsed = 0 // Reset time on change
  }
  
  function toggleStack(file: LoadedFile, stack: StaxStack, e: any) {
    if (!visibleFiles[file.id]) visibleFiles[file.id] = {visible: true, stacks: {}}
    visibleFiles[file.id].stacks[stack.name] = visibleFiles[file.id].stacks[stack.name] || {visible: e.target.checked, animation: stack.animations[0]?.name, frameIndex: 0, orderIndex: 0}
    visibleFiles[file.id].stacks[stack.name].visible = e.target.checked

    visibleFiles[file.id].stacks[stack.name].orderIndex = Object.values(visibleFiles[file.id].stacks).reduce((acc, val) => Math.max(acc, val.orderIndex), 0) + 1

    visibleFiles = {...visibleFiles}
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
    if (!visibleFiles[file.id]) visibleFiles[file.id] = {visible: true, stacks: {}}
    visibleFiles[file.id].stacks[stack.name] = visibleFiles[file.id].stacks[stack.name] || {visible: true, animation: stack.animations[0]?.name, frameIndex: 0, orderIndex: 0}
    visibleFiles[file.id].stacks[stack.name].animation = e.detail.selectedId
    visibleFiles = {...visibleFiles}
    timeElapsed = 0 // Reset time on change
  }
  
  onMount(()=>{
    let frameID: number = 0
    let frameDraw = (ts: DOMHighResTimeStamp) => {
      draw(ts)
      frameID = requestAnimationFrame(frameDraw)
    }
    frameID = requestAnimationFrame(frameDraw)
    return () => cancelAnimationFrame(frameID)
  })
</script>

<Grid narrow condensed fullWidth>
  <Row narrow condensed>
    {#if !shronked}
      <Column sm>
        {#each $fileStates.files as file, i}
          <Checkbox on:change={(e)=>toggleFile(file, i, e)} checked={visibleFiles[file.id]?.visible} indeterminate={isFileIndeterminate(file)} labelText={file.title.length>20?'…'+file.title.substring(file.title.length-20):file.title}></Checkbox>
          {#each file.stacks as stack, stackIndex}
            <div class='subcheck'>
              <Checkbox on:change={(e)=>toggleStack(file, stack, e)} checked={visibleFiles[file.id]?.stacks[stack.name]?.visible} labelText={stack.name.length>20?'…'+stack.name.substring(stack.name.length-20):stack.name}></Checkbox>
              <Dropdown on:select={(e)=>changeStackAnimation(file, stack, e)} selectedId={visibleFiles[file.id]?.stacks[stack.name]?.animation} items={stack.animations.map(animation => ({id: animation.name, text: animation.name}))}></Dropdown>
            </div>
          {/each}
        {/each}
      </Column>
    {/if}
    <Column>
      <canvas bind:this={canvas} on:mousedown={mousedown}></canvas>
      {#if !shronked}
        <Slider labelText="Global Zoom" min={1} max={10} step={1} bind:value={zoom} fullWidth></Slider>
        <Slider labelText="Global Rotation" min={0} max={360} step={1} bind:value={rotation} fullWidth></Slider>
        <Slider labelText="Global Slice Distance" min={0} max={2} step={0.1} bind:value={sliceDistance} fullWidth></Slider>
        <Checkbox bind:checked={automaticShading} labelText="Automatic Shading"></Checkbox>
      {/if}
    </Column>
  </Row>
</Grid>

<style>
  .subcheck {
    margin-left: 1em;
  }
</style>