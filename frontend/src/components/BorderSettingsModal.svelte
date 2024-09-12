<!--
  @component

  This component is a modal settings dialog for changing the border colors for the 2D view.
-->
<script lang="ts">
  import { Column, Grid, Modal, Row, TextInput } from 'carbon-components-svelte'
  import { editor2DSettings } from '../stores/editor2d'

  let pendingSliceColor: string = $editor2DSettings.sliceBorderColor
  let pendingFrameColor: string = $editor2DSettings.frameBorderColor
  let pendingAnimationColor: string = $editor2DSettings.animationBorderColor
  let pendingStackColor: string = $editor2DSettings.stackBorderColor

  let changed: boolean = false
  $: {
    changed = $editor2DSettings.sliceBorderColor !== pendingSliceColor || $editor2DSettings.frameBorderColor !== pendingFrameColor || $editor2DSettings.animationBorderColor !== pendingAnimationColor || $editor2DSettings.stackBorderColor !== pendingStackColor
  }

  export let open: boolean = false
</script>

<Modal
  preventCloseOnClickOutside
  bind:open
  modalHeading="Border Settings"
  primaryButtonText="Apply"
  secondaryButtonText="Cancel"
  on:close={() => (open = false)}
  on:click:button--secondary={() => (open = false)}
  on:submit={() => {
    $editor2DSettings.sliceBorderColor = pendingSliceColor
    $editor2DSettings.frameBorderColor = pendingFrameColor
    $editor2DSettings.animationBorderColor = pendingAnimationColor
    $editor2DSettings.stackBorderColor = pendingStackColor
    open = false
  }}
  primaryButtonDisabled={!changed}
>
  <Grid narrow condensed fullWidth>
    <Column>
      <Row>
        <TextInput id="color" labelText="Slice" bind:value={pendingSliceColor} />
        <TextInput id="color" labelText="Frame" bind:value={pendingFrameColor} />
        <TextInput id="color" labelText="Animation" bind:value={pendingAnimationColor} />
        <TextInput id="color" labelText="Stack" bind:value={pendingStackColor} />
      </Row>
    </Column>
  </Grid>
</Modal>
