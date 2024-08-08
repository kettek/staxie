import { Logger } from 'tslog'

export const log = new Logger()
export const rlog = log.getSubLogger({ name: 'render' })
export const clog = log.getSubLogger({ name: 'canvas' })
export const flog = log.getSubLogger({ name: 'file' })
export const plog = log.getSubLogger({ name: 'png' })
