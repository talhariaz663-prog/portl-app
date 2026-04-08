"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const Icons = {
  Studio:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.9"/><rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.5"/><rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.5"/><rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.3"/></svg>,
  Projects:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7C3 5.9 3.9 5 5 5h4l2 2h8c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" fill="currentColor" opacity="0.8"/></svg>,
  Activity:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M2 12h3l3-8 4 16 3-8h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Approvals: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/><path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Payments:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" opacity="0.8"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.8" opacity="0.6"/></svg>,
  Help:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/><path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2 2-2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M12 17h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  Settings:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.8"/></svg>,
  Signout:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Plus:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  Search:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" opacity="0.6"/><path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/></svg>,
};

const SECTIONS = [
  {
    id: "getting-started",
    emoji: "✦",
    color: "#5B4CF5",
    title: "Getting Started",
    topics: [
      {
        q: "What is Portl?",
        a: "Portl is a client portal built for freelance designers. It gives you a dedicated workspace to manage projects, share design deliverables, collect client approvals, and send invoices — all in one place. Clients get a clean, branded portal to review and respond to your work without needing an account.",
      },
      {
        q: "How do I log in?",
        a: "Portl uses magic link login. Enter your email address on the login page and you'll receive a one-time link. Click that link to instantly sign in — no password required. The link expires after a few minutes.",
      },
      {
        q: "Is my data secure?",
        a: "Yes. Portl is built on Supabase which uses Row Level Security (RLS) to ensure your data is only accessible by you. File uploads are stored securely and client portals are read-only for clients — they can't modify your data.",
      },
    ],
  },
  {
    id: "studio",
    emoji: "⬡",
    color: "#7B6CF9",
    title: "Studio (Dashboard)",
    topics: [
      {
        q: "What is the Studio view?",
        a: "The Studio is your main dashboard. It gives you a bird's-eye view of all active projects, recent client activity, projects awaiting your attention, and key stats like total projects, active count, and pending approvals.",
      },
      {
        q: "What do the stats cards show?",
        a: "The stats row shows: Total Projects, Active Projects (in progress), In Review (waiting for client feedback or your response), and Approved (completed sign-offs). These update in real time based on your project data.",
      },
      {
        q: "What is the notification bell?",
        a: "The bell icon in the top right shows unread client actions — approvals and revision requests. Click it to see a dropdown of recent events. Click 'Mark all read' to clear the badge. The badge count resets when you view the notifications.",
      },
    ],
  },
  {
    id: "projects",
    emoji: "⬡",
    color: "#0BAB6C",
    title: "Projects",
    topics: [
      {
        q: "How do I create a project?",
        a: "Click the '+ New Project' button in the Studio or My Work page. Fill in the project name, client name, and client email. A portal link (slug) is auto-generated — you can customize it. Click 'Create Project' to save.",
      },
      {
        q: "What are project stages?",
        a: "Stages represent milestones in your design process (e.g. Wireframes, Visual Design, Final Delivery). You can add stages inside any project. Each stage has a status: Not Started, In Progress, or Complete. Stages help you and your client track progress at a glance.",
      },
      {
        q: "What do project statuses mean?",
        a: "• Draft — Project created but not yet active.\n• Active — You're currently working on this project.\n• In Review — A stage has been submitted for client approval.\n• Approved — The client has approved the final deliverable.",
      },
      {
        q: "Can I search and filter projects?",
        a: "Yes. The My Work page has a search bar to filter by project name or client name. You can also filter by status (All, Active, In Review, Approved, Draft) and sort by recent, name, or client.",
      },
      {
        q: "How do I delete a project?",
        a: "Open the project, scroll to the bottom, and click 'Delete Project'. This action is permanent and will also delete all associated stages and files. Client portal links for that project will stop working.",
      },
    ],
  },
  {
    id: "files",
    emoji: "↑",
    color: "#7B6CF9",
    title: "File Uploads",
    topics: [
      {
        q: "What file types can I upload?",
        a: "You can upload any file type — images (PNG, JPG, GIF, WebP), PDFs, Figma exports, ZIP files, and more. Files are stored securely in Supabase Storage.",
      },
      {
        q: "How do I upload files to a stage?",
        a: "Open a project and navigate to the stage. Click the upload zone or drag and drop files onto it. Files are uploaded immediately and appear in the stage file list. You can upload multiple files at once.",
      },
      {
        q: "Can I delete uploaded files?",
        a: "Yes. Hover over a file in the stage file list and click the delete (×) button. Deleting a file removes it from storage and the project stage permanently.",
      },
      {
        q: "Are files visible to clients?",
        a: "Yes — all files uploaded to a stage are visible to the client through their portal link. Make sure to only upload files you're ready to share before sending the portal link.",
      },
    ],
  },
  {
    id: "approvals",
    emoji: "→",
    color: "#F5A623",
    title: "Approvals & Revisions",
    topics: [
      {
        q: "How does the approval flow work?",
        a: "1. Upload your work to a stage.\n2. Click 'Request Approval' on that stage.\n3. Share the project portal link with your client.\n4. Your client reviews the work and clicks Approve or Request Revisions.\n5. You receive an activity notification and can respond accordingly.",
      },
      {
        q: "What happens when a client approves?",
        a: "The stage status updates to Complete, an activity entry is created, and you'll see a new notification. The project status may update to Approved if it's the final stage.",
      },
      {
        q: "What happens when a client requests changes?",
        a: "The activity feed shows the client's feedback message. You can view it in the Activity page or the Approvals page. Update the work, re-upload files, and request approval again.",
      },
      {
        q: "Where do I see pending approvals?",
        a: "The Approvals page (in the sidebar) shows two sections: 'Needs Your Attention' — projects where clients have requested revisions — and 'Recently Approved' — stages clients have signed off on.",
      },
      {
        q: "Do clients need an account to approve?",
        a: "No. Clients access their portal through a unique URL. They don't need to sign up or log in. They can view files and submit an approval or revision request directly.",
      },
    ],
  },
  {
    id: "payments",
    emoji: "⬥",
    color: "#E85D75",
    title: "Payments & Invoices",
    topics: [
      {
        q: "How do I create an invoice?",
        a: "Go to the Payments page from the sidebar. Click '+ New Invoice'. Fill in the client name, email, and add line items (description, quantity, unit price). Set a due date, choose a currency (USD or PKR), and add any notes. The total is calculated automatically. Click 'Create Invoice' to save.",
      },
      {
        q: "What are invoice statuses?",
        a: "• Draft — Invoice saved but not yet sent.\n• Sent — Invoice has been issued to the client.\n• Paid — Payment received and confirmed.\n• Overdue — Past the due date with no payment.",
      },
      {
        q: "How do invoice numbers work?",
        a: "Invoice numbers are auto-generated in the format INV-001, INV-002, etc. based on the total number of invoices you have. They increment automatically so you always have a unique reference number.",
      },
      {
        q: "How do I mark an invoice as paid?",
        a: "On the Payments page, find the invoice and click 'Mark as Paid'. The status updates to Paid and the paid date is recorded. You can also edit or delete invoices from the same row.",
      },
      {
        q: "Can I link an invoice to a project?",
        a: "Yes — the invoice form has an optional project dropdown. Select a project to associate the invoice with that engagement. This helps you track billing per project.",
      },
      {
        q: "What currencies are supported?",
        a: "Currently USD (US Dollar) and PKR (Pakistani Rupee) are supported. The currency is displayed on the invoice and in the invoice list.",
      },
    ],
  },
  {
    id: "portal",
    emoji: "⬡",
    color: "#5B4CF5",
    title: "Client Portal",
    topics: [
      {
        q: "What is the client portal?",
        a: "Every project has a unique client-facing URL at portl.app/portal/your-slug. When clients visit this link, they see a beautiful read-only view of your project stages and uploaded files. They can approve work or request revisions without logging in.",
      },
      {
        q: "How do I get the portal link?",
        a: "In the My Work page, hover over any project row and click the 'Share' button to copy the portal URL. You can also find it inside the project settings.",
      },
      {
        q: "Can I customize the portal link?",
        a: "Yes. When creating a project, you can customize the URL slug (the part after /portal/). Make it something recognizable like your client's name. Slugs must be unique across all projects.",
      },
      {
        q: "Can clients see all my projects?",
        a: "No. Each portal link only shows the specific project it's for. Clients cannot see other projects, your account details, or any other designer's work.",
      },
    ],
  },
  {
    id: "activity",
    emoji: "↑",
    color: "#7B6CF9",
    title: "Activity Feed",
    topics: [
      {
        q: "What shows up in the Activity feed?",
        a: "The Activity feed logs all client interactions across your projects: file uploads, approval requests, client approvals, and revision requests. Entries are grouped by date for easy scanning.",
      },
      {
        q: "Can I filter activity?",
        a: "Yes. Use the filter pills at the top of the Activity page to show: All, Approved, Changes Requested, Approval Requested, or File Uploaded events.",
      },
    ],
  },
  {
    id: "account",
    emoji: "✦",
    color: "#5B4CF5",
    title: "Account",
    topics: [
      {
        q: "How do I sign out?",
        a: "Click the Sign Out button at the bottom of the sidebar (the arrow-out icon next to your email). You'll be redirected to the login page.",
      },
      {
        q: "Can I change my email?",
        a: "Email changes are managed through Supabase Auth. Contact support if you need to update your login email.",
      },
      {
        q: "How do I get help or report a bug?",
        a: "You're already here! For additional help, reach out to the Portl team. Bug reports and feature requests are welcome.",
      },
    ],
  },
];

