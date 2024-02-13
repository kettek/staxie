<script lang='ts'>
  import { Grid, Row, Column, Checkbox, Slider } from "carbon-components-svelte"
  import type { LoadedFile } from "src/types/file"
  import { onMount } from "svelte";
  
  export let files: LoadedFile[]
  let shownFiles: Record<string, boolean> = {}
  
  let rotation: number = 0
  let layerDistance: number = 1
  
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
    
    let x = canvas.width/2
    let y = canvas.height/2
    for (let file of files) {
      if (shownFiles[file.title]) {
        // For now, just get the first frame of the first animation.
        let done = false
        for (let [groupName, group] of Object.entries(file.data.groups)) {
          for (let [animationName, animation] of Object.entries(group.animations)) {
            for (let frame of animation.frames) {
              for (let layer of frame.layers) {
                ctx.save()
                ctx.translate(x, y)
                ctx.rotate(rotation * Math.PI / 180)
                ctx.drawImage(file.image, layer.x, layer.y, file.data.width, file.data.height, -file.data.width/2, -file.data.height/2, file.data.width, file.data.height)
                ctx.restore()
                y -= 1 * layerDistance
              }
              done = true
              if (done) break
            }
            if (done) break
          }
          x += file.data.width
          y = canvas.height/2
          if (done) break
        }
      }
    }
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
      <canvas bind:this={canvas}></canvas>
      <Slider labelText="Global Rotation" min={0} max={360} step={1} bind:value={rotation} fullWidth></Slider>
      <Slider labelText="Global Layer Distance" min={0} max={2} step={0.1} bind:value={layerDistance} fullWidth></Slider>
    </Column>
  </Row>
</Grid>

<style>
</style>