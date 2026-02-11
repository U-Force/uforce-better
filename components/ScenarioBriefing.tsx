"use client";

import React from 'react';
import type { TrainingScenario, TrainingRole } from '../lib/training/types';
import { getRoleDisplayName, getRoleDescription } from '../lib/training/roles';
import { COLORS, FONTS, FONT_SIZES, RADIUS, BLUR } from '../lib/workbench/theme';

/**
 * Convert video URL to embeddable format
 * Supports YouTube, Vimeo, and direct video files
 */
function getEmbedUrl(url: string): string {
  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.includes('youtu.be')
      ? url.split('youtu.be/')[1]?.split('?')[0]
      : new URL(url).searchParams.get('v');
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // Vimeo
  if (url.includes('vimeo.com')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    return `https://player.vimeo.com/video/${videoId}`;
  }

  // Direct video file or already embedded URL
  return url;
}

const getDifficultyColor = (d: number) =>
  d === 1 ? COLORS.emerald : d === 2 ? COLORS.amber : d === 3 ? '#ff9900' : COLORS.red;
const getDifficultyLabel = (d: number) =>
  d === 1 ? 'Beginner' : d === 2 ? 'Intermediate' : d === 3 ? 'Advanced' : 'Expert';

interface ScenarioBriefingProps {
  scenario: TrainingScenario;
  role: TrainingRole;
  onStart: () => void;
  onBack: () => void;
}

