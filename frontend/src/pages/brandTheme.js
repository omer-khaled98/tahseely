import React from "react";

export const brandTokens = {
  primary: "#0B3B6F",
  primaryDark: "#072948",
  primaryLight: "#2E7CC2",
  accent: "#7CC6FF",
  surface: "#F3F8FE",
  line: "rgba(11,59,111,.14)",
};

export function BrandPageStyle() {
  return (
    <style>{`
      .brand-app{
        min-height:100vh;
        background:
          radial-gradient(circle at 12% 15%, rgba(124,198,255,.26), transparent 24%),
          radial-gradient(circle at 88% 10%, rgba(11,59,111,.16), transparent 24%),
          radial-gradient(circle at 82% 88%, rgba(46,124,194,.12), transparent 28%),
          linear-gradient(180deg, #f9fbfe 0%, #eef5fc 52%, #eaf2fb 100%);
        color:#0f172a;
      }
      .brand-app::before{
        content:"";
        position:fixed;
        inset:0;
        pointer-events:none;
        background-image:
          linear-gradient(rgba(11,59,111,.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(11,59,111,.03) 1px, transparent 1px);
        background-size:24px 24px;
        mask-image:radial-gradient(circle at center, black 34%, transparent 95%);
        opacity:.6;
      }
      .brand-shell{
        background:rgba(255,255,255,.72);
        backdrop-filter:blur(20px);
        border:1px solid rgba(11,59,111,.08);
        box-shadow:0 18px 40px rgba(7,41,72,.08);
      }
      .brand-card{
        background:linear-gradient(180deg, rgba(255,255,255,.98), rgba(243,248,254,.98));
        border:1px solid rgba(11,59,111,.11);
        box-shadow:0 16px 36px rgba(7,41,72,.08);
        border-radius:26px;
      }
      .brand-soft{
        background:rgba(255,255,255,.84);
        border:1px solid rgba(11,59,111,.10);
        border-radius:20px;
        box-shadow:0 10px 24px rgba(7,41,72,.04);
      }
      .brand-panel{
        background:linear-gradient(145deg, #0d467f 0%, #0a355f 52%, #072948 100%);
        color:white;
        border:1px solid rgba(255,255,255,.1);
        box-shadow:0 24px 60px rgba(7,41,72,.28);
        border-radius:30px;
      }
      .brand-title{color:#072948;font-weight:900;letter-spacing:-0.03em}
      .brand-kicker{color:#0B3B6F;font-weight:800;letter-spacing:.02em}
      .brand-primary-btn{
        background:linear-gradient(135deg, #2E7CC2 0%, #0B4E8A 48%, #072948 100%);
        color:white;
        border:1px solid rgba(255,255,255,.16);
        box-shadow:0 12px 26px rgba(11,78,138,.20);
      }
      .brand-primary-btn:hover{filter:brightness(1.04);transform:translateY(-1px)}
      .brand-muted-btn{
        background:linear-gradient(180deg, rgba(255,255,255,.94), rgba(237,245,252,.94));
        color:#072948;
        border:1px solid rgba(11,59,111,.14);
      }
      .brand-danger-btn{background:linear-gradient(135deg,#d9465f,#9f1239);color:#fff}
      .brand-success-btn{background:linear-gradient(135deg,#1b7dbf,#0b4e8a);color:#fff}
      .brand-chip{
        display:inline-flex;align-items:center;gap:.45rem;padding:.42rem .9rem;
        border-radius:999px;background:rgba(11,59,111,.07);color:#0B3B6F;font-weight:700;
        border:1px solid rgba(11,59,111,.10)
      }
      .brand-logo-badge{
        width:2.6rem;height:2.6rem;border-radius:1rem;
        background:linear-gradient(135deg, #7CC6FF 0%, #2E7CC2 38%, #0B4E8A 72%, #072948 100%);
        box-shadow:0 14px 28px rgba(11,78,138,.22);
        position:relative;overflow:hidden;flex-shrink:0;
      }
      .brand-logo-badge::before{
        content:"";position:absolute;inset:6px;border-radius:12px;
        border:1px solid rgba(255,255,255,.38);
      }
      .brand-logo-badge::after{
        content:"";position:absolute;left:10px;right:10px;bottom:8px;height:10px;
        border-radius:999px;background:linear-gradient(180deg, rgba(255,255,255,.52), rgba(255,255,255,.12));
        filter:blur(.3px);
      }
      .brand-app button{transition:all .2s ease;border-radius:16px}
      .brand-app input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),
      .brand-app select,
      .brand-app textarea{
        background:rgba(255,255,255,.92)!important;
        border:1px solid rgba(11,59,111,.13)!important;
        border-radius:16px!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.65);
      }
      .brand-app input:focus,
      .brand-app select:focus,
      .brand-app textarea:focus{
        outline:none;
        border-color:rgba(46,124,194,.48)!important;
        box-shadow:0 0 0 4px rgba(46,124,194,.12)!important;
      }
      .brand-app table{overflow:hidden;border-radius:20px}
      .brand-app thead{background:linear-gradient(180deg, #edf5fd, #e2eefb)}
      .brand-app tbody tr:hover{background:rgba(124,198,255,.08)!important}
      .brand-scroll::-webkit-scrollbar{width:10px;height:10px}
      .brand-scroll::-webkit-scrollbar-thumb{background:rgba(11,59,111,.24);border-radius:999px}
      .brand-metric{
        background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(238,245,252,.96));
        border:1px solid rgba(11,59,111,.10);
        border-radius:22px;
        box-shadow:0 12px 24px rgba(7,41,72,.06);
      }
      .brand-table-wrap{border-radius:22px;overflow:hidden;border:1px solid rgba(11,59,111,.10)}
      .brand-modal{background:linear-gradient(180deg,#fff,#f5f9fe);border:1px solid rgba(11,59,111,.10);box-shadow:0 26px 70px rgba(7,41,72,.24);border-radius:28px}
    `}</style>
  );
}
