export function makeShareLink(json) {
const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(json))))
const base = window.location.origin + window.location.pathname
return `${base}#d=${encoded}`
}


export function decodeShared() {
const hash = window.location.hash
if (!hash.startsWith('#d=')) return null
try {
const encoded = hash.slice(3)
const text = decodeURIComponent(escape(atob(encoded)))
return JSON.parse(text)
} catch {
return null
}
}