export default function ScenarioBriefing({
  scenario,
  role,
  onStart,
  onBack,
}: ScenarioBriefingProps) {
  const diffColor = getDifficultyColor(scenario.difficulty);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; }
        body { background: #060a0f; margin: 0; }
      `}</style>

      <div style={shell}>
        {/* Top bar */}
        <div style={topBar}>
          <div style={topBarLeft}>
            <img src="/logo.png" alt="U-FORCE" style={topBarLogo} />
            <span style={topBarBrand}>U-FORCE</span>
            <span style={topBarSub}>MISSION BRIEFING</span>
          </div>
          <button style={topBarBackBtn} onClick={onBack}>
            ← Back to Scenarios
          </button>
        </div>

        <div style={scrollArea}>
          <div style={container}>
            {/* ── Header ── */}
            <div style={header}>
              <h1 style={title}>{scenario.name}</h1>
              <div style={badges}>
                <span style={badgeStyle(diffColor)}>
                  {getDifficultyLabel(scenario.difficulty).toUpperCase()}
                </span>
                <span style={badgeStyle(COLORS.blue)}>
                  ~{scenario.estimatedDuration} MIN
                </span>
                <span style={badgeStyle(COLORS.slate)}>
                  {scenario.objectives.length} OBJECTIVE{scenario.objectives.length > 1 ? 'S' : ''}
                </span>
              </div>
            </div>

            {/* ── Operator Role ── */}
            <div style={section}>
              <div style={sectionTitle}>OPERATOR ROLE</div>
              <div style={roleCard}>
                <div style={roleName}>{getRoleDisplayName(role)}</div>
                <div style={roleDesc}>{getRoleDescription(role)}</div>
              </div>
            </div>

            {/* ── Educational Video ── */}
            {scenario.videoUrl && (
              <div style={section}>
                <div style={sectionTitle}>EDUCATIONAL VIDEO</div>
                <div style={videoContainer}>
                  <iframe
                    style={videoFrame}
                    src={getEmbedUrl(scenario.videoUrl)}
                    title={`${scenario.name} - Tutorial Video`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* ── Mission Briefing ── */}
            <div style={section}>
              <div style={sectionTitle}>MISSION BRIEFING</div>
              <div style={briefingBox}>{scenario.briefing}</div>
            </div>

            {/* ── Learning Objectives ── */}
            <div style={section}>
              <div style={sectionTitle}>LEARNING OBJECTIVES</div>
              {scenario.objectives.map((obj, idx) => (
                <div key={obj.id} style={objCard}>
                  <div style={objNumber}>{idx + 1}</div>
                  <div style={objText}>{obj.description}</div>
                </div>
              ))}
            </div>

            {/* ── Procedure Overview ── */}
            {scenario.proceduralGuidance && scenario.proceduralGuidance.length > 0 && (
              <div style={section}>
                <div style={sectionTitle}>PROCEDURE OVERVIEW</div>
                <div style={procBox}>
                  {scenario.proceduralGuidance.map((step) => (
                    <div key={step.step} style={procStep}>
                      <span style={procNum}>{step.step}.</span>
                      <span style={procText}>{step.instruction}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Initial Conditions ── */}
            <div style={section}>
              <div style={sectionTitle}>INITIAL CONDITIONS</div>
              <div style={condGrid}>
                <div style={condCard}>
                  <div style={condLabel}>Reactor Power</div>
                  <div style={condVal}>
                    {(scenario.initialState.reactorState.P * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={condCard}>
                  <div style={condLabel}>Rod Position</div>
                  <div style={condVal}>
                    {(scenario.initialState.controls.rod * 100).toFixed(0)}%
                  </div>
                </div>
                <div style={condCard}>
                  <div style={condLabel}>Time Acceleration</div>
                  <div style={condVal}>
                    {scenario.initialState.timeAcceleration}x
                  </div>
                </div>
              </div>
            </div>

            {/* ── Start / Back Controls ── */}
            <div style={actionBar}>
              <button style={btnBack} onClick={onBack}>
                ← BACK TO SCENARIOS
              </button>
              <button style={btnStart} onClick={onStart}>
                BEGIN MISSION →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const shell: React.CSSProperties = {
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'linear-gradient(180deg, #060a0f 0%, #0c1117 100%)',
  fontFamily: FONTS.sans,
  color: COLORS.white,
};

const topBar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  height: '42px',
  background: COLORS.bgDark,
  borderBottom: `1px solid ${COLORS.borderSubtle}`,
  backdropFilter: BLUR.md,
  flexShrink: 0,
};

const topBarLeft: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const topBarLogo: React.CSSProperties = {
  width: '22px',
  height: '22px',
  filter: 'brightness(0) invert(1) opacity(0.7)',
};

const topBarBrand: React.CSSProperties = {
  fontSize: FONT_SIZES.lg,
  fontWeight: 700,
  color: COLORS.white,
  letterSpacing: '1px',
};

const topBarSub: React.CSSProperties = {
  fontSize: FONT_SIZES.sm,
  color: COLORS.teal,
  letterSpacing: '1.5px',
  marginLeft: '4px',
  fontWeight: 600,
};

const topBarBackBtn: React.CSSProperties = {
  padding: '4px 12px',
  fontSize: FONT_SIZES.sm,
  fontWeight: 600,
  fontFamily: FONTS.sans,
  color: COLORS.slate,
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${COLORS.borderMedium}`,
  borderRadius: RADIUS.md,
  cursor: 'pointer',
  letterSpacing: '0.3px',
};

const scrollArea: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
};

const container: React.CSSProperties = {
  maxWidth: '780px',
  margin: '0 auto',
  padding: '32px 28px 80px',
};

// ── Header ──

const header: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '32px',
};

const title: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: COLORS.white,
  letterSpacing: '0.5px',
  margin: '0 0 12px',
};

const badges: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '8px',
  flexWrap: 'wrap',
};

const badgeStyle = (color: string): React.CSSProperties => ({
  padding: '3px 10px',
  borderRadius: RADIUS.sm,
  fontSize: FONT_SIZES.xs,
  fontWeight: 700,
  letterSpacing: '0.8px',
  background: `${color}20`,
  color,
  border: `1px solid ${color}40`,
});

// ── Sections ──

const section: React.CSSProperties = {
  marginBottom: '24px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: FONT_SIZES.xs,
  letterSpacing: '1.5px',
  color: COLORS.teal,
  fontWeight: 700,
  marginBottom: '10px',
  paddingBottom: '6px',
  borderBottom: `1px solid ${COLORS.borderSubtle}`,
};

// ── Role ──

const roleCard: React.CSSProperties = {
  padding: '14px 16px',
  background: COLORS.bgMedium,
  border: `1px solid ${COLORS.borderSubtle}`,
  borderRadius: RADIUS.lg,
};

