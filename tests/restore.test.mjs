import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
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

const homepageTrustCopy =
  'Agent Guardian encrypts your agent .md config files locally with AES-256-GCM before backup. IPFS/Arweave store ciphertext, not readable configs. Designed for recovery even when agents, gateways, or local machines fail.'

for (const fileName of ['landing.html', 'index-landing.html']) {
  test(`${fileName} includes homepage trust block with local encryption and ciphertext copy`, () => {
    const html = fs.readFileSync(path.join(process.cwd(), 'public', fileName), 'utf8')
    assert.match(html, /<section[^>]+id="trust"/)
    assert.ok(html.includes(homepageTrustCopy))
  })

  test(`${fileName} positions pricing around entry, recovery premium, and founder fair use`, () => {
    const html = fs.readFileSync(path.join(process.cwd(), 'public', fileName), 'utf8')
    assert.ok(html.includes('<div class="price">$9/mo</div>'))
    assert.ok(html.includes('Paid entry point for encrypted agent recovery'))
    assert.ok(html.includes('<div class="price">$19/mo</div>'))
    assert.ok(html.includes('Security + recovery premium'))
    assert.ok(html.includes('Priority recovery support'))
    assert.ok(html.includes('Founder deal — fair use applies'))
    assert.ok(html.includes('Fair-use encrypted storage/versioning'))
  })
}
