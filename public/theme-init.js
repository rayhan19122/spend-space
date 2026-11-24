// A separate file rather than an inline script, so the Content-Security-Policy can forbid inline scripts.
(function () {
  var theme = 'system'
  try {
    theme = localStorage.getItem('spendspace-theme') || 'system'
  } catch (e) {
    // Storage can be blocked; fall back to the system preference.
  }
  var dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
})()
