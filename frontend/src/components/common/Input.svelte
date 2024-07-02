<script lang='ts'>
  import { createEventDispatcher } from "svelte"

  const dispatch = createEventDispatcher()

  export let size: 'small' | 'medium' | 'large' = 'medium'
  export let width: number = 6
  export let type: 'text' | 'number' | 'color' | 'file' | 'checkbox' = 'text'
  export let value: string | number = ''
  export let checked: boolean = false

  function onChange(e: Event) {
    const target = e.target as HTMLInputElement
    value = target.value
    if (type === 'number') {
      value = parseFloat(value)
    } else if (type === 'checkbox') {
      checked = target.checked
      dispatch('change', checked)
      return
    }
    dispatch('change', value)
  }
  function onInput(e: Event) {
    const target = e.target as HTMLInputElement
    value = target.value
    if (type === 'number') {
      value = parseFloat(value)
    } else if (type === 'checkbox') {
      checked = target.checked
      dispatch('change', checked)
      return
    }
    dispatch('input', value)
  }
</script>

<label class={size}>
  <span>
    <slot name='label'></slot>
  </span>
  {#if type === 'text'}
    <input type="text" {...$$restProps} bind:value on:change={onChange} on:input={onInput}/>
  {:else if type === 'number'}
    <input type="number" style={`width: ${width}em`} {...$$restProps} bind:value on:change={onChange} on:input={onInput}/>
  {:else if type === 'color'}
    <input type="color" {...$$restProps} bind:value on:change={onChange} on:input={onInput}/>
  {:else if type === 'file'}
    <input type="file" {...$$restProps} bind:value on:change={onChange} on:input={onInput}/>
  {:else if type === 'checkbox'}
    <input type="checkbox" {...$$restProps} bind:checked on:change={onChange}/>
  {/if}
</label>

<style>
  label {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.25rem;
    height: 2rem;
    padding-left: 0.5rem;
    padding-right: 0.25rem;
  }
  label span {
    display: flex;
    align-items: center;
    font-size: var(--cds-label-01-font-size, 0.75rem);
    font-weight: var(--cds-label-01-font-weight, 400);
    line-height: var(--cds-label-01-line-height, 1.3);
    letter-spacing: var(--cds-label-01-letter-spacing, 0.32px);
    color: var(--cds-text-02, #525252);
    line-height: 1rem;
  }
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input {
    width: 100%;
    padding: 0.5rem;
    font-size: 1rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    font-family: var(--cds-code-01-font-family, 'IBM Plex Mono', 'Menlo', 'DejaVu Sans Mono', 'Bitstream Vera Sans Mono', Courier, monospace);
    font-size: var(--cds-code-01-font-size, 0.75rem);
    font-weight: var(--cds-code-01-font-weight, 400);
    line-height: var(--cds-code-01-line-height, 1.33333);
    letter-spacing: var(--cds-code-01-letter-spacing, 0.32px);
    outline: 2px solid rgba(0,0,0,0);
    outline-offset: -2px;
    display: inline-flex;
    box-sizing: border-box;
    border: 0;
    border-bottom: .0625rem solid var(--cds-ui-04, #8d8d8d);
    border-radius: 0;
    background-color: var(--cds-field-01, #f4f4f4);
    color: var(--cds-text-01, #161616);
    transition: background-color 70ms cubic-bezier(0.2, 0, 0.38, 0.9),outline 70ms cubic-bezier(0.2, 0, 0.38, 0.9);
    padding-right: 1rem;
  }
  input:focus {
    outline: 2px solid var(--cds-focus, #0f62fe);
    outline-offset: -2px;
  }
  label.small {
    height: 1.25rem;
  }
  label.small input {
    font-size: calc(var(--cds-code-01-font-size, 0.75rem) - 0.2rem) !important;
    padding: 0 0.25rem;
  }
  label.medium {
    height: 2rem;
  }
  label.large {
    height: 2.5rem;
  }
</style>