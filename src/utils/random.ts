export const randomUUID = () => crypto.randomUUID().replace(/-/g, '')

export const randomString = (length: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(Math.ceil(length / 2))))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length)
