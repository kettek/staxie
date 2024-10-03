<!--
  @component

  This component is a modal that provides UI for changing the stack preview settings.
-->
<script lang="ts">
  import { Checkbox, Column, Grid, Modal, Row, TextInput, FileUploaderButton, NumberInput } from 'carbon-components-svelte'
  import { previewSettings } from '../stores/preview'
  import { get } from 'svelte/store'

  let previewSettingsStore = get(previewSettings)

  let pendingBackground: string = previewSettingsStore.background
  let pendingShowBaseSizeOutline: boolean = previewSettingsStore.showBaseSizeOutline
  let pendingBaseSizeOutlineColor: string = previewSettingsStore.baseSizeOutlineColor
  let pendingShowSizeOutline: boolean = previewSettingsStore.showSizeOutline
  let pendingSizeOutlineColor: string = previewSettingsStore.sizeOutlineColor
  let pendingSecondsBetweenFrames: number = previewSettingsStore.secondsBetweenFrames
  let pendingPrefix: string = previewSettingsStore.framePrefix
  let pendingSuffix: string = previewSettingsStore.frameSuffix
  let pendingUseCanvasSize: boolean = previewSettingsStore.useCanvasSize
  let pendingCanvasWidth: number = previewSettingsStore.canvasWidth
  let pendingCanvasHeight: number = previewSettingsStore.canvasHeight

  let changed: boolean = false
  $: {
    changed = $previewSettings.background !== pendingBackground || $previewSettings.showBaseSizeOutline !== pendingShowBaseSizeOutline || $previewSettings.baseSizeOutlineColor !== pendingBaseSizeOutlineColor || $previewSettings.showSizeOutline !== pendingShowSizeOutline || $previewSettings.sizeOutlineColor !== pendingSizeOutlineColor || $previewSettings.secondsBetweenFrames !== pendingSecondsBetweenFrames || $previewSettings.framePrefix !== pendingPrefix || $previewSettings.frameSuffix !== pendingSuffix || $previewSettings.useCanvasSize !== pendingUseCanvasSize || $previewSettings.canvasWidth !== pendingCanvasWidth || $previewSettings.canvasHeight !== pendingCanvasHeight
  }

  export let open: boolean = false

  function onBackgroundImage(event) {
    let file = event.detail[0] as File
    file.arrayBuffer().then((buffer) => {
      let blob = new Blob([buffer], { type: file.type })
      let url = URL.createObjectURL(blob)
      pendingBackground = url
      console.log(url)
    })
  }
</script>

<Modal
  preventCloseOnClickOutside
  bind:open
  modalHeading="Stack Preview Settings"
  primaryButtonText="Apply"
  secondaryButtonText="Cancel"
  on:close={() => (open = false)}
  on:click:button--secondary={() => (open = false)}
  on:submit={() => {
    $previewSettings.background = pendingBackground
    $previewSettings.showBaseSizeOutline = pendingShowBaseSizeOutline
    $previewSettings.baseSizeOutlineColor = pendingBaseSizeOutlineColor
    $previewSettings.showSizeOutline = pendingShowSizeOutline
    $previewSettings.sizeOutlineColor = pendingSizeOutlineColor
    $previewSettings.secondsBetweenFrames = pendingSecondsBetweenFrames
    $previewSettings.framePrefix = pendingPrefix
    $previewSettings.frameSuffix = pendingSuffix
    $previewSettings.useCanvasSize = pendingUseCanvasSize
    $previewSettings.canvasWidth = pendingCanvasWidth
    $previewSettings.canvasHeight = pendingCanvasHeight
    open = false
  }}
  primaryButtonDisabled={!changed}
>
  <Grid narrow condensed fullWidth>
    <Column>
      <Row>
        <input type="color" bind:value={pendingBackground} />
        <FileUploaderButton labelText="Background Image" id="backgroundImage" size="small" accept={['image/*']} on:change={onBackgroundImage} />
        {#if $previewSettings.background.startsWith('blob:')}
          <img src={$previewSettings.background} alt="Background" style="width: 64px; height: 64px" />
        {/if}
      </Row>
      <Row>
        <Checkbox id="showBaseSizeOutline" bind:checked={pendingShowBaseSizeOutline}>Show Base Size Outline</Checkbox>
      </Row>
      <Row>
        <TextInput id="baseSizeOutlineColor" labelText="Base Size Outline Color" bind:value={pendingBaseSizeOutlineColor} />
      </Row>
      <Row>
        <Checkbox id="showSizeOutline" bind:checked={pendingShowSizeOutline}>Show Size Outline</Checkbox>
      </Row>
      <Row>
        <TextInput id="sizeOutlineColor" labelText="Size Outline Color" bind:value={pendingSizeOutlineColor} />
      </Row>
      <Row>
        <NumberInput id="secondsBetweenFrames" label="Seconds Between Frames" bind:value={pendingSecondsBetweenFrames} min={0} step={0.5} />
      </Row>
      <Row>
        <TextInput id="framePrefix" labelText="Frame Prefix" bind:value={pendingPrefix} />
        <TextInput id="frameSuffix" labelText="Frame Suffix" bind:value={pendingSuffix} />
      </Row>
      <Row>
        <Checkbox labelText="Use Canvas Size" id="useCanvasSize" bind:checked={pendingUseCanvasSize} />
        <TextInput disabled={!pendingUseCanvasSize} id="canvasWidth" labelText="Canvas Width" bind:value={pendingCanvasWidth} />
        <TextInput disabled={!pendingUseCanvasSize} id="canvasHeight" labelText="Canvas Height" bind:value={pendingCanvasHeight} />
      </Row>
    </Column>
  </Grid>
</Modal>
