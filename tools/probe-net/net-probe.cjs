/**
 * 网络可达性探针：用应用真实的传输层（http.ts，net 优先 / node 回退）去请求
 * 应用实际用到的域名，回答「本机现在到底能不能取到数据」。
 *
 * 跑法：
 *   node_modules/esbuild/bin/esbuild tools/probe-net/net-entry.ts --bundle --platform=node \
 *     --format=cjs --external:electron --tsconfig=tsconfig.node.json --outfile=tools/probe-net/net-bundle.cjs
 *   env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS node_modules/electron/dist/electron.exe \
 *     tools/probe-net/net-probe.cjs --no-sandbox
 */
const { app } = require('electron')
const { fetchText, proxyLabel } = require('./net-bundle.cjs')

const TARGETS = [
  ['api.steampowered.com', 'https://api.steampowered.com/ISteamWebAPIUtil/GetServerInfo/v1/'],
  ['store.steampowered.com', 'https://store.steampowered.com/api/appdetails?appids=570&cc=cn&l=schinese'],
  ['steamcommunity.com', 'https://steamcommunity.com/openid/login'],
  ['avatars.steamstatic.com', 'https://avatars.steamstatic.com/'],
  ['cdn.cloudflare.steamstatic.com', 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg']
]

let pass = 0
let fail = 0
function chk(name, ok, detail) {
  if (ok) pass += 1
  else fail += 1
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ' + detail)
}

app.whenReady().then(async () => {
  console.log('=== 网络可达性探针（走应用真实传输层）===\n')
  for (const [label, url] of TARGETS) {
    const t0 = Date.now()
    let r
    try {
      r = await fetchText(url, { timeoutMs: 12000 })
    } catch (e) {
      chk(label, false, '抛异常 ' + e.message)
      continue
    }
    const ms = Date.now() - t0
    // 404 也算「链路通」：这些 URL 有的是目录、有的需要参数，重点在能否握手拿到响应
    const ok = r.status !== null
    chk(label, ok, 'via=' + (r.via || '-') + ' status=' + (r.status === null ? '-' : r.status) + ' ' + ms + 'ms ' + (r.error ? 'err=' + r.error : 'len=' + r.body.length))
  }
  console.log('\n--- 传输上下文 ---')
  console.log('resolveProxy(api.steampowered.com) = ' + (await proxyLabel(TARGETS[0][1])))
  console.log('\n结果：' + pass + ' PASS / ' + fail + ' FAIL')
  app.exit(fail === 0 ? 0 : 1)
})
