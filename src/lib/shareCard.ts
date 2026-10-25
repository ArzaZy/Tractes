import { STATUS_LABELS } from './utils'

export const CARD_W = 1200
export const CARD_H = 630

/** Greedy word wrap that ends with an ellipsis when the text does not fit in `maxLines`. */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const all: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (!line || measure(test) <= maxWidth) {
      line = test
    } else {
      all.push(line)
      line = w
    }
  }
  if (line) all.push(line)
  if (all.length <= maxLines) return all

  const out = all.slice(0, maxLines)
  let last = out[maxLines - 1]!
  while (last.length > 1 && measure(`${last}…`) > maxWidth) last = last.slice(0, -1).trimEnd()
  out[maxLines - 1] = `${last}…`
  return out
}

interface QRModule {
  addData(data: string): void
  make(): void
  getModuleCount(): number
  isDark(row: number, col: number): boolean
}
type QRFactory = (type: number, level: 'L' | 'M' | 'Q' | 'H') => QRModule

/** Builds a QR matrix for `text`. The encoder is loaded on demand so it never weighs on normal page loads. */
export async function qrMatrix(text: string): Promise<boolean[][]> {
  const mod = (await import('qrcode-generator')) as unknown as QRFactory & { default?: QRFactory }
  const factory: QRFactory = mod.default ?? mod
  const qr = factory(0, 'M')
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)))
}

/** Loads an image for canvas use. Resolves null if it is missing or blocks cross-origin use. */
export function loadImage(url: string | null | undefined): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export interface ShareCardData {
  name: string
  description: string
  category?: string | null
  statusLabel: string
  siteName: string
  host: string
  logo: HTMLImageElement | null
  qr: boolean[][] | null
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function chip(ctx: CanvasRenderingContext2D, label: string, x: number, y: number): number {
  ctx.font = '600 22px system-ui, -apple-system, "Segoe UI", sans-serif'
  const w = ctx.measureText(label).width + 36
  roundRectPath(ctx, x, y, w, 40, 20)
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = '#e7edf8'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + 18, y + 21)
  return w
}

/** Draws the liquid-glass share card onto a 1200x630 canvas. */
export function drawShareCard(canvas: HTMLCanvasElement, d: ShareCardData): void {
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const font = (w: number, s: number) => `${w} ${s}px system-ui, -apple-system, "Segoe UI", sans-serif`

  // Background with ambient colour fields
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H)
  bg.addColorStop(0, '#09090d')
  bg.addColorStop(1, '#1a1233')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  for (const [x, y, r, c] of [
    [180, 40, 520, 'rgba(124,77,255,0.5)'],
    [1080, 120, 460, 'rgba(139,92,246,0.38)'],
    [900, 640, 480, 'rgba(182,156,252,0.3)'],
  ] as [number, number, number, string][]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, c)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, CARD_W, CARD_H)
  }

  // Glass panel
  roundRectPath(ctx, 48, 48, 1104, 534, 44)
  const panel = ctx.createLinearGradient(48, 48, 1152, 582)
  panel.addColorStop(0, 'rgba(255,255,255,0.16)')
  panel.addColorStop(1, 'rgba(255,255,255,0.05)')
  ctx.fillStyle = panel
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Logo (or initials)
  roundRectPath(ctx, 96, 96, 112, 112, 28)
  ctx.save()
  ctx.clip()
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fillRect(96, 96, 112, 112)
  if (d.logo) {
    ctx.drawImage(d.logo, 96, 96, 112, 112)
  } else {
    ctx.fillStyle = '#e7edf8'
    ctx.font = font(700, 48)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(d.name.trim().slice(0, 2).toUpperCase(), 152, 154)
  }
  ctx.restore()
  ctx.textAlign = 'left'

  // Chips
  let cx = 232
  if (d.category) cx += chip(ctx, d.category, cx, 112) + 12
  chip(ctx, d.statusLabel, cx, 112)

  // Name + description
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#ffffff'
  ctx.font = font(700, 64)
  const nameLines = wrapLines(d.name, 680, (s) => ctx.measureText(s).width, 2)
  nameLines.forEach((l, i) => ctx.fillText(l, 96, 296 + i * 72))

  ctx.fillStyle = 'rgba(231,237,248,0.78)'
  ctx.font = font(400, 30)
  const top = 296 + (nameLines.length - 1) * 72 + 56
  wrapLines(d.description, 680, (s) => ctx.measureText(s).width, 3).forEach((l, i) => ctx.fillText(l, 96, top + i * 42))

  // QR code
  if (d.qr && d.qr.length > 0) {
    const box = 280
    const bx = 1152 - 48 - box
    const by = 262
    roundRectPath(ctx, bx, by, box, box, 28)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    const n = d.qr.length
    const cell = Math.floor((box - 40) / n)
    const size = cell * n
    const ox = bx + (box - size) / 2
    const oy = by + (box - size) / 2
    ctx.fillStyle = '#0f0c1c'
    d.qr.forEach((row, r) => row.forEach((dark, c) => dark && ctx.fillRect(ox + c * cell, oy + r * cell, cell, cell)))
  }

  // Footer
  ctx.fillStyle = '#ffffff'
  ctx.font = font(700, 26)
  ctx.fillText(d.siteName, 96, 548)
  const w = ctx.measureText(d.siteName).width
  ctx.fillStyle = 'rgba(231,237,248,0.6)'
  ctx.font = font(400, 24)
  ctx.fillText(`  ·  ${d.host}`, 96 + w, 548)
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'))
}

/** Builds the PNG share card for a project. */
export async function buildShareCard(
  project: { name: string; short_description: string; logo_url: string | null; status: keyof typeof STATUS_LABELS; categories?: { name: string } | null; category?: { name: string } | null },
  url: string,
  siteName = 'TracLabs',
): Promise<Blob> {
  const [logo, qr] = await Promise.all([loadImage(project.logo_url), qrMatrix(url).catch(() => null)])
  const canvas = document.createElement('canvas')
  drawShareCard(canvas, {
    name: project.name,
    description: project.short_description,
    category: project.category?.name ?? project.categories?.name ?? null,
    statusLabel: STATUS_LABELS[project.status],
    siteName,
    host: new URL(url).host,
    logo,
    qr,
  })
  return canvasToBlob(canvas)
}
