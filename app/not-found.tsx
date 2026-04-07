'use client';

import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 20px", textAlign:"center", fontFamily:"'Outfit',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .btn-primary { background:#5B4CF5; color:#fff; border:none; border-radius:10px; padding:11px 22px; font-size:14px; font-weight:700; font-family:'Outfit',sans-serif; cursor:pointer; transition:background 0.15s,transform 0.15s; }
        .btn-primary:hover { background:#4A3DE0; transform:translateY(-1px); }
        .btn-ghost { background:#fff; color:#6B6B7A; border:1px solid #E4E4E8; border-radius:10px; padding:11px 22px; font-size:14px; font-weight:500; font-family:'Outfit',sans-serif; cursor:pointer; transition:background 0.15s,border-color 0.15s; }
        .btn-ghost:hover { background:#F5F6FA; border-color:#D0D0D8; }
        .btn-row { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
        @media(max-width:360px) {
          .btn-row { flex-direction:column; width:100%; max-width:280px; margin:0 auto; }
          .btn-primary, .btn-ghost { width:100%; }
        }
      `}</style>

      {/* 1. Logo */}
      <div style={{ marginBottom:"48px" }}>
        <span style={{ fontSize:"22px", fontWeight:900, letterSpacing:"-0.5px", color:"#12111A" }}>
          Portl<span style={{ color:"#5B4CF5" }}>.</span>
        </span>
      </div>

      {/* 2. Illustration card */}
      <div style={{ position:"relative", width:"120px", height:"120px", margin:"0 auto 32px", background:"#fff", border:"1px solid #E4E4E8", borderRadius:"28px", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:"72px", fontWeight:900, color:"#E4E4E8", letterSpacing:"-4px", lineHeight:1 }}>404</span>
        <div style={{ position:"absolute", top:"14px", right:"14px", width:"12px", height:"12px", borderRadius:"50%", background:"#5B4CF5" }} />
      </div>

      {/* 3. Badge */}
      <span style={{ display:"inline-block", background:"rgba(91,76,245,0.08)", border:"1px solid rgba(91,76,245,0.2)", borderRadius:"999px", padding:"4px 12px", fontSize:"13px", fontWeight:700, color:"#5B4CF5", marginBottom:"20px" }}>
        Page not found
      </span>

      {/* 4. Heading */}
      <h1 style={{ fontSize:"clamp(22px,4vw,30px)", fontWeight:800, color:"#12111A", letterSpacing:"-0.6px", marginBottom:"10px", lineHeight:1.2 }}>
        This portal doesn&apos;t exist. Yet.
      </h1>

      {/* 5. Subtext */}
      <p style={{ fontSize:"14px", color:"#8A8A9A", lineHeight:1.6, maxWidth:"340px", margin:"0 auto 32px" }}>
        The page you&apos;re looking for has moved, expired, or never existed. Let&apos;s get you back on track.
      </p>

      {/* 6. Action buttons */}
      <div className="btn-row">
        <button className="btn-primary" onClick={() => router.push('/dashboard')}>← Back to Studio</button>
        <button className="btn-ghost"   onClick={() => router.push('/login')}>Go to Login</button>
      </div>

      {/* 7. Portal hint card */}
      <div style={{ background:"#fff", border:"1px solid #E4E4E8", borderRadius:"12px", padding:"14px 20px", maxWidth:"340px", margin:"48px auto 0", textAlign:"left" }}>
        <div style={{ fontSize:"11px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"#8A8A9A", marginBottom:"6px" }}>
          Looking for a client portal?
        </div>
        <p style={{ fontSize:"13px", color:"#6B6B7A", lineHeight:1.5 }}>
          Check the link your designer sent you. Portal URLs look like{" "}
          <span style={{ color:"#5B4CF5", fontWeight:600 }}>portl-app.vercel.app/portal/your-project</span>
        </p>
      </div>
    </div>
  );
}
