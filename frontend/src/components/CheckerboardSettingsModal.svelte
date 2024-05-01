<!--
  @component
  
  This component is a modal that provides settings for changing the checkerboard background.
-->
<script lang='ts'>
  import { Column, Grid, Modal, NumberInput, Row, TextInput } from "carbon-components-svelte"
  import { editor2DSettings } from "../stores/editor2d"

  let pendingSize: number = $editor2DSettings.checkerboardSize
  let pendingColor1: string = $editor2DSettings.checkerboardColor1
  let pendingColor2: string = $editor2DSettings.checkerboardColor2

  let changed: boolean = false
  $: {
    changed = $editor2DSettings.checkerboardSize !== pendingSize || $editor2DSettings.checkerboardColor1 !== pendingColor1 || $editor2DSettings.checkerboardColor2 !== pendingColor2
  }

  export let open: boolean = false
</script>

<Modal
  preventCloseOnClickOutside
  bind:open
  modalHeading="Checkerboard Settings"
  primaryButtonText="Apply"
  secondaryButtonText="Cancel"
  on:close={() => open = false}
  on:click:button--secondary={() => open = false}
  on:submit={() => {
    $editor2DSettings.checkerboardSize = pendingSize
    $editor2DSettings.checkerboardColor1 = pendingColor1
    $editor2DSettings.checkerboardColor2 = pendingColor2
    open = false
  }}
  primaryButtonDisabled={!changed}
>
  <Grid narrow condensed fullWidth>
    <Column>
      <Row>
        <NumberInput id="size" label="Size" min={1} max={512} step={1} bind:value={pendingSize}/>
      </Row>
      <Row>
        <TextInput id="color1" labelText="Color 1" bind:value={pendingColor1}/>
      </Row>
      <Row>
        <TextInput id="color2" labelText="Color 2" bind:value={pendingColor2}/>
      </Row>
    </Column>
  </Grid>
</Modal>