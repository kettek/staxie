<!--
  @component

  This component is a modal settings dialog for changing the background color.
-->
<script lang="ts">
  import { Column, Grid, Modal, Row, TextInput } from 'carbon-components-svelte'
  import { editor2DSettings } from '../stores/editor2d'

  let pendingColor: string = $editor2DSettings.backgroundColor

  let changed: boolean = false
  $: {
    changed = $editor2DSettings.backgroundColor !== pendingColor
  }

  export let open: boolean = false
</script>

<Modal
  preventCloseOnClickOutside
  bind:open
  modalHeading="Background Settings"
  primaryButtonText="Apply"
  secondaryButtonText="Cancel"
  on:close={() => (open = false)}
  on:click:button--secondary={() => (open = false)}
  on:submit={() => {
    $editor2DSettings.backgroundColor = pendingColor
    open = false
  }}
  primaryButtonDisabled={!changed}
>
  <Grid narrow condensed fullWidth>
    <Column>
      <Row>
        <TextInput id="color" labelText="Color" bind:value={pendingColor} />
      </Row>
    </Column>
  </Grid>
</Modal>
