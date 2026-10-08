import { reactive } from 'vue'

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

/**
 * Shows a form's built-in HTML constraints (required, type="email",
 * maxlength, min/max, pattern) as inline messages instead of browser pop-ups.
 * The rules stay exactly the ones written on the inputs; only how they are
 * shown changes. Use with `novalidate` on the form:
 *
 *   <form novalidate @focusout="v.onBlur" @input="v.onInput" @submit.prevent="v.submit($event, send)">
 *
 * Messages are keyed by each field's `name`.
 */
export function useInlineValidation() {
  const messages = reactive<Record<string, string>>({})

  const isField = (el: EventTarget | null): el is Field =>
    !!el && 'validity' in (el as Field) && !!(el as Field).name && (el as Field).willValidate

  const messageFor = (el: Field): string => {
    const v = el.validity
    if (v.valid) return ''
    if (v.valueMissing) return el instanceof HTMLSelectElement ? 'Choose an option' : 'This field is required'
    if (v.typeMismatch && (el as HTMLInputElement).type === 'email') return 'Enter a valid email address, like name@organisation.org'
    if (v.tooLong) return `Keep this under ${(el as HTMLInputElement).maxLength} characters`
    if (v.tooShort) return `Use at least ${(el as HTMLInputElement).minLength} characters`
    if (v.rangeUnderflow) return `Enter ${(el as HTMLInputElement).min} or more`
    if (v.rangeOverflow) return `Enter ${(el as HTMLInputElement).max} or less`
    return el.validationMessage
  }

  /** Check a field when the user leaves it (quiet if it is empty and untouched). */
  const onBlur = (e: FocusEvent) => {
    const el = e.target
    if (!isField(el)) return
    if (!el.value && !messages[el.name]) return
    messages[el.name] = messageFor(el)
  }

  /** Clear or update a shown message as the user fixes the value. */
  const onInput = (e: Event) => {
    const el = e.target
    if (isField(el) && messages[el.name]) messages[el.name] = messageFor(el)
  }

  /** Check every field; focus the first invalid one, otherwise run `handler`. */
  const submit = (e: Event, handler: () => unknown) => {
    const form = (e.currentTarget ?? e.target) as HTMLFormElement
    let first: Field | null = null
    for (const el of Array.from(form.elements)) {
      if (!isField(el)) continue
      const msg = messageFor(el)
      messages[el.name] = msg
      if (msg && !first) first = el
    }
    if (first) {
      first.focus()
      return
    }
    return handler()
  }

  /** Attributes for a field: invalid state and the id of its message. */
  const aria = (name: string, idPrefix: string) => ({
    'aria-invalid': messages[name] ? ('true' as const) : undefined,
    'aria-describedby': messages[name] ? `${idPrefix}-${name}-error` : undefined,
  })

  return { messages, onBlur, onInput, submit, aria }
}
