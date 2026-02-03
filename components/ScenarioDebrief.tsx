"use client";

import React from 'react';
import type { PerformanceMetrics, TrainingScenario } from '../lib/training/types';

interface ScenarioDebriefProps {
  metrics: PerformanceMetrics;
  scenario: TrainingScenario;
  onRestart: () => void;
  onBackToScenarios: () => void;
}

export default function ScenarioDebrief({
  metrics,
  scenario,
  onRestart,
  onBackToScenarios,
}: ScenarioDebriefProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#00ff00';
    if (score >= 75) return '#ffaa00';
    if (score >= 60) return '#ff9900';
    return '#ff5555';
  };

  const getScoreGrade = (score: number): string => {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 60) return 'SATISFACTORY';
    return 'NEEDS IMPROVEMENT';
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={container}>
      {/* Header */}
      <div style={header}>
        <h1 style={title}>SCENARIO DEBRIEF</h1>
        <h2 style={scenarioName}>{scenario.name}</h2>
      </div>

      {/* Overall Result */}
      <div style={resultCard(metrics.success)}>
        <div style={resultIcon}>{metrics.success ? '✓' : '✗'}</div>
        <div style={resultContent}>
          <div style={resultStatus}>
            {metrics.success ? 'SCENARIO PASSED' : 'SCENARIO FAILED'}
          </div>
          <div style={resultScore(getScoreColor(metrics.score))}>
            SCORE: {metrics.score.toFixed(0)}/100 - {getScoreGrade(metrics.score)}
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div style={section}>
        <div style={sectionTitle}>PERFORMANCE SUMMARY</div>
        <div style={statsGrid}>
          <div style={statCard}>
            <div style={statLabel}>Duration</div>
            <div style={statValue}>{formatDuration(metrics.duration)}</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Final Power</div>
            <div style={statValue}>{(metrics.finalPower * 100).toFixed(1)}%</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Trips/SCRAMs</div>
            <div style={statValue(metrics.tripCount > 0 ? '#ff5555' : '#00ff00')}>
              {metrics.tripCount}
            </div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Limit Violations</div>
            <div style={statValue(metrics.safetyLimitViolations.length > 0 ? '#ff5555' : '#00ff00')}>
              {metrics.safetyLimitViolations.length}
            </div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Final Fuel Temp</div>
            <div style={statValue}>{metrics.finalFuelTemp.toFixed(0)} K</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Final Coolant Temp</div>
            <div style={statValue}>{metrics.finalCoolantTemp.toFixed(0)} K</div>
          </div>
        </div>
      </div>

      {/* Objectives Assessment */}
      <div style={section}>
        <div style={sectionTitle}>LEARNING OBJECTIVES</div>
        {scenario.objectives.map((obj) => {
          const completed = metrics.objectivesCompleted.includes(obj.id);
          return (
            <div key={obj.id} style={objectiveCard(completed)}>
              <div style={objectiveIcon}>{completed ? '✓' : '✗'}</div>
              <div style={objectiveContent}>
                <div style={objectiveText}>{obj.description}</div>
                <div style={objectiveStatus(completed)}>
                  {completed ? 'COMPLETED' : 'NOT COMPLETED'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedback */}
      {metrics.feedback.length > 0 && (
        <div style={section}>
          <div style={sectionTitle}>INSTRUCTOR FEEDBACK</div>
          <div style={feedbackBox}>
            {metrics.feedback.map((msg, idx) => (
              <div key={idx} style={feedbackItem}>
                {msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Control Actions Log */}
      {metrics.rodMovements.length > 0 && (
        <div style={section}>
          <div style={sectionTitle}>CONTROL ACTIONS LOG</div>
          <div style={logBox}>
            {metrics.rodMovements.slice(0, 10).map((action, idx) => (
              <div key={idx} style={logEntry}>
                <span style={logTime}>t={action.timestamp.toFixed(1)}s</span>
                <span style={logAction}>
                  Rod {action.action}: {(action.fromValue * 100).toFixed(0)}% →{' '}
                  {(action.toValue * 100).toFixed(0)}%
                </span>
              </div>
            ))}
            {metrics.rodMovements.length > 10 && (
              <div style={logMore}>
                ... and {metrics.rodMovements.length - 10} more actions
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={controls}>
        <button style={backButton} onClick={onBackToScenarios}>
          ← BACK TO SCENARIOS
        </button>
        <button style={retryButton} onClick={onRestart}>
          ↺ RETRY SCENARIO
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
};

const header: React.CSSProperties = {
  marginBottom: '24px',
  textAlign: 'center',
};

const title: React.CSSProperties = {
  fontSize: '24px',
  color: '#ff9900',
  letterSpacing: '2px',
  margin: '0 0 8px',
};

const scenarioName: React.CSSProperties = {
  fontSize: '18px',
  color: '#ccc',
  fontWeight: 'normal',
  margin: 0,
};

const resultCard = (success: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
  padding: '24px',
  marginBottom: '24px',
  background: success ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 85, 85, 0.1)',
  border: `2px solid ${success ? '#00ff00' : '#ff5555'}`,
  borderRadius: '8px',
});

const resultIcon: React.CSSProperties = {
  fontSize: '48px',
  lineHeight: 1,
};

const resultContent: React.CSSProperties = {
  flex: 1,
};

const resultStatus: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#fff',
  marginBottom: '8px',
};

const resultScore = (color: string): React.CSSProperties => ({
  fontSize: '18px',
  color: color,
  fontWeight: 'bold',
  letterSpacing: '1px',
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

const statsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '12px',
};

const statCard: React.CSSProperties = {
  padding: '16px',
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid #333',
  borderRadius: '6px',
  textAlign: 'center',
};

const statLabel: React.CSSProperties = {
  fontSize: '11px',
  color: '#888',
  marginBottom: '8px',
  letterSpacing: '1px',
};

const statValue = (color: string = '#fff'): React.CSSProperties => ({
  fontSize: '20px',
  fontWeight: 'bold',
  color: color,
  fontFamily: 'monospace',
});

const objectiveCard = (completed: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  padding: '16px',
  marginBottom: '12px',
  background: completed ? 'rgba(0, 255, 0, 0.05)' : 'rgba(255, 85, 85, 0.05)',
  border: `1px solid ${completed ? '#00ff00' : '#ff5555'}`,
  borderRadius: '6px',
});

const objectiveIcon: React.CSSProperties = {
  fontSize: '24px',
  minWidth: '24px',
};

const objectiveContent: React.CSSProperties = {
  flex: 1,
};

const objectiveText: React.CSSProperties = {
  fontSize: '14px',
  color: '#fff',
  marginBottom: '4px',
};

const objectiveStatus = (completed: boolean): React.CSSProperties => ({
  fontSize: '11px',
  fontWeight: 'bold',
  letterSpacing: '1px',
  color: completed ? '#00ff00' : '#ff5555',
});

const feedbackBox: React.CSSProperties = {
  padding: '16px',
  background: 'rgba(255, 153, 0, 0.1)',
  border: '1px solid rgba(255, 153, 0, 0.3)',
  borderRadius: '6px',
};

const feedbackItem: React.CSSProperties = {
  fontSize: '13px',
  color: '#ccc',
  lineHeight: 1.8,
  marginBottom: '8px',
};

const logBox: React.CSSProperties = {
  padding: '12px',
  background: 'rgba(0, 0, 0, 0.5)',
  border: '1px solid #333',
  borderRadius: '6px',
  fontFamily: 'monospace',
  fontSize: '12px',
  maxHeight: '200px',
  overflowY: 'auto',
};

const logEntry: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  padding: '4px 0',
  color: '#aaa',
};

const logTime: React.CSSProperties = {
  color: '#ff9900',
  minWidth: '60px',
};

const logAction: React.CSSProperties = {
  color: '#ccc',
};

const logMore: React.CSSProperties = {
  marginTop: '8px',
  color: '#666',
  fontStyle: 'italic',
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

const retryButton: React.CSSProperties = {
  ...buttonBase,
  background: 'linear-gradient(135deg, #ff9900, #ff6600)',
  color: '#000',
  border: 'none',
};
