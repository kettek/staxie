<!--
  @component
  
  This component provides a sprite stack view of a file.
-->
<script lang='ts'>
  import { Grid, Row, Column, Checkbox, Slider } from "carbon-components-svelte"
  import type { LoadedFile } from "src/types/file"
  import { onMount } from "svelte";
  
  export let files: LoadedFile[]
  let shownFiles: Record<string, boolean> = {}
  let filePositions: Record<string, {x: number, y: number, z: number}> = {}
  $: {
    for (let file of files) {
      if (shownFiles[file.title] && !filePositions[file.title]) {
        filePositions[file.title] = {x: 0, y: 0, z: 0}
      }
    }
  }
  
  let rotation: number = 0
  let zoom: number = 1
  let layerDistance: number = 1

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
    let sortedFiles = files.filter(file => shownFiles[file.title]).sort((a, b) => filePositions[a.title].z - filePositions[b.title].z)
    for (let file of sortedFiles) {
      if (shownFiles[file.title]) {
        // For now, just get the first frame of the first animation.
        let done = false
        for (let [groupName, group] of Object.entries(file.data.groups)) {
          for (let [animationName, animation] of Object.entries(group.animations)) {
            for (let frame of animation.frames) {
              for (let layerIndex = 0; layerIndex < frame.layers.length; layerIndex++) {
                let layer = frame.layers[layerIndex]
                if (layerIndex === 0) {
                  if (showBaseSizeOutline) {
                    ctx.save()
                    ctx.translate(x, y)
                    ctx.translate(filePositions[file.title].x, filePositions[file.title].y)
                    ctx.scale(zoom, zoom)
                    ctx.strokeStyle = baseSizeOutlineColor
                    ctx.lineWidth = 1 / zoom
                    ctx.strokeRect(-file.data.width/2, -file.data.height/2, file.data.width, file.data.height)
                    ctx.restore()
                  }
                  if (showSizeOutline) {
                    ctx.save()
                    ctx.translate(x, y)
                    ctx.translate(filePositions[file.title].x, filePositions[file.title].y)
                    ctx.scale(zoom, zoom)
                    ctx.rotate(rotation * Math.PI / 180)
                    ctx.strokeStyle = sizeOutlineColor
                    ctx.lineWidth = 1 / zoom
                    ctx.strokeRect(-file.data.width/2, -file.data.height/2, file.data.width, file.data.height)
                    ctx.restore()
                  }
                }
                ctx.save()
                ctx.translate(x, y)
                ctx.translate(filePositions[file.title].x, filePositions[file.title].y)
                ctx.scale(zoom, zoom)
                ctx.rotate(rotation * Math.PI / 180)
                
                if (automaticShading) {
                  // FIXME: Adjust this math to use configurable min/max values.
                  let shade = 128 + Math.min(255, 128 * (layerIndex / frame.layers.length))
                  ctx.filter = `brightness(${minShade + (1-minShade) * (shade/255)})`
                }

                ctx.drawImage(file.canvas.canvas, layer.x, layer.y, file.data.width, file.data.height, -file.data.width/2, -file.data.height/2, file.data.width, file.data.height)
                ctx.restore()
                y -= 1 * layerDistance * zoom
              }
              done = true
              if (done) break
            }
            if (done) break
          }
          y = canvas.height/2
          if (done) break
        }
      }
    }
  }
  
  function hitsFile(x: number, y: number): string {
    x *= zoom
    y *= zoom
    for (let file of files) {
      let name = file.title
      if (!shownFiles[name]) continue
      let px = canvas.width/2
      let py = canvas.height/2
      px += filePositions[name].x
      py += filePositions[name].y
      px -= file.data.width/2
      py -= file.data.height/2
      px *= zoom
      py *= zoom
      if (x >= px && x <= px + file.data.width*zoom && y >= py && y <= py + file.data.height*zoom) {
        return name
      }
    }
    return ""
  }
  
  function mousedown(e: MouseEvent) {
    let file = hitsFile(e.offsetX, e.offsetY)
    if (file) {
      filePositions[file].z = Object.values(filePositions).reduce((acc, val) => Math.max(acc, val.z), 0) + 1
    }

    let mouseup = (e: MouseEvent) => {
      window.removeEventListener('mouseup', mouseup)
      window.removeEventListener('mousemove', mousemove)
    }
    let mousemove = (e: MouseEvent) => {
      let file = hitsFile(e.offsetX, e.offsetY)
      if (file) {
        filePositions[file].x = e.offsetX - canvas.width/2
        filePositions[file].y = e.offsetY - canvas.height/2
      }
    }
    window.addEventListener('mouseup', mouseup)
    window.addEventListener('mousemove', mousemove)
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
      {#each files as file, i}
        <Checkbox bind:checked={shownFiles[file.title]} labelText={file.title.length>20?'…'+file.title.substring(file.title.length-20):file.title}></Checkbox>
      {/each}
    </Column>
    <Column>
      <canvas bind:this={canvas} on:mousedown={mousedown}></canvas>
      <Slider labelText="Global Zoom" min={1} max={10} step={1} bind:value={zoom} fullWidth></Slider>
      <Slider labelText="Global Rotation" min={0} max={360} step={1} bind:value={rotation} fullWidth></Slider>
      <Slider labelText="Global Layer Distance" min={0} max={2} step={0.1} bind:value={layerDistance} fullWidth></Slider>
      <Checkbox bind:checked={automaticShading} labelText="Automatic Shading"></Checkbox>
    </Column>
  </Row>
</Grid>

<style>
</style>