
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

let paymentLimiter: Ratelimit | null = null

function getPaymentLimiter() {
  if (!paymentLimiter) {
    const redis = Redis.fromEnv()

    paymentLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      prefix: 'marketplaceos:payment',
    })
  }

  return paymentLimiter
}

export async function rateLimitPayment(userId: string) {
  return getPaymentLimiter().limit(userId)
}
