import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'

import { decryptGuardianEncryptedBuffer, restoredFileName } from '../src/lib/restore.js'

const MAGIC = Buffer.from('AGGCM1')

function encryptLikeGuardian(plaintext, key) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([MAGIC, iv, tag, ciphertext])
}

test('dashboard restore decrypts Agent Guardian AES-GCM encrypted buffers locally', async () => {
  const key = crypto.randomBytes(32)
  const plaintext = Buffer.from('dashboard local restore proof')
  const encrypted = encryptLikeGuardian(plaintext, key)

  const restored = await decryptGuardianEncryptedBuffer(encrypted, key)
  assert.equal(Buffer.from(restored).toString('utf8'), plaintext.toString('utf8'))
})

test('dashboard restore rejects non-Guardian encrypted payloads', async () => {
  const key = crypto.randomBytes(32)
  await assert.rejects(
    () => decryptGuardianEncryptedBuffer(Buffer.from('not-a-guardian-file'), key),
    /too short|Missing AGGCM1 header/,
  )
})

test('restore download names remove encryption suffix and timestamp prefix', () => {
  assert.equal(restoredFileName('1715000000000-agent.md.enc'), 'agent.md')
  assert.equal(restoredFileName('agent.md.enc'), 'agent.md')
})
