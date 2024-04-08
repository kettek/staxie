<!--
  @component
  
  This component provides a modal for adjusting the grid settings.
-->
<script lang='ts'>
  import { Column, Grid, Modal, NumberInput, Row, TextInput } from "carbon-components-svelte";

  export let majorSize: number = 16
  export let minorSize: number = 8
  export let majorColor: string = "#0000ff"
  export let minorColor: string = "#006666"

  let pendingMajorSize: number = majorSize
  let pendingMinorSize: number = minorSize
  let pendingMajorColor: string = majorColor
  let pendingMinorColor: string = minorColor

  $: {
    pendingMajorSize = majorSize
    pendingMinorSize = minorSize
    pendingMajorColor = majorColor
    pendingMinorColor = minorColor
  }

  let changed: boolean = false
  $: {
    changed = majorSize !== pendingMajorSize || minorSize !== pendingMinorSize || majorColor !== pendingMajorColor || minorColor !== pendingMinorColor
  }

  export let open: boolean = false
</script>

<Modal
  preventCloseOnClickOutside
  bind:open
  modalHeading="Grid Settings"
  primaryButtonText="Apply"
  secondaryButtonText="Cancel"
  on:close={() => open = false}
  on:click:button--secondary={() => open = false}
  on:submit={() => {
    majorSize = pendingMajorSize
    minorSize = pendingMinorSize
    majorColor = pendingMajorColor
    minorColor = pendingMinorColor
    open = false
  }}
  primaryButtonDisabled={!changed}
>
  <Grid narrow condensed fullWidth>
    <Column>
      <Row>
        <NumberInput id="size" label="Major Size" min={1} max={512} step={1} bind:value={pendingMajorSize}/>
      </Row>
      <Row>
        <TextInput id="color1" labelText="Major Color" bind:value={pendingMajorColor}/>
      </Row>
      <Row>
        <NumberInput id="size" label="Minor Size" min={1} max={512} step={1} bind:value={pendingMinorSize}/>
      </Row>
      <Row>
        <TextInput id="color2" labelText="Minor Color" bind:value={pendingMinorColor}/>
      </Row>
    </Column>
  </Grid>
</Modal>