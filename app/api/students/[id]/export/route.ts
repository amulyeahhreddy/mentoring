import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchDiaryExportData } from './data'
import { generateDiaryHTML } from './template'
import puppeteer from 'puppeteer'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role === 'mentee' && user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await fetchDiaryExportData(id)
    console.log(`[PDF Export] Student: ${data.profile?.name || id}, Sessions: ${data.sessions?.length ?? 0}, Questionnaire: ${data.initialQuestionnaire ? 'present' : 'null'}`)
    const html = generateDiaryHTML(data)

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      displayHeaderFooter: false,
    })

    await browser.close()

    const studentName = (data.profile?.name || 'student').replace(/\s+/g, '_')

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Mentoring_Diary_${studentName}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed', detail: error.message }, { status: 500 })
  }
}
