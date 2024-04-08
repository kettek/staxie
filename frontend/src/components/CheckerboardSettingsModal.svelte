<!--
  @component
  
  This component is a modal that provides settings for changing the checkerboard background.
-->
<script lang='ts'>
  import { Column, Grid, Modal, NumberInput, Row, TextInput } from "carbon-components-svelte";

  export let size: number = 8
  export let color1: string = "#888888"
  export let color2: string = "#444444"

  let pendingSize: number = size
  let pendingColor1: string = color1
  let pendingColor2: string = color2

  $: {
    pendingSize = size
    pendingColor1 = color1
    pendingColor2 = color2
  }

  let changed: boolean = false
  $: {
    changed = size !== pendingSize || color1 !== pendingColor1 || color2 !== pendingColor2
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
    size = pendingSize
    color1 = pendingColor1
    color2 = pendingColor2
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