"use client";

import React, { useRef } from "react";

type Props = {
  open: boolean;
  currentColor?: string | null;
  palette: string[];
  onPickColor: (color: string | null) => void;
  onDelete?: () => void;
  onClose: () => void;
};

export default function ColorImageOverlay(props: Props) {
  const stopAll = (e: any) => {
    try { e.stopPropagation?.(); } catch {}
  };

  if (!props.open) return null;

  const onDimPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.target === e.currentTarget) props.onClose();
  };

  const pickColor = (c: string | null) => {
    props.onPickColor(c);
    props.onClose();
  };

  return (
    <div
      onPointerDown={onDimPointerDown}
      onMouseDown={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.42)",
        backdropFilter: "blur(1px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9000,
        padding: 18,
      }}
    >
      <div
        onPointerDownCapture={stopAll}
        onMouseDown={stopAll}
        onClick={stopAll}
        style={{
          width: "min(520px, 100%)",
          borderRadius: 18,
          background: "rgba(15,16,18,0.92)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          padding: 14,
          pointerEvents: "auto",
        }}
      >
        {/* 색상 팔레트 행 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {props.palette.map((c) => {
            const active = (props.currentColor ?? "").toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onPointerDownCapture={stopAll}
                onMouseDown={stopAll}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); pickColor(c); }}
                title={c}
                style={{
                  width: 26, height: 26, borderRadius: 999, background: c,
                  border: active
                    ? "3px solid rgba(255,255,255,0.95)"
                    : "2px solid rgba(255,255,255,0.18)",
                  boxShadow: active ? "0 0 0 3px rgba(255,255,255,0.10)" : "none",
                  cursor: "pointer",
                }}
              />
            );
          })}

          <button
            type="button"
            onPointerDownCapture={stopAll}
            onMouseDown={stopAll}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); pickColor(null); }}
            style={{
              marginLeft: "auto",
              height: 30, padding: "0 12px", borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.88)",
              cursor: "pointer", fontSize: 12, whiteSpace: "nowrap",
            }}
          >
            색상 사용 안함
          </button>

          <button
            type="button"
            onPointerDownCapture={stopAll}
            onMouseDown={stopAll}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.onClose(); }}
            aria-label="close"
            style={{
              height: 30, width: 30, borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.88)",
              cursor: "pointer", display: "inline-flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 16, lineHeight: 1,
            }}
          >×</button>
        </div>

        {/* 액션 행 */}
        {props.onDelete && (
          <>
            <div style={{ height: 10 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                onPointerDownCapture={stopAll}
                onMouseDown={stopAll}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onClose();
                  props.onDelete!();
                }}
                style={{
                  marginLeft: "auto",
                  height: 38, padding: "0 16px", borderRadius: 999,
                  background: "rgba(255,60,60,0.10)",
                  border: "1px solid rgba(255,80,80,0.22)",
                  color: "rgba(255,160,160,0.90)",
                  cursor: "pointer", fontSize: 13,
                  display: "inline-flex", alignItems: "center", gap: 7,
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,60,60,0.20)";
                  e.currentTarget.style.borderColor = "rgba(255,80,80,0.45)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255,60,60,0.10)";
                  e.currentTarget.style.borderColor = "rgba(255,80,80,0.22)";
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Del block
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
