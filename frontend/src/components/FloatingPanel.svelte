<script lang='ts'>
  import {
    ModalHeader,
    ModalBody,
    ModalFooter,
  } from "carbon-components-svelte"
  
  import {
    Close
  } from 'carbon-icons-svelte'
  
  export let title: string = "Untitled"
  export let label: string = "Untitled"
  
  export let noPadding: boolean = false
  
  export let open: boolean = false
  
  function drag(node) {
    let dragging: boolean = false
    let x: number = 0
    let y: number = 0
    node.addEventListener('mousedown', start)
    window.addEventListener('mouseup', stop)
    window.addEventListener('mouseleave', stop)
    window.addEventListener('mousemove', move)
    
    function start(e: MouseEvent) {
      dragging = true
      x = e.clientX
      y = e.clientY
      node.style.cursor = 'grabbing'
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    }
    function stop(e: MouseEvent) {
      dragging = false
      node.style.cursor = 'auto'
      document.body.style.cursor = 'auto'
      document.body.style.userSelect = 'auto'
    }
    function move(e: MouseEvent) {
      if (!dragging) return
      let dx = e.clientX - x
      let dy = e.clientY - y
      x = e.clientX
      y = e.clientY
      node.style.left = parseInt(node.style.left) + dx + 'px'
      node.style.top = parseInt(node.style.top) + dy + 'px'
    }
  
  }

</script>

<dialog use:drag style="left: 100px; top: 100px;">
  <header class='bx--modal-header'>
    <h2 class='bx--modal-header__label bx--type-delta'>{label}</h2>
    <button class='bx--modal-close' aria-label='Close' title='Close' on:click={()=>{open=false}}>
      <Close/>
    </button>
  </header>
  <section class='bx--modal-content {noPadding?'-noPadding':''}' on:mousedown={e=>e.stopPropagation()}>
    <slot/>
  </section>
</dialog>

<style>
  dialog {
    position: fixed;
    background-color: var(--cds-ui-01, #f4f4f4);
    display: grid;
    grid-template-columns: 100%;
    grid-template-rows: auto 1fr auto;
    outline: 3px solid rgba(0, 0, 0, 0);
    outline-offset: -3px;
    box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.5);
    padding: 0;
    width: 40rem;
  }
  header {
    padding: var(--cds-spacing-03, 1rem);
  }
  header button {
    width: 2rem;
    height: 2rem;
    right: 0;
    top: 0;
    padding: 0rem;
  }
  section.-noPadding {
    padding: 0 !important;
    margin-bottom: var(--cds-spacing-03, 1rem);
  }
</style>