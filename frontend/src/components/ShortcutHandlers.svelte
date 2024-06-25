<script context='module' lang='ts'>
  import { setContext, onDestroy } from 'svelte'
  import { get, writable } from 'svelte/store'

  export const handlers = writable([] as Handler[])
  export const HANDLERS = {}
  export type HandlersType = {
    registerHandler: (opts: {cmd: string, group: string, fileId?: number, trigger: () => void, release: () => void}) => void,
  }

  type Handler = {
    id: {},
    cmd: string,
    group: string,
    fileId?: number,
    trigger: () => void,
    release: () => void,
  }
</script>

<script lang='ts'>
  const id = {}

  setContext(HANDLERS, {
    registerHandler: (opts: {group: string, cmd: string, fileId?: number, trigger: () => void, release: () => void}) => {
      handlers.update(handlers => {
        handlers.push({id, cmd: opts.cmd, group: opts.group, fileId: opts.fileId, trigger: opts.trigger, release: opts.release})
        return handlers
      })

      onDestroy(() => {
        handlers.update(handlers => {
          handlers = handlers.filter(v => v.id !== id)
          return handlers
        })
      })
    }
  })
</script>

<slot></slot>