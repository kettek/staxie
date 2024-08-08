<!--
  @component

  This component provides a modal for adjusting the grid settings.
-->
<script lang="ts">
  import { Column, Grid, Modal, NumberInput, Row, TextInput } from 'carbon-components-svelte'
  import { editor2DSettings } from '../stores/editor2d'

  let pendingMajorSize: number = $editor2DSettings.gridMajorSize
  let pendingMinorSize: number = $editor2DSettings.gridMinorSize
  let pendingMajorColor: string = $editor2DSettings.gridMajorColor
  let pendingMinorColor: string = $editor2DSettings.gridMinorColor

  let changed: boolean = false
  $: {
    changed = $editor2DSettings.gridMajorSize !== pendingMajorSize || $editor2DSettings.gridMinorSize !== pendingMinorSize || $editor2DSettings.gridMajorColor !== pendingMajorColor || $editor2DSettings.gridMinorColor !== pendingMinorColor
  }

  export let open: boolean = false
</script>

<Modal
  preventCloseOnClickOutside
  bind:open
  modalHeading="Grid Settings"
  primaryButtonText="Apply"
  secondaryButtonText="Cancel"
  on:close={() => (open = false)}
  on:click:button--secondary={() => (open = false)}
  on:submit={() => {
    $editor2DSettings.gridMajorSize = pendingMajorSize
    $editor2DSettings.gridMinorSize = pendingMinorSize
    $editor2DSettings.gridMajorColor = pendingMajorColor
    $editor2DSettings.gridMinorColor = pendingMinorColor
    open = false
  }}
  primaryButtonDisabled={!changed}
>
  <Grid narrow condensed fullWidth>
    <Column>
      <Row>
        <NumberInput id="size" label="Major Size" min={1} max={512} step={1} bind:value={pendingMajorSize} />
      </Row>
      <Row>
        <TextInput id="color1" labelText="Major Color" bind:value={pendingMajorColor} />
      </Row>
      <Row>
        <NumberInput id="size" label="Minor Size" min={1} max={512} step={1} bind:value={pendingMinorSize} />
      </Row>
      <Row>
        <TextInput id="color2" labelText="Minor Color" bind:value={pendingMinorColor} />
      </Row>
    </Column>
  </Grid>
</Modal>
