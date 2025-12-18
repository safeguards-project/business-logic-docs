import { createServer, IncomingMessage, ServerResponse } from 'http'
import crypto from 'crypto'
import { spawn } from 'child_process'

interface WebhookPayload {
  action?: string
  ref?: string
  repository?: {
    full_name: string
    name: string
  }
  head_commit?: {
    id: string
    message: string
    author: {
      name: string
    }
  }
  sender?: {
    login: string
  }
}

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ''
const PORT = parseInt(process.env.WEBHOOK_PORT || '3000', 10)

function verifySignature(payload: string, signature: string | undefined): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('WEBHOOK_SECRET not set, skipping signature verification')
    return true
  }

  if (!signature) {
    return false
  }

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

function runExtraction(ref: string, commitSha: string, commitMessage: string): void {
  console.log(`Starting extraction for ref: ${ref}, commit: ${commitSha}`)

  const child = spawn('npm', ['run', 'extract'], {
    env: {
      ...process.env,
      SOURCE_REF: ref,
      SOURCE_COMMIT_SHA: commitSha,
      SOURCE_COMMIT_MESSAGE: commitMessage
    },
    stdio: 'inherit'
  })

  child.on('close', (code) => {
    if (code === 0) {
      console.log('Extraction completed successfully')
    } else {
      console.error(`Extraction failed with code ${code}`)
    }
  })

  child.on('error', (error) => {
    console.error('Failed to start extraction:', error)
  })
}

function handlePush(payload: WebhookPayload): void {
  const ref = payload.ref || 'refs/heads/main'
  const commitSha = payload.head_commit?.id || 'unknown'
  const commitMessage = payload.head_commit?.message || 'No message'

  console.log(`Push event received:`)
  console.log(`  Repository: ${payload.repository?.full_name}`)
  console.log(`  Ref: ${ref}`)
  console.log(`  Commit: ${commitSha}`)
  console.log(`  Message: ${commitMessage}`)

  const mainBranches = ['refs/heads/main', 'refs/heads/master']
  if (mainBranches.includes(ref)) {
    runExtraction(ref, commitSha, commitMessage)
  } else {
    console.log(`Ignoring push to non-main branch: ${ref}`)
  }
}

function handleRepositoryDispatch(payload: WebhookPayload): void {
  console.log('Repository dispatch event received')
  const clientPayload = (payload as Record<string, unknown>).client_payload as Record<string, string> | undefined

  runExtraction(
    clientPayload?.ref || 'main',
    clientPayload?.commit_sha || 'unknown',
    clientPayload?.commit_message || 'Dispatch trigger'
  )
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  if (req.url !== '/webhook' && req.url !== '/') {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  const chunks: Buffer[] = []

  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk)
  })

  req.on('end', () => {
    const body = Buffer.concat(chunks).toString()
    const signature = req.headers['x-hub-signature-256'] as string | undefined

    if (!verifySignature(body, signature)) {
      console.error('Invalid webhook signature')
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid signature' }))
      return
    }

    let payload: WebhookPayload
    try {
      payload = JSON.parse(body) as WebhookPayload
    } catch (error) {
      console.error('Invalid JSON payload:', error)
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid JSON' }))
      return
    }

    const event = req.headers['x-github-event'] as string

    switch (event) {
      case 'push':
        handlePush(payload)
        break
      case 'repository_dispatch':
        handleRepositoryDispatch(payload)
        break
      case 'ping':
        console.log('Ping received from GitHub')
        break
      default:
        console.log(`Ignoring event: ${event}`)
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', event }))
  })
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error('Request handler error:', error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  })
})

server.listen(PORT, () => {
  console.log(`Webhook handler listening on port ${PORT}`)
  console.log(`Webhook URL: http://localhost:${PORT}/webhook`)
  if (!WEBHOOK_SECRET) {
    console.warn('Warning: WEBHOOK_SECRET not set. Signature verification disabled.')
  }
})

process.on('SIGTERM', () => {
  console.log('Shutting down webhook handler...')
  server.close(() => {
    process.exit(0)
  })
})
