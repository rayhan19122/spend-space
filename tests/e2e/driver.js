// Small in-page test driver: dispatches real DOM events so React handlers run as they would for a user.
window.T = (() => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const scope = () => document.querySelector('dialog[open]') ?? document.body
  const visible = (el) => el.offsetParent !== null || el.getClientRects().length > 0
  const textOf = (el) => (el.getAttribute('aria-label') || el.innerText || el.textContent || '').trim()

  async function until(fn, label, ms = 4000) {
    const end = Date.now() + ms
    for (;;) {
      const value = fn()
      if (value) return value
      if (Date.now() > end) throw new Error(`Timed out: ${label}`)
      await sleep(40)
    }
  }

  const findClickable = (name, root = scope()) =>
    [...root.querySelectorAll('button,a,[role=menuitem],[role=radio]')]
      .filter(visible)
      .find((el) => textOf(el) === name || (name instanceof RegExp && name.test(textOf(el))))

  async function click(name, root) {
    const el = await until(() => findClickable(name, root), `clickable "${name}"`)
    el.click()
    await sleep(60)
  }

  const fieldFor = (label) => {
    const lab = [...scope().querySelectorAll('label')].find((l) => l.innerText.trim().replace(/\s*\(optional\)$/, '') === label)
    return lab && (lab.control ?? document.getElementById(lab.htmlFor))
  }

  async function fill(label, value) {
    const el = await until(() => fieldFor(label), `field "${label}"`)
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : el.tagName === 'SELECT' ? HTMLSelectElement : HTMLInputElement
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, value)
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
    await sleep(30)
  }

  async function choose(label, optionText) {
    const el = await until(() => {
      const f = fieldFor(label)
      return f && [...f.options].some((o) => o.textContent === optionText) && f
    }, `option "${optionText}" in "${label}"`)
    await fill(label, [...el.options].find((o) => o.textContent === optionText).value)
  }

  const submit = async () => {
    scope().querySelector('[type=submit]').click()
    await sleep(60)
  }
  const dialogClosed = () => until(() => !document.querySelector('dialog[open] > *'), 'dialog to close', 5000)
  const toast = () => until(() => [...document.querySelectorAll('[aria-live=polite] [role=status],[aria-live=polite] [role=alert]')].at(-1)?.innerText.trim(), 'toast')
  const mainText = () => document.querySelector('main').innerText.replace(/\s+/g, ' ')
  const loaded = () => until(() => !document.querySelector('main .skeleton'), 'loading to finish', 6000)
  const go = async (name) => {
    await click(name, document.querySelector('aside'))
    await sleep(120)
    await loaded()
  }
  const tab = async (name) => {
    await click(name, document.querySelector('main nav'))
    await sleep(120)
    await loaded()
  }
  const stat = (label) => [...document.querySelectorAll('main p')].find((p) => p.innerText.trim() === label)?.parentElement.innerText.replace(/\s+/g, ' ')
  const errors = () => [...scope().querySelectorAll('[id$=-error]')].map((e) => e.innerText)
  const rowFor = (title) => [...document.querySelectorAll('main tbody tr, main li')].filter(visible).find((r) => r.innerText.includes(title))

  return { sleep, until, click, fill, choose, submit, dialogClosed, toast, mainText, loaded, go, tab, stat, errors, rowFor, scope }
})()
'driver ready'
