/**
 * The command AST. Discriminated on `type`, so adding a command surfaces every
 * site that must handle it via the exhaustive switch in the dispatcher.
 */
export type ResetMode = 'soft' | 'mixed' | 'hard'

export type Command =
  | { readonly type: 'add'; readonly paths: readonly string[] }
  | { readonly type: 'commit'; readonly message: string; readonly allowEmpty: boolean }
  | {
      readonly type: 'branch'
      readonly name?: string
      readonly startPoint?: string
      readonly delete?: boolean
      readonly force?: boolean
    }
  | {
      readonly type: 'checkout'
      readonly target: string
      readonly create?: boolean
      readonly detach?: boolean
    }
  | { readonly type: 'log'; readonly revision?: string; readonly limit?: number }
  | { readonly type: 'status' }
  | { readonly type: 'reflog'; readonly ref?: string }

export type CommandType = Command['type']
