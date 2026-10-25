/**
 * Address classification used to stop the link checker from being pointed at
 * internal infrastructure (SSRF). Anything unparseable is treated as private.
 */

function parseV4(s: string): number[] | null {
  const parts = s.split('.')
  if (parts.length !== 4) return null
  const out: number[] = []
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null
    const n = Number(p)
    if (n > 255) return null
    out.push(n)
  }
  return out
}

function isPrivateV4(s: string): boolean {
  const o = parseV4(s)
  if (!o) return true
  const [a, b, c] = o as [number, number, number, number]
  return (
    a === 0 || // "this" network
    a === 10 ||
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, incl. cloud metadata 169.254.169.254
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast and reserved
  )
}

function isPrivateV6(s: string): boolean {
  if (s === '::' || s === '::1') return true

  const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateV4(mapped[1]!)

  const mappedHex = s.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (mappedHex) {
    const hi = parseInt(mappedHex[1]!, 16)
    const lo = parseInt(mappedHex[2]!, 16)
    return isPrivateV4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`)
  }

  const groups = s.split(':')
  const first = parseInt(groups[0] || '0', 16)
  if (Number.isNaN(first)) return true
  if (first === 0) return true // ::/8 incl. IPv4-compatible forms
  if (first === 0x64 && groups[1] === 'ff9b') return true // NAT64 can embed internal IPv4
  return (
    (first & 0xfe00) === 0xfc00 || // unique local fc00::/7
    (first & 0xffc0) === 0xfe80 || // link-local fe80::/10
    (first & 0xff00) === 0xff00 // multicast
  )
}

export function isPrivateIp(ip: string): boolean {
  const v = ip.trim().toLowerCase().replace(/^\[|\]$/g, '')
  return v.includes(':') ? isPrivateV6(v) : isPrivateV4(v)
}
