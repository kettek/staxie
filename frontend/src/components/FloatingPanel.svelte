<!--
  @component
  
  This component provides a draggable floating panel that contains arbitrary content.
-->
<script lang='ts'>
  import {
    ModalHeader,
    ModalBody,
    ModalFooter,
  } from "carbon-components-svelte"
  
  import {
    Close, FolderMoveTo

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
    }
    function stop(e: MouseEvent) {
      dragging = false
      node.style.cursor = 'auto'
    }
    function move(e: MouseEvent) {
      if (!dragging || resizing) return
      let dx = e.clientX - x
      let dy = e.clientY - y
      x = e.clientX
      y = e.clientY
      node.style.left = parseInt(node.style.left) + dx + 'px'
      node.style.top = parseInt(node.style.top) + dy + 'px'
    }
  }
  
  let resizing: boolean = false
  function resizeDrag(node, direction: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'r' | 'b' | 'l') {
    let dragging: boolean = false
    let x: number = 0
    let y: number = 0
    let dx: number = 0
    let dy: number = 0
    let left: number = 0
    let top: number = 0
    let width: number = 0
    let height: number = 0
    node.addEventListener('mousedown', start)
    window.addEventListener('mouseup', stop)
    window.addEventListener('mouseleave', stop)
    window.addEventListener('mousemove', move)
    
    function start(e: MouseEvent) {
      resizing = true
      dragging = true
      x = e.clientX
      y = e.clientY
      dx = 0
      dy = 0
      let rect = dialog.getBoundingClientRect()
      width = rect.width
      height = rect.height
      top = rect.top
      left = rect.left
    }
    function stop(e: MouseEvent) {
      resizing = false
      dragging = false
      node.style.cursor = 'auto'
    }
    function move(e: MouseEvent) {
      if (!dragging) return
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      dx += e.clientX - x
      dy += e.clientY - y
      x = e.clientX
      y = e.clientY
      
      if (direction === 't') {
        dialog.style.height = height - dy + 'px'
        dialog.style.top = top + dy + 'px'
      } else if (direction === 'r') {
        dialog.style.width = width + dx + 'px'
        dialog.style.left = left + dx + 'px'
      } else if (direction === 'b') {
        dialog.style.height = height + dy + 'px'
      } else if (direction === 'l') {
        dialog.style.width = width - dx + 'px'
        dialog.style.left = left + dx + 'px'
      } else if (direction === 'tl') {
        dialog.style.width = width - dx + 'px'
        dialog.style.height = height - dy + 'px'
        dialog.style.left = left + dx + 'px'
        dialog.style.top = top + dy + 'px'
      } else if (direction === 'tr') {
        dialog.style.width = width + dx + 'px'
        dialog.style.height = height - dy + 'px'
        dialog.style.top = top + dy + 'px'
      } else if (direction === 'bl') {
        dialog.style.width = width - dx + 'px'
        dialog.style.height = height + dy + 'px'
        dialog.style.left = left + dx + 'px'
      } else if (direction === 'br') {
        dialog.style.width = width + dx + 'px'
        dialog.style.height = height + dy + 'px'
      }
    }
  
  }
  let dialog: HTMLDialogElement
</script>

<dialog bind:this={dialog} use:drag style="left: 100px; top: 100px;">
  <header class='bx--modal-header'>
    <h2 class='bx--modal-header__label bx--type-delta'>{label}</h2>
    <button class='bx--modal-close' aria-label='Close' title='Close' on:click={()=>{open=false}}>
      <Close/>
    </button>
  </header>
  <section class='bx--modal-content {noPadding?'-noPadding':''}' on:mousedown={e=>e.stopPropagation()}>
    <slot/>
  </section>
  <aside use:resizeDrag={'tl'} class='top-left'></aside>
  <aside use:resizeDrag={'tr'} class='top-right'></aside>
  <aside use:resizeDrag={'bl'} class='bottom-left'></aside>
  <aside use:resizeDrag={'br'} class='bottom-right'></aside>
  <aside use:resizeDrag={'t'} class='top'></aside>
  <aside use:resizeDrag={'r'} class='right'></aside>
  <aside use:resizeDrag={'b'} class='bottom'></aside>
  <aside use:resizeDrag={'l'} class='left'></aside>
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
    min-width: 10rem;
    min-height: 10rem;
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
    overflow: auto;
  }
  .top-left, .top-right, .bottom-left, .bottom-right, .top, .right, .bottom, .left {
    position: absolute;
    width: 1.25rem;
    height: 1.25rem;
  }
  .top-left {
    top: -0.5rem;
    left: -0.5rem;
    cursor: nwse-resize;
  }
  .top-right {
    top: -0.5rem;
    right: -0.5rem;
    cursor: nesw-resize;
  }
  .bottom-left {
    bottom: -0.5rem;
    left: -0.5rem;
    cursor: nesw-resize;
  }
  .bottom-right {
    bottom: -0.5rem;
    right: -0.5rem;
    cursor: nwse-resize;
  }
  .left {
    top: 0.75rem;
    left: -0.5rem;
    height: calc(100% - 1.5rem);
    cursor: ew-resize;
  }
  .top {
    top: -0.5rem;
    left: 0.75rem;
    width: calc(100% - 1.5rem);
    cursor: ns-resize;
  }
  .right {
    top: 0.75rem;
    right: -0.5rem;
    height: calc(100% - 1.5rem);
    cursor: ew-resize;
  }
  .bottom {
    bottom: -0.5rem;
    left: 0.75rem;
    width: calc(100% - 1.5rem);
    cursor: ns-resize;
  }
</style>