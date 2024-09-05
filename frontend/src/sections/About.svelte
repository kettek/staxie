<!--
  @component

  This component provides an about modal.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { Version } from '../../wailsjs/go/main/App.js'
  import { BrowserOpenURL } from '../../wailsjs/runtime/runtime.js'

  import { ModalHeader, ModalBody, ModalFooter, Link } from 'carbon-components-svelte'

  export const open: boolean = false
  let version: string = ''

  function followLink(e: MouseEvent) {
    e.preventDefault()
    BrowserOpenURL((e.target as HTMLAnchorElement).href)
  }

  onMount(async () => {
    if ((window as any)['go']) {
      version = await Version()
    } else {
      version = 'unknown browser'
    }
  })
</script>

<ModalHeader label="Staxie" />
<ModalBody>
  <article>
    <p>Staxie is an open source, free software, and cross-platform sprite and sprite stack editor written with Wails in Svelte and Go.</p>
  </article>
  <article>
    <header>GitHub</header>
    <Link on:click={followLink} href="https://github.com/kettek/staxie">Repository</Link>
    <Link on:click={followLink} href="https://github.com/kettek/staxie/issues">Issues</Link>
  </article>
  <article>
    <header>Version</header>
    <span>{version}</span>
  </article>
  <article>
    <header>Author</header>
    <Link on:click={followLink} href="https://kettek.net">kettek</Link>
  </article>
</ModalBody>

<style>
  article {
    display: flex;
    flex-direction: row;
    gap: 1rem;
    justify-content: flex-start;
    user-select: none;
    padding-bottom: 1em;
  }
  article span {
    user-select: text;
  }
  p {
    text-align: left;
  }
  header {
    font-weight: bold;
  }
</style>
