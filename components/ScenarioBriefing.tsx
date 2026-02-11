"use client";

import React from 'react';
import type { TrainingScenario, TrainingRole } from '../lib/training/types';
import { getRoleDisplayName, getRoleDescription } from '../lib/training/roles';

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
  return (
    <div style={container}>
      <div style={header}>
        <h1 style={title}>{scenario.name}</h1>
        <div style={badges}>
          <span style={badge('#ff9900')}>DIFFICULTY: LEVEL {scenario.difficulty}</span>
          <span style={badge('#00ff00')}>
            {scenario.estimatedDuration} MINUTES
          </span>
        </div>
      </div>

      {/* Role Selection */}
      <div style={section}>
        <div style={sectionTitle}>OPERATOR ROLE</div>
        <div style={roleCard}>
          <div style={roleName}>{getRoleDisplayName(role)}</div>
          <div style={roleDescription}>{getRoleDescription(role)}</div>
        </div>
      </div>

      {/* Educational Video */}
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

      {/* Scenario Briefing */}
      <div style={section}>
        <div style={sectionTitle}>MISSION BRIEFING</div>
        <div style={briefingText}>{scenario.briefing}</div>
      </div>

      {/* Objectives */}
      <div style={section}>
        <div style={sectionTitle}>LEARNING OBJECTIVES</div>
        {scenario.objectives.map((obj, idx) => (
          <div key={obj.id} style={objectiveCard}>
            <div style={objectiveHeader}>
              <span style={objectiveNumber}>{idx + 1}</span>
              <span style={objectiveText}>{obj.description}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Procedure Overview */}
      {scenario.proceduralGuidance && scenario.proceduralGuidance.length > 0 && (
        <div style={section}>
          <div style={sectionTitle}>PROCEDURE OVERVIEW</div>
          <div style={procedureList}>
            {scenario.proceduralGuidance.map((step) => (
              <div key={step.step} style={procedureStep}>
                <span style={stepNumber}>{step.step}.</span>
                <span style={stepText}>{step.instruction}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={controls}>
        <button style={backButton} onClick={onBack}>
          ← BACK TO SCENARIOS
        </button>
        <button style={startButton} onClick={onStart}>
          BEGIN SCENARIO →
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const container: React.CSSProperties = {
  maxWidth: '900px',
  margin: '0 auto',
  padding: '32px 24px',
  paddingTop: '92px', // Account for 60px nav bar + 32px spacing
};

const header: React.CSSProperties = {
  marginBottom: '32px',
  textAlign: 'center',
};

const title: React.CSSProperties = {
  fontSize: '28px',
  color: '#ff9900',
  letterSpacing: '2px',
  margin: '0 0 16px',
};

const badges: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '12px',
};

const badge = (color: string): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 'bold',
  letterSpacing: '1px',
  background: `${color}20`,
  color: color,
  border: `1px solid ${color}`,
});

const section: React.CSSProperties = {
  marginBottom: '24px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '12px',
  letterSpacing: '2px',
  color: '#ff9900',
  fontWeight: 'bold',
  marginBottom: '12px',
  paddingBottom: '8px',
  borderBottom: '1px solid #333',
};

const roleCard: React.CSSProperties = {
  padding: '16px',
  background: 'rgba(0, 0, 0, 0.4)',
  border: '1px solid #333',
  borderRadius: '6px',
};

const roleName: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#fff',
  marginBottom: '8px',
};

const roleDescription: React.CSSProperties = {
  fontSize: '13px',
  color: '#aaa',
  lineHeight: 1.6,
};

const briefingText: React.CSSProperties = {
  padding: '20px',
  background: 'rgba(0, 0, 0, 0.5)',
  border: '1px solid #444',
  borderRadius: '6px',
  fontFamily: 'monospace',
  fontSize: '13px',
  color: '#ccc',
  lineHeight: 1.8,
  whiteSpace: 'pre-wrap',
};

const objectiveCard: React.CSSProperties = {
  padding: '12px 16px',
  marginBottom: '8px',
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid #333',
  borderRadius: '4px',
};

const objectiveHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const objectiveNumber: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  background: '#ff9900',
  color: '#000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  fontSize: '14px',
  flexShrink: 0,
};

const objectiveText: React.CSSProperties = {
  fontSize: '14px',
  color: '#fff',
  lineHeight: 1.5,
};

const procedureList: React.CSSProperties = {
  padding: '16px',
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid #333',
  borderRadius: '6px',
};

const procedureStep: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  padding: '8px 0',
  borderBottom: '1px solid #222',
};

const stepNumber: React.CSSProperties = {
  fontSize: '13px',
  color: '#ff9900',
  fontWeight: 'bold',
  minWidth: '24px',
};

const stepText: React.CSSProperties = {
  fontSize: '13px',
  color: '#ccc',
  lineHeight: 1.6,
};

const controls: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  marginTop: '32px',
  paddingTop: '24px',
  borderTop: '1px solid #333',
};

const buttonBase: React.CSSProperties = {
  padding: '12px 24px',
  border: 'none',
  borderRadius: '4px',
  fontSize: '13px',
  fontWeight: 'bold',
  letterSpacing: '1px',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const backButton: React.CSSProperties = {
  ...buttonBase,
  background: 'rgba(0, 0, 0, 0.4)',
  color: '#888',
  border: '1px solid #444',
};

const startButton: React.CSSProperties = {
  ...buttonBase,
  background: 'linear-gradient(135deg, #ff9900, #ff6600)',
  color: '#000',
  border: 'none',
  boxShadow: '0 0 20px rgba(255, 153, 0, 0.5)',
};

const videoContainer: React.CSSProperties = {
  position: 'relative',
  paddingBottom: '56.25%', // 16:9 aspect ratio
  height: 0,
  overflow: 'hidden',
  background: 'rgba(0, 0, 0, 0.6)',
  border: '1px solid #444',
  borderRadius: '6px',
};

const videoFrame: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
};
