/**
 * 用 Electron 的 Chromium 渲染引擎把 SVG 转成 PNG
 * 运行方式：node_modules/.bin/electron scripts/render-icon.js
 */
const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const SIZES = [16, 32, 64, 128, 256, 512, 1024]
const SVG_FILE = path.join(__dirname, '../assets/icon.svg')
const OUT_DIR = path.join(__dirname, '../assets/iconset')

// 写一个固定的中间 HTML（用绝对路径引用 SVG）
const TMP_HTML = path.join(OUT_DIR, '_render.html')

app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  // 写一次中间 HTML，SVG 用绝对路径
  const svgAbsPath = SVG_FILE.replace(/\\/g, '/')
  const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin:0; padding:0; }
  html, body { width:1024px; height:1024px; overflow:hidden; background:transparent; }
  img { width:1024px; height:1024px; display:block; }
</style>
</head>
<body><img id="icon" src="file://${svgAbsPath}" /></body>
</html>`
  fs.writeFileSync(TMP_HTML, html)

  // 创建一个 1024x1024 的离屏窗口，复用
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true }
  })

  await win.loadFile(TMP_HTML)
  await new Promise(r => setTimeout(r, 600))

  // 先拿到 1024 版本的完整截图
  const fullImage = await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 })

  win.destroy()
  fs.unlinkSync(TMP_HTML)

  // 用 sips 从 1024.png 缩放到所有需要的尺寸
  const src1024 = path.join(OUT_DIR, 'icon_1024x1024.png')
  fs.writeFileSync(src1024, fullImage.toPNG())
  console.log(`✓ 生成 icon_1024x1024.png`)

  const { execSync } = require('child_process')

  for (const size of SIZES.filter(s => s !== 1024)) {
    const out = path.join(OUT_DIR, `icon_${size}x${size}.png`)
    execSync(`sips -z ${size} ${size} "${src1024}" --out "${out}"`)
    console.log(`✓ 生成 icon_${size}x${size}.png`)
  }

  // @2x Retina 版本
  const retinaMap = { 16: 32, 32: 64, 128: 256, 256: 512, 512: 1024 }
  for (const [logical, physical] of Object.entries(retinaMap)) {
    const src = path.join(OUT_DIR, `icon_${physical}x${physical}.png`)
    const dst = path.join(OUT_DIR, `icon_${logical}x${logical}@2x.png`)
    fs.copyFileSync(src, dst)
    console.log(`✓ @2x: icon_${logical}x${logical}@2x.png`)
  }

  console.log('\n所有 PNG 生成完毕')
  app.quit()
})
