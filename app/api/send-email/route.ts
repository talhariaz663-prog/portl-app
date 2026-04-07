import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, to, projectName, stageName, clientName, portalUrl, designerEmail, revisionNote } = body

    let subject = ''
    let html = ''

    if (type === 'approval_requested') {
      subject = `Your approval is needed — ${projectName}`
      html = `
        <div style="font-family:'Outfit',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E4E4E8;">
          <div style="background:#0c0e1a;padding:28px 32px;">
            <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
              Portl<span style="color:#5B4CF5;">.</span>
            </div>
          </div>
          <div style="padding:32px;">
            <div style="display:inline-block;background:rgba(91,76,245,0.08);border:1px solid rgba(91,76,245,0.2);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;color:#5B4CF5;letter-spacing:0.05em;margin-bottom:20px;">
              ACTION REQUIRED
            </div>
            <h1 style="font-size:24px;font-weight:800;color:#12111A;letter-spacing:-0.5px;margin:0 0 10px;">
              Your approval is needed
            </h1>
            <p style="font-size:15px;color:#6B6B7A;line-height:1.6;margin:0 0 24px;">
              Hi ${clientName}, <strong style="color:#12111A;">${designerEmail}</strong> has requested your approval on <strong style="color:#12111A;">${stageName}</strong> for the project <strong style="color:#12111A;">${projectName}</strong>.
            </p>
            <a href="${portalUrl}" style="display:inline-block;background:#5B4CF5;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:-0.2px;">
              Review &amp; Approve →
            </a>
            <p style="font-size:12px;color:#8A8A9A;margin-top:24px;line-height:1.6;">
              Or copy this link: <a href="${portalUrl}" style="color:#5B4CF5;">${portalUrl}</a>
            </p>
          </div>
          <div style="padding:20px 32px;border-top:1px solid #E4E4E8;background:#F5F6FA;">
            <p style="font-size:12px;color:#8A8A9A;margin:0;">
              Powered by <strong style="color:#12111A;">Portl.</strong> — Client portals for creative freelancers
            </p>
          </div>
        </div>
      `
    }

    if (type === 'client_approved') {
      subject = `✓ ${clientName} approved ${stageName} — ${projectName}`
      html = `
        <div style="font-family:'Outfit',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E4E4E8;">
          <div style="background:#0c0e1a;padding:28px 32px;">
            <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
              Portl<span style="color:#5B4CF5;">.</span>
            </div>
          </div>
          <div style="padding:32px;">
            <div style="display:inline-block;background:rgba(11,171,108,0.08);border:1px solid rgba(11,171,108,0.2);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;color:#0BAB6C;letter-spacing:0.05em;margin-bottom:20px;">
              APPROVED
            </div>
            <h1 style="font-size:24px;font-weight:800;color:#12111A;letter-spacing:-0.5px;margin:0 0 10px;">
              ${clientName} approved your work
            </h1>
            <p style="font-size:15px;color:#6B6B7A;line-height:1.6;margin:0 0 24px;">
              Great news! <strong style="color:#12111A;">${clientName}</strong> has approved <strong style="color:#12111A;">${stageName}</strong> on <strong style="color:#12111A;">${projectName}</strong>. You can now move to the next stage.
            </p>
            <a href="https://portl-app.vercel.app/dashboard" style="display:inline-block;background:#0BAB6C;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:15px;font-weight:700;">
              View Project →
            </a>
          </div>
          <div style="padding:20px 32px;border-top:1px solid #E4E4E8;background:#F5F6FA;">
            <p style="font-size:12px;color:#8A8A9A;margin:0;">
              Powered by <strong style="color:#12111A;">Portl.</strong> — Client portals for creative freelancers
            </p>
          </div>
        </div>
      `
    }

    if (type === 'revision_requested') {
      subject = `${clientName} requested changes on ${stageName} — ${projectName}`
      html = `
        <div style="font-family:'Outfit',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E4E4E8;">
          <div style="background:#0c0e1a;padding:28px 32px;">
            <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
              Portl<span style="color:#5B4CF5;">.</span>
            </div>
          </div>
          <div style="padding:32px;">
            <div style="display:inline-block;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;color:#EF4444;letter-spacing:0.05em;margin-bottom:20px;">
              CHANGES REQUESTED
            </div>
            <h1 style="font-size:24px;font-weight:800;color:#12111A;letter-spacing:-0.5px;margin:0 0 10px;">
              ${clientName} requested changes
            </h1>
            <p style="font-size:15px;color:#6B6B7A;line-height:1.6;margin:0 0 16px;">
              <strong style="color:#12111A;">${clientName}</strong> has reviewed <strong style="color:#12111A;">${stageName}</strong> on <strong style="color:#12111A;">${projectName}</strong> and left the following feedback:
            </p>
            ${revisionNote ? `
            <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:16px;margin-bottom:24px;">
              <p style="font-size:14px;color:#12111A;line-height:1.6;margin:0;">"${revisionNote}"</p>
              <p style="font-size:12px;color:#8A8A9A;margin:8px 0 0;">— ${clientName}</p>
            </div>
            ` : ''}
            <a href="https://portl-app.vercel.app/dashboard" style="display:inline-block;background:#EF4444;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:15px;font-weight:700;">
              View Feedback →
            </a>
          </div>
          <div style="padding:20px 32px;border-top:1px solid #E4E4E8;background:#F5F6FA;">
            <p style="font-size:12px;color:#8A8A9A;margin:0;">
              Powered by <strong style="color:#12111A;">Portl.</strong> — Client portals for creative freelancers
            </p>
          </div>
        </div>
      `
    }

    const { data, error } = await resend.emails.send({
      from: 'Portl <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Email route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
