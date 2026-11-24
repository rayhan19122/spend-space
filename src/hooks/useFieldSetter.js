// Accepts either an input event or a plain value, for pickers. Editing a field clears its error.
export function useFieldSetter(setValues, setErrors) {
  return (field) => (input) => {
    const value = input?.target ? input.target.value : input
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }
}

// Moves keyboard and screen-reader users to the first problem after a failed submit.
export function focusFirstError(form) {
  requestAnimationFrame(() => form?.querySelector('[aria-invalid="true"]')?.focus())
}
