// Minimal typing for the parts of qrcode-generator that we use.
declare module 'qrcode-generator' {
  interface QRCode {
    addData(data: string): void
    make(): void
    getModuleCount(): number
    isDark(row: number, col: number): boolean
  }
  const qrcode: (typeNumber: number, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H') => QRCode
  export default qrcode
}
