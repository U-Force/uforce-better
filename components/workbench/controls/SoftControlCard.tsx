"use client";

import React from "react";
import { COLORS, FONTS, FONT_SIZES, RADIUS, BLUR } from "../../../lib/workbench/theme";
import { closeButton } from "../../../lib/workbench/styles";

interface SoftControlCardProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export default function SoftControlCard({
  title,
  children,
  onClose,
}: SoftControlCardProps) {
  return (
    <div style={overlay}>
      <div style={card}>
        <div style={header}>
          <span style={titleStyle}>{title}</span>
          <button style={closeBtn} onClick={onClose}>x</button>
        </div>
        <div style={body}>{children}</div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "absolute",
  bottom: "64px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 60,
};

const card: React.CSSProperties = {
  background: COLORS.bgDark,
  border: "1px solid rgba(16, 185, 129, 0.3)",
  borderRadius: RADIUS.xl,
  backdropFilter: BLUR.xl,
  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  minWidth: "280px",
  maxWidth: "360px",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 14px",
  borderBottom: `1px solid ${COLORS.borderSubtle}`,
};

const titleStyle: React.CSSProperties = {
  fontSize: FONT_SIZES.md,
  fontWeight: 700,
  letterSpacing: "1.5px",
  color: COLORS.teal,
  fontFamily: FONTS.sans,
};

const closeBtn: React.CSSProperties = {
  ...closeButton,
  border: "1px solid rgba(255,255,255,0.12)",
};

const body: React.CSSProperties = {
  padding: "14px",
};
