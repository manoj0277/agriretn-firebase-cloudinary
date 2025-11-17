import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { utils, writeFile } from 'xlsx'

export const exportToExcel = (rows: Record<string, any>[], fileName: string) => {
  const ws = utils.json_to_sheet(rows)
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Data')
  writeFile(wb, `${fileName}.xlsx`)
}

export const exportToPdf = async (
  title: string,
  headers: string[],
  rows: Record<string, any>[]
) => {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const margin = 40

  const now = new Date().toLocaleString()
  const branding = 'AgriRent Admin'
  const headerText = `${title} • ${now} • ${branding}`

  let y = 800
  page.drawText(headerText, { x: margin, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) })
  y -= 24

  const drawLine = () => page.drawLine({ start: { x: margin, y }, end: { x: 595 - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
  drawLine()
  y -= 16

  const colWidth = (595 - margin * 2) / headers.length
  headers.forEach((h, i) => page.drawText(h, { x: margin + i * colWidth, y, size: 11, font, color: rgb(0, 0, 0) }))
  y -= 18
  drawLine()
  y -= 8

  const maxRowsPerPage = 35
  let count = 0
  for (const row of rows) {
    headers.forEach((h, i) => {
      const val = String(row[h] ?? '')
      page.drawText(val.slice(0, 40), { x: margin + i * colWidth, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) })
    })
    y -= 16
    count++
    if (count >= maxRowsPerPage && rows.length > count) {
      // New page
      const p = doc.addPage([595, 842])
      y = 800
      p.drawText(headerText, { x: margin, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) })
      y -= 24
      headers.forEach((h, i) => p.drawText(h, { x: margin + i * colWidth, y, size: 11, font, color: rgb(0, 0, 0) }))
      y -= 26
      count = 0
    }
  }

  const pdfBytes = await doc.save()
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}