<!--
  @component
  
  This component provides a method for rendering out the current animation.
-->
<script lang="ts">
  import { Column, Grid, Row } from 'carbon-components-svelte'
  import { GetFileSavePath, SaveFileBytes, SaveFilePath } from '../../wailsjs/go/main/App'
  import type { LoadedFile } from '../types/file'
  import { encode as encodeGIF } from 'modern-gif'
  import { renderSettings } from '../stores/render'
  import Button from '../components/common/Button.svelte'
  import Input from '../components/common/Input.svelte'

  export let file: LoadedFile

  let format: 'gif' | 'png' | 'webm' = 'gif'

  let path: string = ''
  let handle: any

  async function getOutput() {
    path = ''
    if ((window as any)['go']) {
      path = await GetFileSavePath(['GIF'], ['*.gif'])
    } else {
      if ((window as any).showSaveFilePicker) {
        handle = await (window as any).showSaveFilePicker({
          types: [
            {
              description: 'GIF',
              accept: {
                'image/gif': ['.gif'],
              },
            },
          ],
        })
        path = handle.name
      }
    }
    if (!path) throw new Error('No path')
  }

  async function write(buffer: ArrayBuffer) {
    if (!path) return
    if ((window as any)['go']) {
      SaveFileBytes(path, [...new Uint8Array(buffer)])
    } else {
      if ((window as any).showSaveFilePicker) {
        const writable = await handle.createWritable()
        await writable.write(new Blob([buffer], { type: 'image/gif' }))
        await writable.close()
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(new Blob([buffer], { type: 'image/gif' }))
        a.download = file.filepath
        a.click()
      }
    }
  }

  async function render() {
    if (!file || !file.animation || !file.frame) return

    const frameWidth = file.frameWidth * $renderSettings.zoom
    const frameHeight = file.frameHeight * $renderSettings.zoom
    const minWidth = frameWidth
    const minHeight = frameHeight + (file.stack?.sliceCount ?? 0) * $renderSettings.sliceDistance * $renderSettings.zoom
    const size = Math.max(minWidth, minHeight)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const frameCount = Math.round(360 / $renderSettings.angleSteps)

    try {
      await getOutput()
    } catch (e) {
      console.error(e)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = $renderSettings.backgroundColor
    let frames: { data: ArrayBufferLike; delay: number }[] = []

    const sliceDistanceEnd = Math.max(1, $renderSettings.interpolateSlices ? $renderSettings.sliceDistance * $renderSettings.zoom : 1)
    const sliceStep = Math.max(1, $renderSettings.interpolateSlices ? 1 : $renderSettings.sliceDistance * $renderSettings.zoom)

    for (let i = $renderSettings.angleOffset; i < 360 + $renderSettings.angleOffset; i += $renderSettings.angleSteps) {
      ctx.fillRect(0, 0, size, size)
      let y = file.frame.slices.length * $renderSettings.sliceDistance * $renderSettings.zoom
      for (let sliceIndex = 0; sliceIndex < file.frame.slices.length; sliceIndex++) {
        const slice = file.frame.slices[sliceIndex]

        for (let step = 0; step < sliceDistanceEnd; step += sliceStep) {
          ctx.save()

          ctx.translate(minWidth / 2, 0)

          ctx.translate(0, y - step)
          ctx.translate(frameWidth / 2, frameHeight / 2)
          ctx.rotate(((i * Math.PI) / 180) * ($renderSettings.clockwise ? 1 : -1))
          ctx.translate(-frameWidth / 2, -frameHeight / 2)

          if ($renderSettings.automaticShading) {
            let shade = 128 + Math.min(255, 128 * (sliceIndex / file.frame.slices.length))
            ctx.filter = `brightness(${$renderSettings.minShade + $renderSettings.minShade * (shade / 255)})`
          }

          ctx.drawImage(file.canvas.canvas, slice.x, slice.y, file.frameWidth, file.frameHeight, 0, 0, frameWidth, frameHeight)

          ctx.restore()
        }
        y -= $renderSettings.sliceDistance * $renderSettings.zoom
      }
      frames = [...frames, { data: ctx.getImageData(0, 0, size, size).data.buffer, delay: $renderSettings.delay }]
    }

    const buffer = await encodeGIF({
      width: size,
      height: size,
      frames: frames,
    })

    await write(buffer)
  }
</script>

<main>
  <Grid>
    <Column>
      <Row>
        <Input noPadding labelWidth="8" label="Delay (ms)" type="number" bind:value={$renderSettings.delay} />
      </Row>
      <Row>
        <Input noPadding labelWidth="8" label="Angle Steps" type="number" bind:value={$renderSettings.angleSteps} />
      </Row>
      <Row>
        <Input noPadding labelWidth="8" label="Clockwise" type="checkbox" bind:checked={$renderSettings.clockwise} />
      </Row>
      <Row>
        <Input noPadding labelWidth="8" label="Angle Offset" type="number" bind:value={$renderSettings.angleOffset} />
      </Row>
      <Row>
        <Input noPadding labelWidth="8" label="Zoom" type="number" bind:value={$renderSettings.zoom} />
      </Row>
      <Row>
        <Input noPadding labelWidth="8" label="Automatic Shading" type="checkbox" bind:checked={$renderSettings.automaticShading} />
      </Row>
      <Row>
        <Input noPadding labelWidth="8" label="Min Shade" type="number" bind:value={$renderSettings.minShade} />
      </Row>
      <Row>
        <Input noPadding labelWidth="8" label="Slice Distance" type="number" bind:value={$renderSettings.sliceDistance} />
      </Row>
      <Row>
        <Input noPadding labelWidth="8" label="Interpolate Slices" type="checkbox" bind:checked={$renderSettings.interpolateSlices} />
      </Row>
      <Row>
        <Input noPadding labelWidth="8" label="Background Color" type="color" bind:value={$renderSettings.backgroundColor} />
        <Input noPadding type="text" bind:value={$renderSettings.backgroundColor} />
      </Row>
      <Row>
        <Button on:click={render}>Render</Button>
      </Row>
    </Column>
  </Grid>
</main>
