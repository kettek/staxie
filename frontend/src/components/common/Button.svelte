<script lang="ts">
  import type { CarbonIcon } from 'carbon-icons-svelte'

  export let icon: new (...args: any[]) => CarbonIcon

  export let selected: boolean = false
  export let disabled: boolean = false

  // Not used for now.
  export let kind: 'ghost' | 'danger' | 'primary' | 'secondary' | 'tertiary' = 'primary'

  export let size: 'tiny' | 'small' | 'medium' | 'large' = 'small'

  export let tooltip: string = ''
  export let tooltipPosition: 'top' | 'right' | 'bottom' | 'left' = 'top'
  // Not used for now.
  export let tooltipAlignment: 'start' | 'center' | 'end' = 'center'
</script>

<button tabindex={0} aria-pressed={selected} on:click on:contextmenu class="-{size}{selected ? ' -selected' : ''}{disabled ? ' -disabled' : ''}">
  {#if icon}
    <svelte:component this={icon} />
  {/if}
  {#if tooltip}
    <aside class="-{tooltipPosition}">
      {tooltip}
    </aside>
  {:else if $$slots.tooltip}
    <aside class="-{tooltipPosition}">
      <slot name="tooltip"></slot>
    </aside>
  {/if}
</button>

<style>
  button {
    position: relative;
    background-color: transparent;
    border-width: 1px;
    border-style: solid;
    border-color: transparent;
    cursor: pointer;
    display: inline-flex;
    padding: 0;
    align-items: center;
    padding: calc(0.375rem - 3px) 16px;
    padding-left: 0.4375rem;
    padding-right: 0.4375rem;
    color: var(--cds-link-01, #0f62fe);
    color: var(--cds-button-tertiary-active);

    transition:
      background 70ms cubic-bezier(0, 0, 0.38, 0.9),
      box-shadow 70ms cubic-bezier(0, 0, 0.38, 0.9),
      border-color 70ms cubic-bezier(0, 0, 0.38, 0.9),
      outline 70ms cubic-bezier(0, 0, 0.38, 0.9);

    font-size: var(--cds-body-short-01-font-size, 0.875rem);
    font-weight: var(--cds-body-short-01-font-weight, 400);
    line-height: var(--cds-body-short-01-line-height, 1.28572);
    letter-spacing: var(--cds-body-short-01-letter-spacing, 0.16px);

    min-height: 2rem;
  }
  button:hover {
    background: var(--cds-selected-ui, #e0e0e0);
    color: var(--cds-button-tertiary-hover);
  }
  button.-selected {
    background: var(--cds-selected-ui, #e0e0e0);
    color: var(--cds-button-tertiary);
  }
  button.-disabled {
    pointer-events: none;
    cursor: not-allowed;
    color: var(--cds-disabled-03, #8d8d8d);
  }
  button.-tiny {
    font-size: 0.5rem;
  }
  button.-small {
    font-size: 0.75rem;
  }
  button.-medium {
    font-size: 1rem;
  }
  button.-large {
    font-size: 1.25rem;
  }

  aside {
    background-color: var(--cds-hover-tertiary);
    color: var(--cds-inverse-01);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    left: 50%;
    opacity: 0;
    padding: 0.25rem;
    position: absolute;
    top: 100%;
    transform: translateX(-50%);
    transition: opacity 0.2s;
    visibility: hidden;
    z-index: 1;
    white-space: nowrap;
    pointer-events: none;
  }
  aside::after {
    content: '';
    position: absolute;
    border-width: 0.25rem;
    border-style: solid;
    border-color: transparent transparent var(--cds-hover-tertiary) transparent;
    pointer-events: none;
  }
  aside.-top::after {
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-color: var(--cds-hover-tertiary) transparent transparent transparent;
  }
  aside.-top {
    bottom: 130%;
    top: auto;
  }
  aside.-right::after {
    top: 50%;
    right: 100%;
    transform: translateY(-50%);
    border-color: transparent var(--cds-hover-tertiary) transparent transparent;
  }
  aside.-right {
    left: 130%;
    top: 50%;
    transform: translateY(-50%);
  }
  aside.-bottom::after {
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
  }
  aside.-bottom {
    top: 130%;
  }
  aside.-left::after {
    top: 50%;
    left: 100%;
    transform: translateY(-50%);
    border-color: transparent transparent transparent var(--cds-hover-tertiary);
  }
  aside.-left {
    top: 50%;
    transform: translateY(-50%) translateX(-135%);
  }

  button:hover aside {
    opacity: 0.9;
    visibility: visible;
  }
</style>
