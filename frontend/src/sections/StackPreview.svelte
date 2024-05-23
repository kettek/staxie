<!--
  @component
  
  This component provides a sprite stack view of a file.
-->
<script lang='ts'>
  import { Grid, Row, Column, Checkbox, Slider, Dropdown } from "carbon-components-svelte"
  import { fileStates } from "../stores/file"
  import { onMount } from "svelte";
  
  type GroupState = {
    visible: boolean
    animation: string
    frameIndex: number
  }
  type VisibleState = {
    visible: boolean
    groups: Record<string, GroupState>
  }
  let visibleFiles: Record<number, VisibleState> = {}
  
  let filePositions: Record<number, {x: number, y: number, z: number}> = {}
  $: {
    for (let file of $fileStates) {
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
  
  export let baseSizeOutlineColor: string = '#00FFFF77'
  export let showBaseSizeOutline: boolean = true
  export let sizeOutlineColor: string = '#FFFF0077'
  export let showSizeOutline: boolean = true
  
  let canvas: HTMLCanvasElement
  function draw() {
    if (!canvas) return
    
    let computedSize = getComputedStyle(canvas)
    if (canvas.width !== parseInt(computedSize.width) || canvas.height !== parseInt(computedSize.height)) {
      canvas.width = parseInt(computedSize.width)
      canvas.height = parseInt(computedSize.height)
    }

    let ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#222222'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.imageSmoothingEnabled = false
    
    let x = canvas.width/2
    let y = canvas.height/2
    let sortedFiles = $fileStates.filter(file => visibleFiles[file.id]).sort((a, b) => filePositions[a.id].z - filePositions[b.id].z)
    for (let file of sortedFiles) {
      if (visibleFiles[file.id]?.visible) {
        // For now, just get the first frame of the first animation.
        for (let group of file.groups) {
          let done = false
          if (!visibleFiles[file.id]?.groups[group.name]?.visible) continue
          for (let animation of group.animations) {
            for (let frame of animation.frames) {
              for (let sliceIndex = 0; sliceIndex < frame.slices.length; sliceIndex++) {
                let slice = frame.slices[sliceIndex]
                if (sliceIndex === 0) {
                  if (showBaseSizeOutline) {
                    ctx.save()
                    ctx.translate(x, y)
                    ctx.translate(filePositions[file.id].x, filePositions[file.id].y)
                    ctx.scale(zoom, zoom)
                    ctx.strokeStyle = baseSizeOutlineColor
                    ctx.lineWidth = 1 / zoom
                    ctx.strokeRect(-file.frameWidth/2, -file.frameHeight/2, file.frameWidth, file.frameHeight)
                    ctx.restore()
                  }
                  if (showSizeOutline) {
                    ctx.save()
                    ctx.translate(x, y)
                    ctx.translate(filePositions[file.id].x, filePositions[file.id].y)
                    ctx.scale(zoom, zoom)
                    ctx.rotate(rotation * Math.PI / 180)
                    ctx.strokeStyle = sizeOutlineColor
                    ctx.lineWidth = 1 / zoom
                    ctx.strokeRect(-file.frameWidth/2, -file.frameHeight/2, file.frameWidth, file.frameHeight)
                    ctx.restore()
                  }
                }
                ctx.save()
                ctx.translate(x, y)
                ctx.translate(filePositions[file.id].x, filePositions[file.id].y)
                ctx.scale(zoom, zoom)
                ctx.rotate(rotation * Math.PI / 180)
                
                if (automaticShading) {
                  // FIXME: Adjust this math to use configurable min/max values.
                  let shade = 128 + Math.min(255, 128 * (sliceIndex / frame.slices.length))
                  ctx.filter = `brightness(${minShade + (1-minShade) * (shade/255)})`
                }

                ctx.drawImage(file.canvas.canvas, slice.x, slice.y, file.frameWidth, file.frameHeight, -file.frameWidth/2, -file.frameHeight/2, file.frameWidth, file.frameHeight)
                ctx.restore()
                y -= 1 * sliceDistance * zoom
              }
              done = true
              if (done) break
            }
            if (done) break
          }
          y = canvas.height/2
        }
      }
    }
  }
  
  function hitsFile(x: number, y: number): number {
    x *= zoom
    y *= zoom
    for (let file of $fileStates) {
      if (!visibleFiles[file.id]?.visible) continue
      let px = canvas.width/2
      let py = canvas.height/2
      px += filePositions[file.id].x
      py += filePositions[file.id].y
      px -= file.data.width/2
      py -= file.data.height/2
      px *= zoom
      py *= zoom
      if (x >= px && x <= px + file.data.width*zoom && y >= py && y <= py + file.data.height*zoom) {
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
  
  function toggleFile(file, i, e) {
    visibleFiles[file.id] = visibleFiles[file.id] || {visible: e.target.checked, groups: {}}
    visibleFiles[file.id].visible = e.target.checked
    for (let group of file.groups) {
      visibleFiles[file.id].groups[group.name] = visibleFiles[file.id].groups[group.name] || {visible: e.target.checked, animation: group.animations[0]?.name, frameIndex: 0}
      visibleFiles[file.id].groups[group.name].visible = e.target.checked
    }
    visibleFiles = {...visibleFiles}
  }
  
  function toggleGroup(file, group, e) {
    if (!visibleFiles[file.id]) visibleFiles[file.id] = {visible: true, groups: {}}
    visibleFiles[file.id].groups[group.name] = visibleFiles[file.id].groups[group.name] || {visible: e.target.checked, animation: group.animations[0]?.name, frameIndex: 0}
    visibleFiles[file.id].groups[group.name].visible = e.target.checked
    visibleFiles = {...visibleFiles}
  }
  
  function isFileIndeterminate(file) {
    let visible = visibleFiles[file.id]?.visible
    let groupCount = 0
    let visibleGroupCount = 0
    for (let group of file.groups) {
      groupCount++
      if (visibleFiles[file.id]?.groups[group.name]) {
        visibleGroupCount++
      }
    }
    return (visible && visibleGroupCount !== groupCount) || (!visible && visibleGroupCount === 0)
  }
  function changeGroupAnimation(file, group, e) {
    if (!visibleFiles[file.id]) visibleFiles[file.id] = {visible: true, groups: {}}
    visibleFiles[file.id].groups[group.name] = visibleFiles[file.id].groups[group.name] || {visible: true, animation: group.animations[0]?.name, frameIndex: 0}
    visibleFiles[file.id].groups[group.name].animation = e.detail.selectedId
    visibleFiles = {...visibleFiles}
  }
  
  onMount(()=>{
    let frameID: number = 0
    let frameDraw = () => {
      draw()
      frameID = requestAnimationFrame(frameDraw)
    }
    frameID = requestAnimationFrame(frameDraw)
    return () => cancelAnimationFrame(frameID)
  })
</script>

<Grid narrow condensed fullWidth>
  <Row narrow condensed>
    <Column sm>
      {#each $fileStates as file, i}
        <Checkbox on:change={(e)=>toggleFile(file, i, e)} checked={visibleFiles[file.id]?.visible} indeterminate={isFileIndeterminate(file)} labelText={file.title.length>20?'…'+file.title.substring(file.title.length-20):file.title}></Checkbox>
        {#each file.groups as group, groupIndex}
          <div class='subcheck'>
            <Checkbox on:change={(e)=>toggleGroup(file, group, e)} checked={visibleFiles[file.id]?.groups[group.name]?.visible} labelText={group.name.length>20?'…'+group.name.substring(group.name.length-20):group.name}></Checkbox>
            <Dropdown on:select={(e)=>changeGroupAnimation(file, group, e)} selectedId={visibleFiles[file.id]?.groups[group.name]?.animation} items={group.animations.map(animation => ({id: animation.name, text: animation.name}))}></Dropdown>
          </div>
        {/each}
      {/each}
    </Column>
    <Column>
      <canvas bind:this={canvas} on:mousedown={mousedown}></canvas>
      <Slider labelText="Global Zoom" min={1} max={10} step={1} bind:value={zoom} fullWidth></Slider>
      <Slider labelText="Global Rotation" min={0} max={360} step={1} bind:value={rotation} fullWidth></Slider>
      <Slider labelText="Global Slice Distance" min={0} max={2} step={0.1} bind:value={sliceDistance} fullWidth></Slider>
      <Checkbox bind:checked={automaticShading} labelText="Automatic Shading"></Checkbox>
    </Column>
  </Row>
</Grid>

<style>
  .subcheck {
    margin-left: 1em;
  }
</style>