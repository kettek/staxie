import * as tslog from 'tslog'
import { Logger, type ILogObjMeta, type ISettingsParam, type ILogObj } from 'tslog'

export const log = new Logger()
export const clog = log.getSubLogger({ name: 'canvas' })
export const flog = log.getSubLogger({ name: 'file' })