"use client";

import { useEffect, useRef, useState } from "react";

export default function LoginPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let animId: number;
    let renderer: import("three").WebGLRenderer;

    async function init() {
      const THREE = await import("three");
      const canvas = canvasRef.current;
      if (!canvas) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.z = 5;

      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const clock = new THREE.Clock();
      const orbs: import("three").Mesh[] = [];

      const orbData: { pos: [number, number, number]; color: number; size: number; speed: number }[] = [
        { pos: [-3.5, 1.5, -1],   color: 0x5B4CF5, size: 0.9, speed: 0.4  },
        { pos: [3.2, -1.2, -2],   color: 0x0BAB6C, size: 1.1, speed: 0.3  },
        { pos: [-2, -2.5, -3],    color: 0x5B4CF5, size: 0.6, speed: 0.55 },
        { pos: [2.5, 2.5, -2.5],  color: 0x0BAB6C, size: 0.7, speed: 0.45 },
        { pos: [0, -3, -1.5],     color: 0x7B6CF9, size: 0.5, speed: 0.6  },
      ];

      orbData.forEach(({ pos, color, size, speed }) => {
        const geo = new THREE.IcosahedronGeometry(size, 4);
        const mat = new THREE.MeshStandardMaterial({
          color, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.55,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(...pos);
        mesh.userData = { originY: pos[1], speed, phase: Math.random() * Math.PI * 2 };
        scene.add(mesh);
        orbs.push(mesh);

        const ringGeo = new THREE.TorusGeometry(size * 1.35, 0.02, 8, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 4;
        mesh.add(ring);
      });

      scene.add(new THREE.AmbientLight(0xffffff, 0.3));
      const dirLight = new THREE.DirectionalLight(0x5B4CF5, 2);
      dirLight.position.set(5, 5, 5);
      scene.add(dirLight);
      const greenLight = new THREE.PointLight(0x0BAB6C, 3, 10);
      greenLight.position.set(-4, -3, 1);
      scene.add(greenLight);

      const pCount = 280;
      const pGeo = new THREE.BufferGeometry();
      const pPos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount * 3; i++) pPos[i] = (Math.random() - 0.5) * 18;
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
      const particles = new THREE.Points(
        pGeo,
        new THREE.PointsMaterial({ color: 0x5B4CF5, size: 0.03, transparent: true, opacity: 0.5 })
      );
      scene.add(particles);

      const gridHelper = new THREE.GridHelper(20, 30, 0x5B4CF5, 0x5B4CF5);
      (gridHelper.material as import("three").Material).opacity = 0.04;
      (gridHelper.material as import("three").Material).transparent = true;
      gridHelper.position.y = -4;
      scene.add(gridHelper);

      const onMouse = (e: MouseEvent) => {
        mouseRef.current = {
          x:  (e.clientX / window.innerWidth  - 0.5) * 2,
          y: -(e.clientY / window.innerHeight - 0.5) * 2,
        };
      };
      window.addEventListener("mousemove", onMouse);

      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", onResize);

      const animate = () => {
        animId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        orbs.forEach((orb) => {
          const { originY, speed, phase } = orb.userData as { originY: number; speed: number; phase: number };
          orb.position.y = originY + Math.sin(t * speed + phase) * 0.4;
          orb.rotation.x += 0.003;
          orb.rotation.y += 0.005;
        });

        particles.rotation.y = t * 0.02;
        camera.position.x += (mouseRef.current.x * 0.6 - camera.position.x) * 0.04;
        camera.position.y += (mouseRef.current.y * 0.4 - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        window.removeEventListener("mousemove", onMouse);
        window.removeEventListener("resize", onResize);
        cancelAnimationFrame(animId);
        renderer.dispose();
      };
    }

    let cleanup: (() => void) | undefined;
    init().then((fn) => { cleanup = fn; });
    return () => { cleanup?.(); cancelAnimationFrame(animId); };
  }, []);

  const handleSubmit = async () => {
    if (!email || loading) return;
    setLoading(true);

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
      },
    });

    setLoading(false);

    if (error) {
      alert("Something went wrong: " + error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden", background: "#080a18", fontFamily: "'Outfit', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-1 { animation: fadeUp 0.7s 0.00s ease forwards; opacity: 0; }
        .fade-2 { animation: fadeUp 0.7s 0.15s ease forwards; opacity: 0; }
        .fade-3 { animation: fadeUp 0.7s 0.30s ease forwards; opacity: 0; }
        .fade-4 { animation: fadeUp 0.7s 0.45s ease forwards; opacity: 0; }
        .magic-btn {
          width: 100%; padding: 14px; border: none; border-radius: 10px;
          background: linear-gradient(135deg, #5B4CF5 0%, #0BAB6C 100%);
          color: #fff; font-family: 'Outfit', sans-serif; font-size: 15px;
          font-weight: 700; cursor: pointer; transition: opacity 0.2s, transform 0.15s;
          letter-spacing: 0.01em;
        }
        .magic-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .magic-btn:active:not(:disabled) { transform: translateY(0); }
        .magic-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .email-input {
          width: 100%; padding: 13px 16px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: #fff; font-family: 'Outfit', sans-serif;
          font-size: 15px; outline: none; transition: border-color 0.2s, background 0.2s;
          margin-bottom: 16px;
        }
        .email-input::placeholder { color: rgba(255,255,255,0.25); }
        .email-input:focus { border-color: rgba(91,76,245,0.6); background: rgba(91,76,245,0.08); }
        .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
      `}</style>

      {/* 3D Canvas */}
      <canvas ref={canvasRef} style={{
        position: "fixed", top: 0, left: 0,
        width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Vignette */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(8,10,24,0.75) 100%)",
      }} />

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 2, minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 20px", textAlign: "center",
      }}>

        {/* Logo */}
        <div className="fade-1" style={{ marginBottom: "36px" }}>
          <span style={{ fontSize: "30px", fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>
            Portl<span style={{ color: "#5B4CF5", fontSize: "36px", lineHeight: "0" }}>.</span>
          </span>
        </div>

        {/* Headline */}
        <div className="fade-2" style={{ marginBottom: "36px", maxWidth: "440px" }}>
          <h1 style={{
            fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 800,
            lineHeight: 1.08, color: "#fff", letterSpacing: "-1.5px", marginBottom: "16px",
          }}>
            Your studio.<br />
            <span style={{
              background: "linear-gradient(90deg, #7B6CF9 0%, #0BAB6C 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Your clients.
            </span>
            <br />One portal.
          </h1>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>
            Send clients a link. They see your work, leave feedback,
            and approve — without the back-and-forth.
          </p>
        </div>

        {/* Card */}
        <div className="fade-3" style={{
          width: "100%", maxWidth: "380px",
          background: "rgba(255,255,255,0.035)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px", padding: "32px 28px",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
          marginBottom: "32px",
        }}>
          {sent ? (
            <div style={{ padding: "12px 0", textAlign: "center" }}>
              <div style={{ position: "relative", width: "56px", height: "56px", margin: "0 auto 20px" }}>
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "rgba(11,171,108,0.2)",
                  animation: "pulse-ring 1.4s ease-out infinite",
                }} />
                <div style={{
                  width: "56px", height: "56px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #0BAB6C, #5B4CF5)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px",
                }}>✉️</div>
              </div>
              <h2 style={{ color: "#fff", fontSize: "19px", fontWeight: 700, marginBottom: "8px" }}>
                Check your inbox
              </h2>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "14px", lineHeight: 1.6 }}>
                Magic link sent to <span style={{ color: "#fff", fontWeight: 600 }}>{email}</span>
              </p>
            </div>
          ) : (
            <>
              <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}>
                Sign in to Portl
              </h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "24px", lineHeight: 1.55 }}>
                Enter your email — we&apos;ll send a magic link. No password needed.
              </p>

              <label style={{
                display: "block", fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase", marginBottom: "8px",
              }}>
                Email Address
              </label>

              <input
                className="email-input"
                type="email"
                placeholder="you@studio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />

              <button className="magic-btn" onClick={handleSubmit} disabled={loading || !email}>
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                    <span style={{
                      width: "16px", height: "16px",
                      border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                      borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block",
                    }} />
                    Sending…
                  </span>
                ) : "Send Magic Link →"}
              </button>

              <p style={{ marginTop: "16px", color: "rgba(255,255,255,0.2)", fontSize: "12px" }}>
                By signing in you agree to our terms of service. No spam, ever.
              </p>
            </>
          )}
        </div>

        {/* Bullets */}
        <div className="fade-4" style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
          {[
            { color: "#5B4CF5", text: "Project timelines your clients actually understand" },
            { color: "#0BAB6C", text: "File delivery with one-click approvals" },
            { color: "#5B4CF5", text: "No client account needed — just a link" },
            { color: "#0BAB6C", text: "Built for freelance designers" },
          ].map(({ color, text }) => (
            <div key={text} style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              color: "rgba(255,255,255,0.5)", fontSize: "13.5px",
            }}>
              <span className="dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
              {text}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}