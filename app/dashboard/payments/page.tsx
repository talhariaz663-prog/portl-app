"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
type Currency = "USD" | "PKR";

interface LineItem {
  description: string;
  quantity:    number;
  unit_price:  number;
  amount:      number;
}

interface Invoice {
  id:             string;
  user_id:        string;
  project_id:     string | null;
  invoice_number: string;
  client_name:    string;
  client_email:   string;
  line_items:     LineItem[];
  currency:       Currency;
  total_amount:   number;
  due_date:       string | null;
  status:         InvoiceStatus;
  notes:          string | null;
  created_at:     string;
  paid_at:        string | null;
}

interface Project {
  id:   string;
  name: string;
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:   { label: "Draft",   color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.2)"  },
  sent:    { label: "Sent",    color: "#7B6CF9", bg: "rgba(123,108,249,0.1)",  border: "rgba(123,108,249,0.25)" },
  paid:    { label: "Paid",    color: "#0BAB6C", bg: "rgba(11,171,108,0.1)",   border: "rgba(11,171,108,0.25)"  },
  overdue: { label: "Overdue", color: "#EF4444", bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.2)"    },
};

const CURRENCIES: Record<Currency, string> = { USD: "$", PKR: "₨" };

function formatCurrency(amount: number, currency: Currency): string {
  const sym = CURRENCIES[currency];
  return `${sym}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
}

const Icons = {
  Studio:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.9"/><rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.5"/><rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.5"/><rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.3"/></svg>,
  Projects:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7C3 5.9 3.9 5 5 5h4l2 2h8c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" fill="currentColor" opacity="0.8"/></svg>,
  Activity:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M2 12h3l3-8 4 16 3-8h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Approvals: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/><path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Payments:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" opacity="0.8"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.8" opacity="0.6"/></svg>,
  Help:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/><path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2 2-2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M12 17h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  Plus:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  Signout:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Trash:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Edit:      () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  Check:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Close:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
};

const emptyLineItem = (): LineItem => ({ description: "", quantity: 1, unit_price: 0, amount: 0 });

export default function PaymentsPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [invoices,    setInvoices]    = useState<Invoice[]>([]);
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [userEmail,   setUserEmail]   = useState("");
  const [userId,      setUserId]      = useState("");
  const [filter,      setFilter]      = useState<"all" | "unpaid" | "paid">("all");
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [modal,       setModal]       = useState<"new" | "edit" | null>(null);
  const [editId,      setEditId]      = useState<string | null>(null);
  const [confirmDel,  setConfirmDel]  = useState<string | null>(null);

  // Form state
  const [fClient,    setFClient]    = useState("");
  const [fEmail,     setFEmail]     = useState("");
  const [fProject,   setFProject]   = useState("");
  const [fCurrency,  setFCurrency]  = useState<Currency>("USD");
  const [fDueDate,   setFDueDate]   = useState("");
  const [fNotes,     setFNotes]     = useState("");
  const [fStatus,    setFStatus]    = useState<InvoiceStatus>("draft");
  const [fItems,     setFItems]     = useState<LineItem[]>([emptyLineItem()]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    setUserEmail(session.user.email ?? "");
    setUserId(session.user.id);

    const [{ data: invData }, { data: projData }] = await Promise.all([
      supabase.from("invoices").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }),
      supabase.from("projects").select("id, name").eq("designer_id", session.user.id).order("name"),
    ]);

    setInvoices((invData as Invoice[]) ?? []);
    setProjects((projData as Project[]) ?? []);

    const { data: projs } = await supabase.from("projects").select("status").eq("designer_id", session.user.id);
    setReviewCount((projs ?? []).filter((p: { status: string }) => p.status === "review").length);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const initials    = userEmail ? userEmail.slice(0, 2).toUpperCase() : "??";
  const currentPath = "/dashboard/payments";

  const navItems = [
    { icon: Icons.Studio,    label: "Studio",    path: "/dashboard"           },
    { icon: Icons.Projects,  label: "My Work",   path: "/dashboard/projects"  },
    { icon: Icons.Activity,  label: "Activity",  path: "/dashboard/activity"  },
    { icon: Icons.Approvals, label: "Approvals", path: "/dashboard/approvals", badge: reviewCount },
    { icon: Icons.Payments,  label: "Payments",  path: "/dashboard/payments"  },
    { icon: Icons.Help,      label: "Help",      path: "/dashboard/help"      },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // ── Filtered invoices ──────────────────────────────────────────────────────
  const filtered = invoices.filter(inv => {
    if (filter === "paid")   return inv.status === "paid";
    if (filter === "unpaid") return inv.status !== "paid";
    return true;
  });

  const stats = {
    total:   invoices.length,
    unpaid:  invoices.filter(i => i.status !== "paid").length,
    paid:    invoices.filter(i => i.status === "paid").length,
    revenue: invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total_amount), 0),
  };

  // ── Line item helpers ──────────────────────────────────────────────────────
  const updateItem = (idx: number, field: keyof LineItem, val: string | number) => {
    setFItems(prev => {
      const items = [...prev];
      const item  = { ...items[idx], [field]: val };
      item.amount = Number(item.quantity) * Number(item.unit_price);
      items[idx] = item;
      return items;
    });
  };

  const addItem    = () => setFItems(prev => [...prev, emptyLineItem()]);
  const removeItem = (idx: number) => setFItems(prev => prev.filter((_, i) => i !== idx));

  const totalAmount = fItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0);

  // ── Auto invoice number ────────────────────────────────────────────────────
  const nextInvoiceNumber = () => {
    const num = invoices.length + 1;
    return `INV-${String(num).padStart(3, "0")}`;
  };

  // ── Open new modal ─────────────────────────────────────────────────────────
  const openNew = () => {
    setFClient(""); setFEmail(""); setFProject(""); setFCurrency("USD");
    setFDueDate(""); setFNotes(""); setFStatus("draft");
    setFItems([emptyLineItem()]);
    setEditId(null);
    setModal("new");
  };

  // ── Open edit modal ────────────────────────────────────────────────────────
  const openEdit = (inv: Invoice) => {
    setFClient(inv.client_name); setFEmail(inv.client_email);
    setFProject(inv.project_id ?? ""); setFCurrency(inv.currency);
    setFDueDate(inv.due_date ? inv.due_date.slice(0, 10) : "");
    setFNotes(inv.notes ?? ""); setFStatus(inv.status);
    setFItems(inv.line_items.length ? inv.line_items : [emptyLineItem()]);
    setEditId(inv.id);
    setModal("edit");
  };

  // ── Save invoice ───────────────────────────────────────────────────────────
  const saveInvoice = async () => {
    if (!fClient.trim()) return;
    setSaving(true);
    const payload = {
      user_id:        userId,
      project_id:     fProject || null,
      invoice_number: modal === "new" ? nextInvoiceNumber() : undefined,
      client_name:    fClient.trim(),
      client_email:   fEmail.trim(),
      line_items:     fItems.filter(i => i.description.trim()),
      currency:       fCurrency,
      total_amount:   totalAmount,
      due_date:       fDueDate || null,
      status:         fStatus,
      notes:          fNotes.trim() || null,
    };

    if (modal === "edit" && editId) {
      const { invoice_number: _n, ...updatePayload } = payload;
      await supabase.from("invoices").update(updatePayload).eq("id", editId);
    } else {
      await supabase.from("invoices").insert(payload);
    }

    setModal(null);
    setSaving(false);
    fetchData();
  };

  // ── Mark as paid ───────────────────────────────────────────────────────────
  const markPaid = async (id: string) => {
    await supabase.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    fetchData();
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteInvoice = async (id: string) => {
    await supabase.from("invoices").delete().eq("id", id);
    setConfirmDel(null);
    fetchData();
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA", fontFamily:"'Outfit',sans-serif", color:"#12111A", display:"flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }

        .fi{animation:fadeUp 0.4s ease forwards;opacity:0}
        .fi1{animation-delay:0.04s}.fi2{animation-delay:0.08s}.fi3{animation-delay:0.12s}.fi4{animation-delay:0.16s}

        .sidebar{position:fixed;top:0;left:0;bottom:0;width:240px;background:linear-gradient(180deg,#0c0e1a 0%,#080a15 100%);border-right:1px solid rgba(255,255,255,0.055);display:flex;flex-direction:column;z-index:20;}
        .sidebar-logo{padding:28px 24px 20px;border-bottom:1px solid rgba(255,255,255,0.05);}
        .sidebar-nav{padding:16px 12px;flex:1;display:flex;flex-direction:column;gap:2px;}

        .nav-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;font-size:13.5px;font-weight:500;cursor:pointer;transition:all 0.18s ease;border:1px solid transparent;color:rgba(255,255,255,0.58);position:relative;}
        .nav-item:hover{color:rgba(255,255,255,0.85);background:rgba(255,255,255,0.05);}
        .nav-item.active{color:#fff;font-weight:600;background:rgba(91,76,245,0.18);border-left:3px solid #5B4CF5;}
        .nav-item.active::before{content:'';position:absolute;left:-12px;top:50%;transform:translateY(-50%);width:3px;height:20px;background:linear-gradient(180deg,#5B4CF5,#7B6CF9);border-radius:0 4px 4px 0;}
        .nav-badge{margin-left:auto;min-width:20px;height:20px;border-radius:10px;background:linear-gradient(135deg,#F59E0B,#E8971A);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;padding:0 6px;}

        .sidebar-bottom{padding:16px 12px 20px;border-top:1px solid rgba(255,255,255,0.05);}
        .user-card{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);}

        .topbar{display:none;position:fixed;top:0;left:0;right:0;height:60px;background:rgba(255,255,255,0.97);border-bottom:1px solid #E4E4E8;backdrop-filter:blur(20px);z-index:40;align-items:center;justify-content:space-between;padding:0 16px;}
        .main{margin-left:240px;min-height:100vh;padding:32px 36px;position:relative;flex:1;}

        .new-btn{display:flex;align-items:center;gap:8px;padding:8px 18px;border:none;border-radius:10px;background:#5B4CF5;color:#fff;font-family:'Outfit',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:background 0.15s,transform 0.15s;white-space:nowrap;}
        .new-btn:hover{background:#4A3DE0;transform:translateY(-1px);}
        .new-btn:active{background:#3D32C4;transform:translateY(0);}
        .new-btn:disabled{opacity:0.45;cursor:not-allowed;}

        .filter-pill{padding:4px 10px;border-radius:999px;cursor:pointer;font-size:11px;font-weight:700;border:1px solid #E4E4E8;background:#FFFFFF;color:#6B6B7A;font-family:'Outfit',sans-serif;transition:all 0.15s;white-space:nowrap;}
        .filter-pill:hover{color:#4A4A5A;border-color:#D0D0D8;background:#F0F0F5;}
        .filter-pill.active{background:rgba(91,76,245,0.1);border-color:rgba(91,76,245,0.35);color:#5B4CF5;}

        .stat-card{background:#FFFFFF;border:1px solid #E4E4E8;box-shadow:0 1px 3px rgba(0,0,0,0.06);border-radius:12px;padding:16px 20px;}

        .inv-row{display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:12px;background:#FFFFFF;border:1px solid #E4E4E8;box-shadow:0 1px 3px rgba(0,0,0,0.06);transition:all 0.18s ease;position:relative;overflow:hidden;}
        .inv-row:hover{background:#F9F9FB;border-color:#D0D0D8;}

        .icon-btn{background:transparent;border:1px solid #E4E4E8;border-radius:8px;padding:6px 10px;cursor:pointer;color:#6B6B7A;font-family:'Outfit',sans-serif;font-size:11px;font-weight:600;display:flex;align-items:center;gap:5px;transition:all 0.15s;white-space:nowrap;}
        .icon-btn:hover{background:#F0F0F5;color:#12111A;border-color:#D0D0D8;}
        .icon-btn.danger:hover{background:rgba(239,68,68,0.07);color:#EF4444;border-color:rgba(239,68,68,0.2);}
        .icon-btn.success{background:rgba(11,171,108,0.1);border-color:rgba(11,171,108,0.3);color:#0BAB6C;}
        .icon-btn.success:hover{background:rgba(11,171,108,0.2);}
        button:focus-visible{box-shadow:0 0 0 3px rgba(91,76,245,0.25);outline:none;}

        /* Modal */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s ease;}
        .modal{background:#0f1120;border:1px solid rgba(255,255,255,0.1);border-radius:20px;width:100%;max-width:640px;max-height:90vh;overflow-y:auto;animation:fadeUp 0.25s ease forwards;}
        .modal-header{padding:24px 28px 0;display:flex;align-items:center;justify-content:space-between;}
        .modal-body{padding:20px 28px 28px;}

        .form-label{font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:6px;display:block;text-transform:uppercase;letter-spacing:0.05em;}
        .form-input{width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 14px;color:#fff;font-family:'Outfit',sans-serif;font-size:13.5px;outline:none;transition:border-color 0.2s;}
        .form-input::placeholder{color:rgba(255,255,255,0.2);}
        .form-input:focus{border-color:rgba(91,76,245,0.5);background:rgba(91,76,245,0.04);}
        .form-select{appearance:none;background:rgba(255,255,255,0.04) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M6 9l6 6 6-6' stroke='rgba(255,255,255,0.3)' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 12px center;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 32px 10px 14px;color:#fff;font-family:'Outfit',sans-serif;font-size:13.5px;outline:none;cursor:pointer;}
        .form-select option{background:#0f1120;}

        .line-item-row{display:grid;grid-template-columns:1fr 80px 100px 90px 28px;gap:8px;align-items:center;margin-bottom:8px;}

        .mobile-menu{position:fixed;top:60px;left:0;right:0;z-index:50;background:rgba(255,255,255,0.98);border-bottom:1px solid #E4E4E8;padding:16px;backdrop-filter:blur(20px);animation:fadeIn 0.2s ease forwards;}

        @media(max-width:768px){
          .sidebar{display:none!important;}
          .topbar{display:flex!important;}
          .main{margin-left:0!important;padding:76px 16px 40px!important;}
          .inv-row{flex-wrap:wrap;}
          .inv-actions{display:none!important;}
          .stat-grid{grid-template-columns:1fr 1fr!important;}
          .line-item-row{grid-template-columns:1fr 60px 80px 70px 24px!important;}
        }
      `}</style>

      {/* BG */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",backgroundImage:"radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)",backgroundSize:"40px 40px"}} />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:"22px",fontWeight:900,letterSpacing:"-0.8px"}}>Portl<span style={{color:"#5B4CF5"}}>.</span></span>
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
        <span style={{fontSize:"20px",fontWeight:900,letterSpacing:"-0.6px",color:"#12111A"}}>Portl<span style={{color:"#5B4CF5"}}>.</span></span>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <button className="new-btn" style={{padding:"8px 14px"}} onClick={openNew}><Icons.Plus /> New</button>
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
      <main className="main">
        {/* Header */}
        <div className="fi fi1" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"24px",gap:"16px"}}>
          <div>
            <h1 style={{fontSize:"clamp(22px,3vw,28px)",fontWeight:800,letterSpacing:"-0.6px",marginBottom:"5px",color:"#12111A"}}>Payments</h1>
            <p style={{fontSize:"13px",color:"#6B6B7A"}}>
              {loading ? "Loading…" : `${invoices.length} invoice${invoices.length!==1?"s":""} total`}
            </p>
          </div>
          <button className="new-btn" onClick={openNew} id="desk-new" style={{display:"none"}}>
            <Icons.Plus /> New Invoice
          </button>
          <style>{`@media(min-width:769px){#desk-new{display:flex!important}}`}</style>
        </div>

        {/* Stats */}
        <div className="fi fi2" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"24px"}} >
          {[
            { label:"Total",   value: stats.total,   sub: "invoices",        color:"#5B4CF5" },
            { label:"Unpaid",  value: stats.unpaid,  sub: "pending",         color:"#F59E0B" },
            { label:"Paid",    value: stats.paid,    sub: "collected",       color:"#0BAB6C" },
            { label:"Revenue", value: formatCurrency(stats.revenue,"USD"), sub: "total paid", color:"#7B6CF9", isStr:true },
          ].map(s => (
            <div key={s.label} className="stat-card stat-grid">
              <div style={{fontSize:"11px",fontWeight:600,color:"#6B6B7A",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px"}}>{s.label}</div>
              <div style={{fontSize:s.isStr?"20px":"24px",fontWeight:800,color:s.color,letterSpacing:"-0.5px",marginBottom:"2px"}}>{s.value}</div>
              <div style={{fontSize:"11px",color:"#6B6B7A"}}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="fi fi3" style={{display:"flex",gap:"6px",marginBottom:"20px"}}>
          {(["all","unpaid","paid"] as const).map(f => (
            <button key={f} className={`filter-pill${filter===f?" active":""}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
              <span style={{marginLeft:"5px",opacity:0.45,fontSize:"11px"}}>
                {f==="all"?stats.total:f==="unpaid"?stats.unpaid:stats.paid}
              </span>
            </button>
          ))}
        </div>

        {/* Invoice list */}
        {loading ? (
          <div style={{display:"flex",justifyContent:"center",paddingTop:"60px"}}>
            <div style={{width:"28px",height:"28px",border:"2px solid rgba(0,0,0,0.08)",borderTopColor:"#5B4CF5",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="fi fi3" style={{textAlign:"center",paddingTop:"60px",color:"#6B6B7A"}}>
            <div style={{fontSize:"32px",marginBottom:"12px",opacity:0.4}}>⬡</div>
            <div style={{fontSize:"14px",fontWeight:600,marginBottom:"6px",color:"#4A4A5A"}}>No invoices yet</div>
            <button className="new-btn" style={{margin:"16px auto 0"}} onClick={openNew}><Icons.Plus /> Create First Invoice</button>
          </div>
        ) : (
          <div className="fi fi4" style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {filtered.map(inv => {
              const st = STATUS_CONFIG[inv.status];
              const proj = projects.find(p => p.id === inv.project_id);
              return (
                <div key={inv.id} className="inv-row">
                  {/* Status strip */}
                  <div style={{position:"absolute",left:0,top:0,bottom:0,width:"3px",background:st.color,borderRadius:"14px 0 0 14px"}} />

                  {/* Invoice number */}
                  <div style={{minWidth:"80px",marginLeft:"8px"}}>
                    <div style={{fontSize:"13px",fontWeight:700,color:"#12111A"}}>{inv.invoice_number}</div>
                    <div style={{fontSize:"11px",color:"#6B6B7A",marginTop:"2px"}}>{formatDate(inv.created_at)}</div>
                  </div>

                  {/* Client */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"13.5px",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inv.client_name}</div>
                    <div style={{fontSize:"12px",color:"#6B6B7A",marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {inv.client_email}
                      {proj && <span style={{marginLeft:"8px",color:"#B0B0BC"}}>· {proj.name}</span>}
                    </div>
                  </div>

                  {/* Due date */}
                  <div style={{flexShrink:0,textAlign:"right",minWidth:"80px"}}>
                    <div style={{fontSize:"12px",color:"#6B6B7A"}}>Due</div>
                    <div style={{fontSize:"12px",fontWeight:600,color:"#4A4A5A",marginTop:"2px"}}>{formatDate(inv.due_date)}</div>
                  </div>

                  {/* Amount */}
                  <div style={{flexShrink:0,textAlign:"right",minWidth:"90px"}}>
                    <div style={{fontSize:"14px",fontWeight:800,color:"#12111A"}}>{formatCurrency(Number(inv.total_amount),inv.currency)}</div>
                    <div style={{fontSize:"11px",color:"#6B6B7A",marginTop:"2px"}}>{inv.currency}</div>
                  </div>

                  {/* Status badge */}
                  <div style={{display:"inline-flex",alignItems:"center",gap:"5px",background:st.bg,color:st.color,padding:"4px 10px",borderRadius:"999px",fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",border:`1px solid ${st.border}`,flexShrink:0}}>
                    <span style={{width:"4px",height:"4px",borderRadius:"50%",background:st.color}} />{st.label}
                  </div>

                  {/* Actions */}
                  <div className="inv-actions" style={{display:"flex",gap:"6px",flexShrink:0}} onClick={e => e.stopPropagation()}>
                    {inv.status !== "paid" && (
                      <button className="icon-btn success" onClick={() => markPaid(inv.id)}>
                        <Icons.Check /> Paid
                      </button>
                    )}
                    <button className="icon-btn" onClick={() => openEdit(inv)}>
                      <Icons.Edit /> Edit
                    </button>
                    <button className="icon-btn danger" onClick={() => setConfirmDel(inv.id)}>
                      <Icons.Trash />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── New / Edit Invoice Modal ────────────────────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{fontSize:"18px",fontWeight:800,letterSpacing:"-0.4px"}}>{modal==="new"?"New Invoice":"Edit Invoice"}</h2>
                {modal==="new" && <div style={{fontSize:"12px",color:"rgba(255,255,255,0.3)",marginTop:"3px"}}>#{nextInvoiceNumber()}</div>}
              </div>
              <button onClick={() => setModal(null)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",width:"32px",height:"32px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.5)"}}><Icons.Close /></button>
            </div>

            <div className="modal-body">
              {/* Client info */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"16px"}}>
                <div>
                  <label className="form-label">Client Name *</label>
                  <input className="form-input" placeholder="Jane Smith" value={fClient} onChange={e => setFClient(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Client Email</label>
                  <input className="form-input" type="email" placeholder="jane@example.com" value={fEmail} onChange={e => setFEmail(e.target.value)} />
                </div>
              </div>

              {/* Project + Currency + Due date + Status */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"16px"}}>
                <div>
                  <label className="form-label">Project (optional)</label>
                  <select className="form-input form-select" value={fProject} onChange={e => setFProject(e.target.value)}>
                    <option value="">No project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Currency</label>
                  <select className="form-input form-select" value={fCurrency} onChange={e => setFCurrency(e.target.value as Currency)}>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="PKR">PKR — Pakistani Rupee (₨)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={fDueDate} onChange={e => setFDueDate(e.target.value)} style={{colorScheme:"dark"}} />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input form-select" value={fStatus} onChange={e => setFStatus(e.target.value as InvoiceStatus)}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {/* Line items */}
              <div style={{marginBottom:"16px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px"}}>
                  <label className="form-label" style={{margin:0}}>Line Items</label>
                  <button onClick={addItem} style={{background:"rgba(91,76,245,0.12)",border:"1px solid rgba(91,76,245,0.3)",borderRadius:"8px",padding:"4px 10px",cursor:"pointer",color:"#7B6CF9",fontSize:"12px",fontFamily:"'Outfit',sans-serif",fontWeight:600,display:"flex",alignItems:"center",gap:"5px"}}><Icons.Plus />Add Item</button>
                </div>

                {/* Header */}
                <div className="line-item-row" style={{marginBottom:"4px"}}>
                  {["Description","Qty","Unit Price","Amount",""].map((h,i) => (
                    <div key={i} style={{fontSize:"10px",fontWeight:700,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</div>
                  ))}
                </div>

                {fItems.map((item, idx) => (
                  <div key={idx} className="line-item-row">
                    <input className="form-input" style={{padding:"8px 10px",fontSize:"13px"}} placeholder="Design work…" value={item.description} onChange={e => updateItem(idx,"description",e.target.value)} />
                    <input className="form-input" style={{padding:"8px 10px",fontSize:"13px",textAlign:"center"}} type="number" min="1" value={item.quantity} onChange={e => updateItem(idx,"quantity",parseFloat(e.target.value)||1)} />
                    <input className="form-input" style={{padding:"8px 10px",fontSize:"13px",textAlign:"right"}} type="number" min="0" step="0.01" placeholder="0.00" value={item.unit_price||""} onChange={e => updateItem(idx,"unit_price",parseFloat(e.target.value)||0)} />
                    <div style={{fontSize:"13px",fontWeight:600,color:"rgba(255,255,255,0.7)",textAlign:"right",padding:"8px 2px"}}>
                      {CURRENCIES[fCurrency]}{(Number(item.quantity)*Number(item.unit_price)).toFixed(2)}
                    </div>
                    {fItems.length > 1 ? (
                      <button onClick={() => removeItem(idx)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",padding:"4px"}}><Icons.Close /></button>
                    ) : <div />}
                  </div>
                ))}

                {/* Total */}
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:"12px",paddingTop:"12px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"11px",color:"rgba(255,255,255,0.35)",marginBottom:"4px"}}>TOTAL</div>
                    <div style={{fontSize:"20px",fontWeight:800,color:"#fff"}}>{formatCurrency(totalAmount,fCurrency)}</div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div style={{marginBottom:"24px"}}>
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-input" rows={3} placeholder="Payment terms, bank details, thank you note…" value={fNotes} onChange={e => setFNotes(e.target.value)} style={{resize:"vertical"}} />
              </div>

              {/* Submit */}
              <div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}>
                <button onClick={() => setModal(null)} style={{padding:"10px 20px",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"10px",color:"rgba(255,255,255,0.4)",fontFamily:"'Outfit',sans-serif",fontSize:"13px",cursor:"pointer"}}>Cancel</button>
                <button onClick={saveInvoice} disabled={saving||!fClient.trim()} style={{padding:"10px 24px",background:"linear-gradient(135deg,#5B4CF5,#0BAB6C)",border:"none",borderRadius:"10px",color:"#fff",fontFamily:"'Outfit',sans-serif",fontSize:"13px",fontWeight:700,cursor:"pointer",opacity:saving||!fClient.trim()?0.5:1}}>
                  {saving ? "Saving…" : modal==="new" ? "Create Invoice" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ──────────────────────────────────────────────────── */}
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div style={{background:"#0f1120",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"16px",padding:"32px",width:"100%",maxWidth:"360px",animation:"fadeUp 0.2s ease forwards"}} onClick={e => e.stopPropagation()}>
            <div style={{fontSize:"16px",fontWeight:700,marginBottom:"8px"}}>Delete Invoice?</div>
            <div style={{fontSize:"13px",color:"rgba(255,255,255,0.45)",marginBottom:"20px"}}>This action cannot be undone. The invoice will be permanently removed.</div>
            <div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}>
              <button onClick={() => setConfirmDel(null)} style={{padding:"9px 18px",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"9px",color:"rgba(255,255,255,0.4)",fontFamily:"'Outfit',sans-serif",fontSize:"13px",cursor:"pointer"}}>Cancel</button>
              <button onClick={() => deleteInvoice(confirmDel)} style={{padding:"8px 18px",background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"8px",color:"#EF4444",fontFamily:"'Outfit',sans-serif",fontSize:"13px",fontWeight:700,cursor:"pointer"}}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