export default function HelpPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [userEmail,  setUserEmail]  = useState("");
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [active,     setActive]     = useState<string | null>(null);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    setUserEmail(session.user.email ?? "");
    const { data: projs } = await supabase
      .from("projects")
      .select("status")
      .eq("designer_id", session.user.id);
    setReviewCount((projs ?? []).filter((p: { status: string }) => p.status === "review").length);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "??";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const currentPath = "/dashboard/help";

  const navItems = [
    { icon: Icons.Studio,    label: "Studio",    path: "/dashboard"           },
    { icon: Icons.Projects,  label: "My Work",   path: "/dashboard/projects"  },
    { icon: Icons.Activity,  label: "Activity",  path: "/dashboard/activity"  },
    { icon: Icons.Approvals, label: "Approvals", path: "/dashboard/approvals", badge: reviewCount },
    { icon: Icons.Payments,  label: "Payments",  path: "/dashboard/payments"  },
    { icon: Icons.Help,      label: "Help",      path: "/dashboard/help"      },
    { icon: Icons.Settings,  label: "Settings",  path: "/dashboard/settings"  },
  ];

  const filteredSections = SECTIONS.map(section => ({
    ...section,
    topics: section.topics.filter(t =>
      !search ||
      t.q.toLowerCase().includes(search.toLowerCase()) ||
      t.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(s => s.topics.length > 0);

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:"#F5F6FA", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:"28px", height:"28px", border:"2px solid rgba(0,0,0,0.08)", borderTopColor:"#5B4CF5", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA", fontFamily:"'Outfit',sans-serif", color:"#12111A", display:"flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        .fi{animation:fadeUp 0.4s ease forwards;opacity:0}
        .fi1{animation-delay:0.04s}.fi2{animation-delay:0.08s}.fi3{animation-delay:0.12s}

        .sidebar{position:fixed;top:0;left:0;bottom:0;width:240px;background:linear-gradient(180deg,#0c0e1a 0%,#080a15 100%);border-right:1px solid rgba(255,255,255,0.055);display:flex;flex-direction:column;z-index:20;}
        .sidebar-logo{padding:28px 24px 20px;border-bottom:1px solid rgba(255,255,255,0.05);}
        .sidebar-nav{padding:16px 12px;flex:1;display:flex;flex-direction:column;gap:2px;}

        .nav-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;font-size:13.5px;font-weight:500;cursor:pointer;transition:all 0.18s ease;border:1px solid transparent;color:rgba(255,255,255,0.38);position:relative;}
        .nav-item:hover{color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.04);}
        .nav-item.active{color:#fff;font-weight:600;background:rgba(91,76,245,0.14);border-color:rgba(91,76,245,0.28);}
        .nav-item.active::before{content:'';position:absolute;left:-12px;top:50%;transform:translateY(-50%);width:3px;height:20px;background:linear-gradient(180deg,#5B4CF5,#7B6CF9);border-radius:0 4px 4px 0;}
        .nav-badge{margin-left:auto;min-width:20px;height:20px;border-radius:10px;background:linear-gradient(135deg,#F5A623,#E8971A);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;padding:0 6px;}

        .sidebar-bottom{padding:16px 12px 20px;border-top:1px solid rgba(255,255,255,0.05);}
        .user-card{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);}

        .topbar{display:none;position:fixed;top:0;left:0;right:0;height:60px;background:rgba(255,255,255,0.97);border-bottom:1px solid #E4E4E8;backdrop-filter:blur(20px);z-index:40;align-items:center;justify-content:space-between;padding:0 16px;}
        .main{margin-left:240px;min-height:100vh;padding:40px 48px;position:relative;flex:1;}

        .search-input{width:100%;background:#ffffff;border:1px solid #E4E4E8;border-radius:12px;padding:11px 16px 11px 42px;color:#12111A;font-family:'Outfit',sans-serif;font-size:14px;outline:none;transition:border-color 0.2s,box-shadow 0.2s;}
        .search-input::placeholder{color:#9A9AAA;}
        .search-input:focus{border-color:#5B4CF5;box-shadow:0 0 0 3px rgba(91,76,245,0.1);background:#fff;}

        .help-section{margin-bottom:40px;}
        .help-section-header{display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #E4E4E8;}

        .faq-item{border-radius:10px;background:#ffffff;border:1px solid #E4E4E8;overflow:hidden;margin-bottom:8px;transition:border-color 0.2s,box-shadow 0.2s;}
        .faq-item:hover{border-color:#D0D0D8;box-shadow:0 1px 4px rgba(0,0,0,0.06);}
        .faq-item.open{border-color:rgba(91,76,245,0.3);background:rgba(91,76,245,0.02);}

        .faq-q{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;cursor:pointer;gap:12px;}
        .faq-a{padding:0 20px 16px;font-size:13.5px;color:#4A4A5A;line-height:1.75;white-space:pre-line;border-top:1px solid #E4E4E8;}

        .mobile-menu{position:fixed;top:60px;left:0;right:0;z-index:50;background:rgba(255,255,255,0.98);border-bottom:1px solid #E4E4E8;padding:16px;backdrop-filter:blur(20px);animation:fadeIn 0.2s ease forwards;}

        @media(max-width:768px){
          .sidebar{display:none!important;}
          .topbar{display:flex!important;}
          .main{margin-left:0!important;padding:76px 16px 40px!important;}
        }
        @media(max-width:900px){
          .main{padding:40px 24px!important;}
        }
      `}</style>

      {/* BG */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",backgroundImage:"radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)",backgroundSize:"40px 40px"}} />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:"22px",fontWeight:900,letterSpacing:"-0.8px",color:"#ffffff"}}>Portl<span style={{color:"#5B4CF5"}}>.</span></span>
            <span style={{fontSize:"10px",fontWeight:700,color:"#5B4CF5",background:"rgba(91,76,245,0.15)",border:"1px solid rgba(91,76,245,0.3)",borderRadius:"6px",padding:"2px 7px",letterSpacing:"0.05em"}}>BETA</span>
          </div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.25)",marginTop:"4px"}}>Designer workspace</div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({icon:Icon,label,path,badge}) => (
            <div key={label} className={`nav-item${currentPath===path?" active":""}`} onClick={() => router.push(path)}>
              <Icon /><span>{label}</span>
              {badge != null && badge > 0 && <span className="nav-badge">{badge}</span>}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-card">
            <div style={{width:"34px",height:"34px",borderRadius:"10px",background:"linear-gradient(135deg,#5B4CF5,#0BAB6C)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:800,flexShrink:0}}>{initials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"12px",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:"rgba(255,255,255,0.85)"}}>{userEmail}</div>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,0.28)",marginTop:"1px"}}>Designer</div>
            </div>
            <button onClick={handleSignOut} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.25)",padding:"4px",borderRadius:"6px",display:"flex",alignItems:"center"}} title="Sign out"><Icons.Signout /></button>
          </div>
        </div>
      </aside>

      {/* Mobile topbar */}
      <header className="topbar">
        <span style={{fontSize:"20px",fontWeight:900,letterSpacing:"-0.6px"}}>Portl<span style={{color:"#5B4CF5"}}>.</span></span>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{background:"#F5F6FA",border:"1px solid #E4E4E8",borderRadius:"8px",width:"36px",height:"36px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#4A4A5A",fontSize:"18px"}}>☰</button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          <nav style={{display:"flex",flexDirection:"column",gap:"4px",marginBottom:"12px"}}>
            {navItems.map(({icon:Icon,label,path}) => (
              <div key={label} className={`nav-item${currentPath===path?" active":""}`} onClick={() => {router.push(path);setMenuOpen(false);}}>
                <Icon />{label}
              </div>
            ))}
          </nav>
          <div style={{borderTop:"1px solid #E4E4E8",paddingTop:"12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:"12px",color:"#6B6B7A"}}>{userEmail}</span>
            <button onClick={handleSignOut} style={{background:"none",border:"none",cursor:"pointer",color:"#6B6B7A",fontSize:"12px",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",gap:"5px"}}><Icons.Signout /> Sign out</button>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="main" style={{animation:"fadeIn 0.2s ease forwards"}}>
        {/* Header */}
        <div className="fi fi1" style={{marginBottom:"32px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"8px"}}>
            <div style={{width:"40px",height:"40px",borderRadius:"12px",background:"rgba(91,76,245,0.15)",border:"1px solid rgba(91,76,245,0.28)",display:"flex",alignItems:"center",justifyContent:"center",color:"#5B4CF5",fontSize:"18px"}}>?</div>
            <div>
              <h1 style={{fontSize:"clamp(22px,3vw,28px)",fontWeight:800,letterSpacing:"-0.6px"}}>Help &amp; Documentation</h1>
              <p style={{fontSize:"13px",color:"#8A8A9A",marginTop:"3px"}}>Everything you need to know about using Portl</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="fi fi2" style={{position:"relative",marginBottom:"36px",maxWidth:"520px"}}>
          <div style={{position:"absolute",left:"14px",top:"50%",transform:"translateY(-50%)",color:"#9A9AAA",pointerEvents:"none"}}>
            <Icons.Search />
          </div>
          <input
            className="search-input"
            placeholder="Search the manual…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Sections */}
        <div className="fi fi3">
          {filteredSections.length === 0 ? (
            <div style={{textAlign:"center",paddingTop:"40px",color:"#8A8A9A"}}>
              <div style={{fontSize:"28px",marginBottom:"12px",opacity:0.4}}>⬡</div>
              <div style={{fontSize:"15px",fontWeight:600,color:"#6B6B7A"}}>No results for &ldquo;{search}&rdquo;</div>
            </div>
          ) : (
            filteredSections.map(section => (
              <div key={section.id} className="help-section">
                <div className="help-section-header">
                  <div style={{width:"32px",height:"32px",borderRadius:"10px",background:`${section.color}18`,border:`1px solid ${section.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",color:section.color}}>
                    {section.emoji}
                  </div>
                  <h2 style={{fontSize:"16px",fontWeight:700,letterSpacing:"-0.3px",color:"#12111A"}}>{section.title}</h2>
                  <span style={{fontSize:"12px",color:"#8A8A9A",marginLeft:"auto"}}>{section.topics.length} topics</span>
                </div>

                <div>
                  {section.topics.map((topic, i) => {
                    const key = `${section.id}-${i}`;
                    const isOpen = active === key;
                    return (
                      <div key={key} className={`faq-item${isOpen?" open":""}`}>
                        <div className="faq-q" onClick={() => setActive(isOpen ? null : key)}>
                          <span style={{fontSize:"14px",fontWeight:600,color:"#12111A"}}>{topic.q}</span>
                          <span style={{fontSize:"18px",color:isOpen?"#5B4CF5":"#8A8A9A",lineHeight:1,flexShrink:0,transform:isOpen?"rotate(45deg)":"none",transition:"transform 0.2s,color 0.2s",display:"inline-block"}}>+</span>
                        </div>
                        {isOpen && (
                          <div className="faq-a">{topic.a}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer note */}
        <div style={{marginTop:"48px",padding:"20px 24px",borderRadius:"14px",background:"rgba(91,76,245,0.06)",border:"1px solid rgba(91,76,245,0.18)",display:"flex",alignItems:"center",gap:"14px"}}>
          <div style={{fontSize:"20px",opacity:0.6}}>💡</div>
          <div>
            <div style={{fontSize:"13px",fontWeight:600,marginBottom:"3px"}}>Need more help?</div>
            <div style={{fontSize:"12px",color:"#6B6B7A"}}>If you have a question not covered here, reach out to the Portl team. We&apos;re always improving this documentation.</div>
          </div>
        </div>
      </main>
    </div>
  );
}
