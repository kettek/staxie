<script lang='ts'>
  import { Modal, TextInput } from "carbon-components-svelte"

  export let open: boolean = false
  export let heading: string = "Rename"
  export let onsubmit: (v: string) => void = () => {}

  export let text: string = ""

</script>

<Modal
  bind:open
  modalHeading={heading}
  primaryButtonText="Apply"
  secondaryButtonText="Cancel"
  on:close={() => open = false}
  on:click:button--secondary={() => open = false}
  on:submit={() => {
    open = false
    onsubmit(text)
  }}
>
  <TextInput id="rename" labelText="New name" bind:value={text} />
</Modal>
