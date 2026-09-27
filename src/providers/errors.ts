export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} "${id}" nicht gefunden`)
    this.name = 'NotFoundError'
  }
}

export class ProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ProviderError'
  }
}
