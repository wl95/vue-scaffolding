/* global document */
export function random4 () {
  return Math.floor(Math.random() * 9000 + 1000)
}
// 不合法的url
export function illegalUrl (url) {
  return /^\\?/.test(url)
}

// 不合法的url
export function setSpinStyle (id) {
  let height = document.documentElement.clientHeight
  // document.querySelector(`${id}`).style.height = `${height}px`
  document.querySelector(`${id}`).style.paddingTop = `${(height / 2) - 150}px`
  document.querySelector(`${id}`).style.textAlign = 'center'
}
