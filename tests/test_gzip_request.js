import { expect } from 'chai'
import http from 'node:http'
import zlib from 'node:zlib'
import nock from '../index.ts'

it('should accept and decode gzip encoded application/json', done => {
  const message = {
    my: 'contents',
  }

  nock('http://example.test')
    .post('/')
    .reply(async request => {
      expect(await request.json()).to.deep.equal(message)
      done()
      return [200]
    })

  const req = http.request({
    hostname: 'example.test',
    path: '/',
    method: 'POST',
    headers: {
      'content-encoding': 'gzip',
      'content-type': 'application/json',
    },
  })

  const compressedMessage = zlib.gzipSync(JSON.stringify(message))
  req.write(compressedMessage)
  req.end()
})

it('should accept and decode gzip encoded application/json, when headers come from a client as an array', done => {
  const message = {
    my: 'contents',
  }

  const scope = nock('http://example.test').post('/', message).reply(200)

  const req = http.request({
    hostname: 'example.test',
    path: '/',
    method: 'POST',
    headers: {
      'content-encoding': ['gzip'],
      'content-type': ['application/json'],
    },
  })
  req.on('response', () => {
    scope.done()
    done()
  })

  const compressedMessage = zlib.gzipSync(JSON.stringify(message))
  req.write(compressedMessage)
  req.end()
})

it('should accept and decode deflate encoded application/json', done => {
  const message = {
    my: 'contents',
  }

  nock('http://example.test')
    .post('/')
    .reply(async request => {
      expect(await request.json()).to.deep.equal(message)
      done()
      return [200]
    })

  const req = http.request({
    hostname: 'example.test',
    path: '/',
    method: 'POST',
    headers: {
      'content-encoding': 'deflate',
      'content-type': 'application/json',
    },
  })

  const compressedMessage = zlib.deflateSync(JSON.stringify(message))

  req.write(compressedMessage)
  req.end()
})

it('should not decode an empty body of a non-intercepted request when content-encoding is set', async () => {
  const server = http.createServer((req, res) => {
    req.resume()
    req.on('end', () => res.end('ok'))
  })
  await new Promise(resolve => server.listen(0, resolve))
  const origin = `http://localhost:${server.address().port}`

  try {
    const status = await new Promise((resolve, reject) => {
      const req = http.request(origin, {
        method: 'POST',
        headers: { 'content-encoding': 'gzip' },
      })
      req.on('response', res => resolve(res.statusCode))
      req.on('error', reject)
      req.end()
    })

    expect(status).to.equal(200)
  } finally {
    server.close()
  }
})
