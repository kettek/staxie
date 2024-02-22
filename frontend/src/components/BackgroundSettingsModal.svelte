<script lang='ts'>
  import { Column, Grid, Modal, NumberInput, Row, TextInput } from "carbon-components-svelte";

  export let color: string = "#888888"

  let pendingColor: string = color

  $: {
    pendingColor = color
  }

  let changed: boolean = false
  $: {
    changed = color !== pendingColor
  }

  export let open: boolean = false
</script>

<Modal
  preventCloseOnClickOutside
  bind:open
  modalHeading="Background Settings"
  primaryButtonText="Apply"
  secondaryButtonText="Cancel"
  on:close={() => open = false}
  on:click:button--secondary={() => open = false}
  on:submit={() => {
    color = pendingColor
    open = false
  }}
  primaryButtonDisabled={!changed}
>
  <Grid narrow condensed fullWidth>
    <Column>
      <Row>
        <TextInput id="color" labelText="Color" bind:value={pendingColor}/>
      </Row>
    </Column>
  </Grid>
</Modal>