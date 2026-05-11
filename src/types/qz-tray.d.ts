declare module 'qz-tray' {
  interface PrinterConfig {
    getPrinter(): string
  }

  interface QzWebsocket {
    connect(options?: { host?: string; port?: { secure?: number[]; insecure?: number[] }; retries?: number; delay?: number }): Promise<void>
    disconnect(): Promise<void>
    isActive(): boolean
  }

  interface QzPrinters {
    find(query?: string): Promise<string | string[]>
    getDefault(): Promise<string>
  }

  interface QzConfigs {
    create(printer: string, options?: Record<string, unknown>): PrinterConfig
  }

  interface QzSecurity {
    setCertificatePromise(fn: (resolve: (cert: string) => void, reject: (err: unknown) => void) => void): void
    setSignatureAlgorithm(alg: string): void
    setSignaturePromise(fn: (toSign: string) => (resolve: (sig: string) => void, reject: (err: unknown) => void) => void): void
  }

  type PrintData = string | { type: string; format: string; data: string }

  const websocket: QzWebsocket
  const printers: QzPrinters
  const configs: QzConfigs
  const security: QzSecurity

  function print(config: PrinterConfig, data: PrintData[]): Promise<void>
}
