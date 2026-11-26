
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please log in first.' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Please select a file.' },
        { status: 400 }
      )
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File must be between 1 byte and 10 MB.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPG, PNG, WEBP and PDF files are allowed.' },
        { status: 400 }
      )
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'file'
    const safeExtension = /^[a-z0-9]+$/.test(extension)
      ? extension
      : 'file'

    const filePath = `${user.id}/${crypto.randomUUID()}.${safeExtension}`

    const { data, error } = await supabase.storage
      .from('marketplace-files')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json(
        { error: 'Upload failed. Check Storage permissions.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully!',
      path: data.path,
    })
  } catch (error) {
    console.error('Upload API error:', error)

    return NextResponse.json(
      { error: 'Unable to upload file.' },
      { status: 500 }
    )
  }
}
