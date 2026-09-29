/**
 * 导出：CSV（手写 + UTF-8 BOM）/ XLSX（exceljs 真写，表头加粗、冻结首行、列宽）/ PNG（捕获渲染页）/ PDF（printToPDF）。
 * 全部走 dialog.showSaveDialog；用户取消返回 { ok:false, cancelled:true }，绝不抛错。
 */
import { BrowserWindow, dialog, type SaveDialogReturnValue } from 'electron'
import fs from 'node:fs'
import ExcelJS from 'exceljs'
import type { ExportResult, TableExportRequest, WrappedExportRequest } from '@shared/contract'
import { CH } from '@shared/channels'
import * as repo from './repository'

let mainWin: BrowserWindow | null = null
export function setExporterWindow(win: BrowserWindow): void { mainWin = win }

const QUERY_OF: Record<TableExportRequest['kind'], 'games' | 'sessions' | 'achievements' | 'wishlist' | 'discounts'> = {
  games: 'games', sessions: 'sessions', achievements: 'achievements', wishlist: 'wishlist', discounts: 'discounts'
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (Array.isArray(v) || typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
function csvEscape(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

async function pickPath(defaultName: string, ext: string): Promise<string | null> {
  const res: SaveDialogReturnValue = await dialog.showSaveDialog({
    title: '导出文件', defaultPath: defaultName, filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
  })
  if (res.canceled || !res.filePath) return null
  return res.filePath
}

/** 导出单张表为 CSV 或 XLSX。 */
export async function exportTable(req: TableExportRequest): Promise<ExportResult> {
  const rows = repo.query(QUERY_OF[req.kind])
  const recs = rows as Record<string, unknown>[]
  const headers = recs.length ? Object.keys(recs[0]) : []
  const lines = recs.map((r) => headers.map((h) => cell(r[h])))
  const ext = req.format
  const filePath = await pickPath(`steam-insight-${req.kind}`, ext)
  if (!filePath) return { ok: false, cancelled: true }
  try {
    if (ext === 'csv') {
      const csv = '﻿' + headers.join(',') + '\r\n' + lines.map((l) => l.map(csvEscape).join(',')).join('\r\n')
      fs.writeFileSync(filePath, csv, 'utf8')
    } else {
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('export')
      ws.addRow(headers)
      ws.getRow(1).font = { bold: true }
      ws.columns = headers.map((h) => ({ width: Math.min(60, Math.max(12, h.length * 2)) }))
      for (const l of lines) ws.addRow(l)
      ws.views = [{ state: 'frozen', ySplit: 1 }]
      const buf = await wb.xlsx.writeBuffer()
      fs.writeFileSync(filePath, Buffer.from(buf))
    }
    return { ok: true, filePath }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** 让渲染层切到报告页并等它真的画完，再交给调用方截图/打印。 */
async function gotoCoversPage(win: BrowserWindow, req: WrappedExportRequest): Promise<void> {
  win.webContents.send(CH.navigate, {
    route: 'wrapped',
    params: { year: req.year, period: req.period ?? 'year', key: req.key, exportMode: req.format === 'png' ? 'png' : undefined }
  })
  // PNG 判定海报根节点；PDF 判定正文已渲染。渲染层的路由在内存里，
  // 只能这样确认「画完了」——旧实现靠 loadURL + did-finish-load，
  // 而同文档 hash 导航根本不触发该事件，导出会直接挂死。
  const probe =
    req.format === 'png'
      ? `Boolean(document.querySelector('[data-export-poster]'))`
      : `document.body.innerText.includes('STEAM WRAPPED')`
  const deadline = Date.now() + 8000
  for (;;) {
    const ready = await win.webContents.executeJavaScript(probe, true).catch(() => false)
    if (ready) return
    if (Date.now() > deadline) return
    await new Promise((r) => setTimeout(r, 120))
  }
}

/** 默认文件名后缀：年度用年份，周/月用各自的周期键。 */
function reportSuffix(req: WrappedExportRequest): string {
  if (req.period === 'month' && req.key) return req.key
  if (req.period === 'week' && req.key) return req.key
  return String(req.year)
}

/** 导出报告为 PNG（截屏）或 PDF（打印）。年度 / 月度 / 周度共用同一条链路。 */
export async function exportWrapped(req: WrappedExportRequest): Promise<ExportResult> {
  const win = mainWin
  if (!win) return { ok: false, error: '主窗口未就绪' }
  const ext = req.format
  const filePath = await pickPath(`steam-insight-wrapped-${reportSuffix(req)}`, ext)
  if (!filePath) return { ok: false, cancelled: true }
  try {
    await gotoCoversPage(win, req)
    if (ext === 'png') {
      // 窗口不够高时临时放大再还原，确保回顾海报完整
      const [w, h] = win.getContentSize()
      win.setContentSize(w, Math.max(h, 2200))
      const img = await win.webContents.capturePage()
      win.setContentSize(w, h)
      fs.writeFileSync(filePath, img.toPNG())
    } else {
      const data = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4' })
      fs.writeFileSync(filePath, data)
    }
    // 切回首页，避免用户停留在导出态
    win.webContents.send(CH.navigate, { route: 'dashboard' })
    return { ok: true, filePath }
  } catch (e) {
    win.webContents.send(CH.navigate, { route: 'dashboard' })
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
