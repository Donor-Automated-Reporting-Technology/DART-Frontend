import { watch } from 'vue'

interface Options {
  /** Read the current error map. */
  get: () => Record<string, string | undefined>
  /** Replace the error map. */
  set: (next: Record<string, string>) => void
  /** The form's existing validate(); it fills the error map. Not changed. */
  validate: () => unknown
  /** Current value of a field (empty + untouched fields stay quiet on blur). */
  value: (field: string) => unknown
  /** Fields to keep re-checking while they show an error. */
  fields: string[]
}

/**
 * Runs a form's own validate() at field level: a field is checked when the
 * user leaves it, and a shown error clears as soon as the value is fixed.
 * Errors for other fields are left as they were. Rules are not changed.
 */
export function useBlurValidation(o: Options) {
  const refresh = (fields: string[]) => {
    const previous = { ...o.get() } as Record<string, string>
    o.validate()
    const fresh = o.get()
    const next = { ...previous }
    for (const f of fields) {
      delete next[f]
      if (fresh[f]) next[f] = fresh[f] as string
    }
    o.set(next)
    return fields.filter(f => fresh[f])
  }

  const onBlur = (field: string) => {
    const v = o.value(field)
    if ((v === '' || v === null || v === undefined) && !o.get()[field]) return
    refresh([field])
  }

  watch(
    () => o.fields.map(f => String(o.value(f) ?? '')).join('\u0000'),
    () => {
      const shown = o.fields.filter(f => o.get()[f])
      if (shown.length) refresh(shown)
    },
  )

  return { onBlur, refresh }
}