const roleName: React.CSSProperties = {
  fontSize: FONT_SIZES.xl,
  fontWeight: 700,
  color: COLORS.white,
  marginBottom: '6px',
};

const roleDesc: React.CSSProperties = {
  fontSize: FONT_SIZES.md,
  color: COLORS.slate,
  lineHeight: 1.6,
};

// ── Briefing ──

const briefingBox: React.CSSProperties = {
  padding: '16px 18px',
  background: COLORS.bgMedium,
  border: `1px solid ${COLORS.borderSubtle}`,
  borderRadius: RADIUS.lg,
  fontFamily: FONTS.mono,
  fontSize: FONT_SIZES.md,
  color: COLORS.slateLight,
  lineHeight: 1.8,
  whiteSpace: 'pre-wrap',
};

// ── Objectives ──

const objCard: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 14px',
  marginBottom: '6px',
  background: COLORS.bgMedium,
  border: `1px solid ${COLORS.borderSubtle}`,
  borderRadius: RADIUS.lg,
};

const objNumber: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  background: COLORS.amber,
  color: '#000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: FONT_SIZES.md,
  flexShrink: 0,
};

const objText: React.CSSProperties = {
  fontSize: FONT_SIZES.md,
  color: COLORS.white,
  lineHeight: 1.5,
};

// ── Procedure ──

const procBox: React.CSSProperties = {
  padding: '14px 16px',
  background: COLORS.bgMedium,
  border: `1px solid ${COLORS.borderSubtle}`,
  borderRadius: RADIUS.lg,
};

const procStep: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  padding: '6px 0',
  borderBottom: `1px solid ${COLORS.borderSubtle}`,
};

const procNum: React.CSSProperties = {
  fontSize: FONT_SIZES.md,
  color: COLORS.amber,
  fontWeight: 700,
  fontFamily: FONTS.mono,
  minWidth: '20px',
};

const procText: React.CSSProperties = {
  fontSize: FONT_SIZES.md,
  color: COLORS.slateLight,
  lineHeight: 1.6,
};

// ── Initial Conditions ──

const condGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
};

const condCard: React.CSSProperties = {
  padding: '12px',
  background: COLORS.bgMedium,
  border: `1px solid ${COLORS.borderSubtle}`,
  borderRadius: RADIUS.lg,
  textAlign: 'center',
};

const condLabel: React.CSSProperties = {
  fontSize: FONT_SIZES.xs,
  color: COLORS.slateDark,
  marginBottom: '5px',
  letterSpacing: '0.8px',
  fontWeight: 600,
};

const condVal: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: COLORS.white,
  fontFamily: FONTS.mono,
};

// ── Video ──

const videoContainer: React.CSSProperties = {
  position: 'relative',
  paddingBottom: '56.25%',
  height: 0,
  overflow: 'hidden',
  background: COLORS.bgMedium,
  border: `1px solid ${COLORS.borderSubtle}`,
  borderRadius: RADIUS.lg,
};

const videoFrame: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
};

// ── Action Buttons ──

const actionBar: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  marginTop: '36px',
  paddingTop: '20px',
  borderTop: `1px solid ${COLORS.borderSubtle}`,
};

const btnBase: React.CSSProperties = {
  padding: '10px 22px',
  border: 'none',
  borderRadius: RADIUS.md,
  fontSize: FONT_SIZES.lg,
  fontWeight: 700,
  letterSpacing: '0.5px',
  cursor: 'pointer',
  fontFamily: FONTS.sans,
  transition: 'all 0.15s',
};

const btnBack: React.CSSProperties = {
  ...btnBase,
  background: 'rgba(255,255,255,0.04)',
  color: COLORS.slate,
  border: `1px solid ${COLORS.borderMedium}`,
};

const btnStart: React.CSSProperties = {
  ...btnBase,
  background: `linear-gradient(135deg, ${COLORS.emerald}, ${COLORS.teal})`,
  color: '#000',
  border: 'none',
  boxShadow: `0 0 16px ${COLORS.emerald}40`,
};
