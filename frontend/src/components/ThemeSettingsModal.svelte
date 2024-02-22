<script lang='ts'>
  import { Column, Dropdown, Grid, Modal, NumberInput, Row, TextInput } from "carbon-components-svelte";

  export let theme: 'white'|'g10'|'g80'|'g90'|'g100' = "g90"

  let pendingId: 'white'|'g10'|'g80'|'g90'|'g100' = theme

  $: {
    pendingId = theme
  }

  let changed: boolean = false
  $: {
    changed = theme !== pendingId
  }

  export let open: boolean = false
</script>

<Modal
  hasScrollingContent
  preventCloseOnClickOutside
  bind:open
  modalHeading="Theme Settings"
  primaryButtonText="Apply"
  secondaryButtonText="Cancel"
  on:close={() => open = false}
  on:click:button--secondary={() => open = false}
  on:submit={() => {
    theme = pendingId
    open = false
  }}
  primaryButtonDisabled={!changed}
>
  <Dropdown
    size="sm"
    label="Theme"
    bind:selectedId={pendingId}
    items={[
      {id: 'white', text: 'White'},
      {id: 'g10', text: 'Gray 10'},
      {id: 'g80', text: 'Gray 80'},
      {id: 'g90', text: 'Gray 90 (default)'},
      {id: 'g100', text: 'Gray 100'},
    ]}
  />
  <div class='kludge'></div>
</Modal>

<style>
  div.kludge {
    min-height: 50vh;
    pointer-events: none;
  }
</style>