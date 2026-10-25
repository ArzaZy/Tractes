import { describe, expect, it } from 'vitest'
import pkg from '../../package.json'
import { APP_VERSION, CHANGELOG } from './changelog'

const semver = /^\d+\.\d+\.\d+$/
const parts = (v: string) => v.split('.').map(Number) as [number, number, number]

describe('changelog', () => {
  it('uses valid versions and ISO dates', () => {
    for (const r of CHANGELOG) {
      expect(r.version).toMatch(semver)
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(r.changes.length).toBeGreaterThan(0)
    }
  })

  it('is sorted newest first with unique versions', () => {
    const versions = CHANGELOG.map((r) => r.version)
    expect(new Set(versions).size).toBe(versions.length)
    for (let i = 1; i < CHANGELOG.length; i++) {
      const [a, b] = [parts(CHANGELOG[i - 1]!.version), parts(CHANGELOG[i]!.version)]
      const newer = a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
      expect(newer).toBeGreaterThan(0)
    }
  })

  it('keeps package.json in step with the latest release', () => {
    expect(APP_VERSION).toBe(CHANGELOG[0]!.version)
    expect(pkg.version).toBe(APP_VERSION)
  })
})
