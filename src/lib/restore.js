const MAGIC = 'AGGCM1'
const MAGIC_BYTES = new TextEncoder().encode(MAGIC)
const IV_LEN = 12
const TAG_LEN = 16
const HEADER_LEN = MAGIC_BYTES.length + IV_LEN + TAG_LEN

function bytesEqual(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function hexToBytes(hex) {
  const clean = hex.trim()
  if (!/^[a-f0-9]{64}$/i.test(clean)) return null
  const out = new Uint8Array(32)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export async function loadGuardianKey(file) {
  const raw = new Uint8Array(await file.arrayBuffer())
  const text = new TextDecoder().decode(raw).trim()
  const hex = hexToBytes(text)
  if (hex) return hex
  if (raw.length >= 32) return raw.slice(0, 32)
  throw new Error('Invalid Guardian key file. Expected a 64-character hex key or at least 32 raw bytes.')
}

export async function decryptGuardianEncryptedBuffer(encryptedBuffer, keyBytes) {
  const encrypted = new Uint8Array(encryptedBuffer)
  if (encrypted.length < HEADER_LEN) throw new Error('Encrypted file is too short or incomplete.')

  const magic = encrypted.slice(0, MAGIC_BYTES.length)
  if (!bytesEqual(magic, MAGIC_BYTES)) {
    throw new Error('Not an Agent Guardian encrypted file. Missing AGGCM1 header.')
  }

  const ivStart = MAGIC_BYTES.length
  const iv = encrypted.slice(ivStart, ivStart + IV_LEN)
  const tag = encrypted.slice(ivStart + IV_LEN, HEADER_LEN)
  const ciphertext = encrypted.slice(HEADER_LEN)

  // Web Crypto expects AES-GCM auth tag appended to the ciphertext.
  const webCryptoPayload = new Uint8Array(ciphertext.length + tag.length)
  webCryptoPayload.set(ciphertext, 0)
  webCryptoPayload.set(tag, ciphertext.length)

  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt'])
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, cryptoKey, webCryptoPayload)
  return plaintext
}

export async function fetchEncryptedBackup(ipfsUrl) {
  const res = await fetch(ipfsUrl, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Could not fetch encrypted backup: HTTP ${res.status}`)
  return res.arrayBuffer()
}

export function restoredFileName(fileName = 'guardian-backup') {
  return String(fileName)
    .replace(/\.enc$/i, '')
    .replace(/^\d+-/, '')
    || 'guardian-backup'
}

export function downloadPlaintext(plaintext, fileName) {
  const blob = new Blob([plaintext], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = restoredFileName(fileName)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
