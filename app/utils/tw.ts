// tw marks a string of Tailwind classes kept outside a className, so Prettier
// sorts it the same way (see prettier.config.mjs). It returns the string as
// written.
export function tw(strings: TemplateStringsArray, ...values: unknown[]) {
  return String.raw({ raw: strings }, ...values);
}
