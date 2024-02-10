<script lang='ts'>
  import {
    ModalHeader,
    ModalBody,
    ModalFooter,
  } from "carbon-components-svelte"
  
  export let title: string = "Untitled"
  export let label: string = "Untitled"
  
  export let noPadding: boolean = false

</script>

<dialog>
  <header class='bx--modal-header'>
    <h2 class='bx--modal-header__label bx--type-delta'>{label}</h2>
  </header>
  <section class='bx--modal-content {noPadding?'-noPadding':''}'>
    <slot/>
  </section>
</dialog>

<style>
  dialog {
    position: fixed;
    left: 100;
    top: 100;
    background-color: var(--cds-ui-01, #f4f4f4);
    display: grid;
    grid-template-columns: 100%;
    grid-template-rows: auto 1fr auto;
    outline: 3px solid rgba(0, 0, 0, 0);
    outline-offset: -3px;
  }
  section.-noPadding {
    padding: 0 !important;
  }
</style>