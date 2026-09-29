/**
 * 静态服务器：把 out/renderer 按请求从磁盘读出（不缓存），供无头 Chrome 验收渲染层。
 * 用法：node tools/serve-renderer.mjs <dir=out/renderer> <port=5188>
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.argv[2] || 'out/renderer')
const PORT = Number(process.argv[3] || 5188)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json'
}

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0])
    if (urlPath === '/') urlPath = '/index.html'
    const fp = path.join(ROOT, urlPath)
    if (!fp.startsWith(ROOT)) {
      res.writeHead(403)
      res.end('forbidden')
      return
    }
    fs.readFile(fp, (err, data) => {
      if (err) {
        // SPA 兜底：未知路径回 index.html（本项目路由全在内存，正常不会走到）
        fs.readFile(path.join(ROOT, 'index.html'), (e2, idx) => {
          if (e2) {
            res.writeHead(404)
            res.end('not found')
          } else {
            res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' })
            res.end(idx)
          }
        })
        return
      }
      const ext = path.extname(fp)
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' })
      res.end(data)
    })
  } catch (e) {
    res.writeHead(500)
    res.end(String(e))
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`serve-renderer ready: http://127.0.0.1:${PORT}  root=${ROOT}`)
})
