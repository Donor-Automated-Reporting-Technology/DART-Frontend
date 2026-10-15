/**
 * Passes every /api request on to the WellReach API.
 *
 * The website's server (Vercel) sits between the browser and the API, so the
 * API would otherwise see Vercel's address for every web user — in the
 * activity log, at sign-in and in the rate limiter. This adds the visitor's
 * real address, with a shared secret (NUXT_WEB_PROXY_SECRET on Vercel, the
 * same value as WEB_PROXY_SECRET on the API) that proves it comes from here
 * and not from the browser.
 */
import { defineEventHandler, getRequestHeader, getRequestIP, proxyRequest } from 'h3'

const CLIENT_IP = 'x-wellreach-client-ip'
const SECRET = 'x-wellreach-proxy-secret'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const target = String(config.apiBaseUrl).replace(/\/$/, '') + event.path.replace(/^\/api/, '')

  // A browser's own copies of these headers are never passed on.
  const headers: Record<string, string> = {}
  delete event.node.req.headers[CLIENT_IP]
  delete event.node.req.headers[SECRET]

  const secret = String(config.webProxySecret || '')
  // Vercel sets x-real-ip and x-forwarded-for to the visitor's address
  // itself, replacing anything the browser sent.
  const ip = getRequestHeader(event, 'x-real-ip') || getRequestIP(event, { xForwardedFor: true })
  if (secret && ip) {
    headers[CLIENT_IP] = ip.split(',')[0]!.trim()
    headers[SECRET] = secret
  }
  return proxyRequest(event, target, { headers })
})
