import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
afterEach(cleanup)
vi.stubGlobal('scrollTo', vi.fn())
vi.stubEnv('VITE_MODO_DEMONSTRACAO', 'true')

if (typeof HTMLDialogElement !== 'undefined') Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.open = true } })
if (typeof HTMLDialogElement !== 'undefined') Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.open = false } })


