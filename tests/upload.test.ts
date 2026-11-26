
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upload: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.getUser,
    },
    storage: {
      from: vi.fn(() => ({
        upload: mocks.upload,
      })),
    },
  })),
}))

import { POST } from '../app/api/upload/route'

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'customer-123' } },
      error: null,
    })

    mocks.upload.mockResolvedValue({
      data: { path: 'customer-123/test.png' },
      error: null,
    })
  })

  it('rejects unauthenticated users', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: new FormData(),
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('rejects requests without a file', async () => {
    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: new FormData(),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('rejects unsupported file types', async () => {
    const formData = new FormData()
    formData.append(
      'file',
      new File(['hello'], 'test.txt', { type: 'text/plain' })
    )

    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('rejects files larger than 10 MB', async () => {
    const formData = new FormData()
    const largeFile = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      'large.png',
      { type: 'image/png' }
    )

    formData.append('file', largeFile)

    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('uploads a valid PNG file successfully', async () => {
    const formData = new FormData()
    const file = new File(['fake image content'], 'test.png', {
      type: 'image/png',
    })

    formData.append('file', file)

    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(mocks.upload).toHaveBeenCalled()
    expect(mocks.upload.mock.calls[0][0]).toMatch(/^customer-123\//)
  })
})
