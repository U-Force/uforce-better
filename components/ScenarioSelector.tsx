"use client";

import React from 'react';
import type { TrainingScenario, TrainingRole } from '../lib/training/types';
import { getRoleDisplayName } from '../lib/training/roles';

interface ScenarioSelectorProps {
  scenarios: TrainingScenario[];
  onSelectScenario: (scenario: TrainingScenario) => void;
  onSelectFreePlay: () => void;
}

export default function ScenarioSelector({
  scenarios,
  onSelectScenario,
  onSelectFreePlay,
}: ScenarioSelectorProps) {
  const getDifficultyColor = (difficulty: number): string => {
    switch (difficulty) {
      case 1:
        return '#00ff00';
      case 2:
        return '#ffaa00';
      case 3:
        return '#ff9900';
      case 4:
        return '#ff5555';
      default:
        return '#888';
    }
  };

  const getDifficultyLabel = (difficulty: number): string => {
    switch (difficulty) {
      case 1:
        return 'Beginner';
      case 2:
        return 'Intermediate';
      case 3:
        return 'Advanced';
      case 4:
        return 'Expert';
      default:
        return 'Unknown';
    }
  };

  return (
    <div style={container}>
      <div style={header}>
        <h1 style={title}>U-FORCE Training Center</h1>
        <p style={subtitle}>Select a training scenario or enter free play mode</p>
      </div>

      {/* Free Play Option */}
      <div style={sectionHeader}>
        <span style={sectionTitle}>FREE PLAY</span>
      </div>
      <div style={scenarioCard} onClick={onSelectFreePlay}>
        <div style={cardHeader}>
          <span style={scenarioTitle}>🎮 Free Play Mode</span>
          <span style={difficultyBadge('#888')}>UNRESTRICTED</span>
        </div>
        <p style={scenarioDescription}>
          Explore the simulator without restrictions. Full control authority, no objectives or
          time limits. Perfect for experimentation and learning reactor physics.
        </p>
        <div style={cardFooter}>
          <span style={footerItem}>⏱ Unlimited time</span>
          <span style={footerItem}>🎯 No objectives</span>
          <span style={footerItem}>🔓 All controls enabled</span>
        </div>
      </div>

      {/* Training Scenarios */}
      <div style={sectionHeader}>
        <span style={sectionTitle}>TRAINING SCENARIOS</span>
      </div>

      {scenarios.map((scenario) => (
        <div
          key={scenario.id}
          style={scenarioCard}
          onClick={() => onSelectScenario(scenario)}
        >
          <div style={cardHeader}>
            <span style={scenarioTitle}>{scenario.name}</span>
            <span style={difficultyBadge(getDifficultyColor(scenario.difficulty))}>
              {getDifficultyLabel(scenario.difficulty)}
            </span>
          </div>

          <p style={scenarioDescription}>{scenario.description}</p>

          <div style={cardFooter}>
            <span style={footerItem}>
              ⏱ ~{scenario.estimatedDuration} min
            </span>
            <span style={footerItem}>
              👤 {getRoleDisplayName(scenario.recommendedRole)}
            </span>
            <span style={footerItem}>
              🎯 {scenario.objectives.length} objective{scenario.objectives.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      ))}

      {/* Help Text */}
      <div style={helpBox}>
        <div style={helpTitle}>About Training Mode</div>
        <p style={helpText}>
          Training scenarios provide structured learning experiences with clear objectives and
          performance assessment. Each scenario includes briefings, procedural guidance, and
          detailed feedback on your performance.
        </p>
        <p style={helpText}>
          Free Play mode gives you unrestricted access to explore reactor behavior without
          objectives or time pressure.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const container: React.CSSProperties = {
  maxWidth: '800px',
  margin: '0 auto',
  padding: '32px 24px',
};

const header: React.CSSProperties = {
  marginBottom: '32px',
  textAlign: 'center',
};

const title: React.CSSProperties = {
  fontSize: '32px',
  color: '#ff9900',
  letterSpacing: '2px',
  margin: '0 0 8px',
};

const subtitle: React.CSSProperties = {
  fontSize: '14px',
  color: '#888',
  margin: 0,
};

const sectionHeader: React.CSSProperties = {
  marginTop: '32px',
  marginBottom: '16px',
  paddingBottom: '8px',
  borderBottom: '1px solid #333',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '12px',
  letterSpacing: '2px',
  color: '#ff9900',
  fontWeight: 'bold',
};

const scenarioCard: React.CSSProperties = {
  padding: '20px',
  marginBottom: '16px',
  background: 'rgba(0, 0, 0, 0.4)',
  border: '1px solid #333',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const cardHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
};

const scenarioTitle: React.CSSProperties = {
  fontSize: '18px',
  color: '#fff',
  fontWeight: 'bold',
};

const difficultyBadge = (color: string): React.CSSProperties => ({
  padding: '4px 10px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 'bold',
  letterSpacing: '1px',
  background: `${color}20`,
  color: color,
  border: `1px solid ${color}`,
});

const scenarioDescription: React.CSSProperties = {
  fontSize: '14px',
  color: '#ccc',
  lineHeight: 1.6,
  marginBottom: '16px',
};

const cardFooter: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  flexWrap: 'wrap',
};

const footerItem: React.CSSProperties = {
  fontSize: '12px',
  color: '#888',
};

const helpBox: React.CSSProperties = {
  marginTop: '32px',
  padding: '16px',
  background: 'rgba(255, 153, 0, 0.1)',
  border: '1px solid rgba(255, 153, 0, 0.3)',
  borderRadius: '6px',
};

const helpTitle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#ff9900',
  marginBottom: '8px',
};

const helpText: React.CSSProperties = {
  fontSize: '13px',
  color: '#aaa',
  lineHeight: 1.6,
  margin: '0 0 8px',
};
