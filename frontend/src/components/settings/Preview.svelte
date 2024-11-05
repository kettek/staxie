<script lang="ts">
  import { Checkbox, Column, Grid, Modal, Row, TextInput, FileUploaderButton, NumberInput } from 'carbon-components-svelte'
  import { previewSettings } from '../../stores/preview'
  import Input from '../common/Input.svelte'

  function onBackgroundImage(event) {
    let file = event.detail[0] as File
    file.arrayBuffer().then((buffer) => {
      let blob = new Blob([buffer], { type: file.type })
      let url = URL.createObjectURL(blob)
      $previewSettings.background = url
      console.log(url)
    })
  }
</script>

<Grid narrow condensed fullWidth>
  <Column>
    <Row>
      <Input labelWidth="10" id="background" type="text" label="Background Color" bind:value={$previewSettings.background} />
      <FileUploaderButton labelText="Background Image" id="backgroundImage" size="small" accept={['image/*']} on:change={onBackgroundImage} />
      {#if $previewSettings.background.startsWith('blob:')}
        <img src={$previewSettings.background} alt="Background" style="width: 64px; height: 64px" />
      {/if}
    </Row>
    <Row>
      <Input labelWidth="10" id="showBaseSizeOutline" type="checkbox" label="Show Base Size Outline" bind:checked={$previewSettings.showBaseSizeOutline} />
    </Row>
    <Row>
      <Input labelWidth="10" id="baseSizeOutlineColor" type="color" label="Base Size Outline Color" bind:value={$previewSettings.baseSizeOutlineColor} />
    </Row>
    <Row>
      <Input labelWidth="10" id="showSizeOutline" type="checkbox" label="Show Size Outline" bind:checked={$previewSettings.showSizeOutline} />
    </Row>
    <Row>
      <Input labelWidth="10" id="sizeOutlineColor" type="color" label="Size Outline Color" bind:value={$previewSettings.sizeOutlineColor} />
    </Row>
    <Row>
      <Input labelWidth="10" id="useCanvasSize" type="checkbox" label="Force Canvas Size" bind:checked={$previewSettings.useCanvasSize} />
    </Row>
    <Row>
      <Input labelWidth="10" id="canvasWidth" type="number" label="Canvas Width" bind:value={$previewSettings.canvasWidth} />
      <Input labelWidth="10" id="canvasHeight" type="number" label="Canvas Height" bind:value={$previewSettings.canvasHeight} />
    </Row>
    <Row>
      <Input labelWidth="10" id="secondsBetweenFrames" type="number" label="Seconds Between Frames" bind:value={$previewSettings.secondsBetweenFrames} min={0} step={0.5} />
    </Row>
    <Row>
      <Input labelWidth="10" id="framePrefix" type="text" label="Frame Prefix" bind:value={$previewSettings.framePrefix} />
      <Input labelWidth="10" id="frameSuffix" type="text" label="Frame Suffix" bind:value={$previewSettings.frameSuffix} />
    </Row>
  </Column>
</Grid>
