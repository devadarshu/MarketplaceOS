
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.email) {
      return NextResponse.json(
        { error: 'Please log in first.' },
        { status: 401 }
      )
    }

    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Resend API key is missing.' },
        { status: 500 }
      )
    }

    const resend = new Resend(apiKey)

    const { data, error } = await resend.emails.send({
      from: 'MarketplaceOS <onboarding@resend.dev>',
      to: [process.env.RESEND_TEST_EMAIL!],
      subject: 'MarketplaceOS Email Integration Test',
      html: `
        <h2>Welcome to MarketplaceOS!</h2>
        <p>Your email integration is working successfully.</p>
        <p>This is a test email sent using Resend.</p>
        <p>Thank you!</p>
      `,
    })

    if (error) {
      console.error('Resend error:', error)

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully!',
      emailId: data?.id,
    })
  } catch (error) {
    console.error('Email API error:', error)

    return NextResponse.json(
      { error: 'Unable to send test email.' },
      { status: 500 }
    )
  }
}
