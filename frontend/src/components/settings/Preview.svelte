<script lang="ts">
  import { Checkbox, Column, Grid, Modal, Row, TextInput, FileUploaderButton, NumberInput } from 'carbon-components-svelte'
  import { previewSettings, previewSettingsDefault } from '../../stores/preview'
  import Input from '../common/Input.svelte'
  import SettingsInput from '../common/SettingsInput.svelte'

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
      <SettingsInput noPadding labelWidth="10" id="background" type="text" label="Background Color" bind:value={$previewSettings.background} defaultValue={previewSettingsDefault.background} />
      <FileUploaderButton labelText="Background Image" id="backgroundImage" size="small" accept={['image/*']} on:change={onBackgroundImage} />
      {#if $previewSettings.background.startsWith('blob:')}
        <img src={$previewSettings.background} alt="Background" style="width: 64px; height: 64px" />
      {/if}
    </Row>
    <Row>
      <Input noPadding labelWidth="10" id="showBaseSizeOutline" type="checkbox" label="Show Base Size Outline" bind:checked={$previewSettings.showBaseSizeOutline} />
    </Row>
    <Row>
      <Input noPadding labelWidth="10" id="baseSizeOutlineColor" type="color" label="Base Size Outline Color" bind:value={$previewSettings.baseSizeOutlineColor} />
      <SettingsInput noPadding type="text" bind:value={$previewSettings.baseSizeOutlineColor} defaultValue={previewSettingsDefault.baseSizeOutlineColor} />
    </Row>
    <Row>
      <Input noPadding labelWidth="10" id="showSizeOutline" type="checkbox" label="Show Size Outline" bind:checked={$previewSettings.showSizeOutline} />
    </Row>
    <Row>
      <Input noPadding labelWidth="10" id="sizeOutlineColor" type="color" label="Size Outline Color" bind:value={$previewSettings.sizeOutlineColor} />
      <SettingsInput noPadding type="text" bind:value={$previewSettings.sizeOutlineColor} defaultValue={previewSettingsDefault.sizeOutlineColor} />
    </Row>
    <Row>
      <Input noPadding labelWidth="10" id="useCanvasSize" type="checkbox" label="Force Canvas Size" bind:checked={$previewSettings.useCanvasSize} />
    </Row>
    <Row>
      <SettingsInput noPadding labelWidth="10" id="canvasWidth" type="number" label="Canvas Width & Height" bind:value={$previewSettings.canvasWidth} defaultValue={previewSettingsDefault.canvasWidth} />
      <SettingsInput id="canvasHeight" type="number" bind:value={$previewSettings.canvasHeight} defaultValue={previewSettingsDefault.canvasHeight} />
    </Row>
    <Row>
      <SettingsInput noPadding labelWidth="10" id="secondsBetweenFrames" type="number" label="Seconds Between Frames" bind:value={$previewSettings.secondsBetweenFrames} min={0} step={0.5} defaultValue={previewSettingsDefault.secondsBetweenFrames} />
    </Row>
    <Row>
      <SettingsInput noPadding labelWidth="10" id="framePrefix" type="text" label="Frame Prefix & Suffix" bind:value={$previewSettings.framePrefix} defaultValue={previewSettingsDefault.framePrefix} />
      <SettingsInput id="frameSuffix" type="text" bind:value={$previewSettings.frameSuffix} defaultValue={previewSettingsDefault.frameSuffix} />
    </Row>
  </Column>
</Grid>
