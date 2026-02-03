# U-FORCE Training System

A comprehensive, scenario-based training platform for nuclear reactor operations education.

## Overview

The U-FORCE Training System transforms the reactor physics simulator into an education-focused digital twin platform. It provides structured learning experiences with clear objectives, procedural guidance, and detailed performance assessment.

## Features

### 🎯 Scenario-Based Learning
- Pre-configured training scenarios with specific learning objectives
- Realistic initial conditions and expected procedures
- Automatic performance assessment against industry-standard criteria

### 👥 Role-Based Training
- **Reactor Operator Trainee (RO-T)**: Limited controls, procedural guidance, hints enabled
- **Reactor Operator (RO)**: Full operational authority, independent procedure execution
- **Senior Reactor Operator (SRO)**: Supervisory authority including bypass capability
- **Maintenance Technician**: View-only monitoring for operational context awareness
- **Free Play Mode**: Unrestricted sandbox for exploration

### 📊 Performance Metrics
Automatic tracking of:
- Procedural compliance (steps completed, skipped, out of order)
- Operational proficiency (response times, parameter control, trip avoidance)
- Control actions (rod movements, pump controls, SCRAM usage)
- Safety limit violations and trip conditions
- Overall scenario score (0-100) with detailed feedback

### 🎓 Educational Overlays
- Scenario briefings explaining mission and objectives
- Procedural guidance with step-by-step instructions
- Contextual hints triggered by operator actions (trainee mode)
- Post-scenario debrief with performance analysis

## Architecture

```
lib/training/
├── types.ts              # Core type definitions for training system
├── roles.ts              # Role-based permission system
├── metrics.ts            # Performance metrics collection and scoring
├── index.ts              # Main exports and scenario registry
└── scenarios/
    ├── startup.ts        # Normal startup from cold shutdown
    └── pump-trip.ts      # Loss of primary coolant pump

components/
├── ScenarioSelector.tsx  # Choose training scenario or free play
├── ScenarioBriefing.tsx  # Pre-scenario briefing and objectives
└── ScenarioDebrief.tsx   # Post-scenario performance analysis

app/
├── page.tsx              # Free play simulator (existing)
└── train/
    └── page.tsx          # Training mode with scenario integration
```

## Current Scenarios

### 1. Normal Startup from Cold Shutdown
**Difficulty**: Intermediate (Level 2)
**Duration**: ~15 minutes
**Role**: Reactor Operator

**Learning Objectives**:
- Achieve criticality using gradual rod withdrawal
- Reach 20% power without exceeding thermal limits
- Complete startup without automatic trips

**Success Criteria**:
- Final power: 18-22%
- Coolant temperature: <570 K
- No trips or safety limit violations

### 2. Loss of Primary Coolant Pump
**Difficulty**: Advanced (Level 3)
**Duration**: ~5 minutes
**Role**: Reactor Operator

**Learning Objectives**:
- Recognize pump trip condition immediately
- Execute manual SCRAM within 10 seconds
- Prevent fuel temperature from exceeding damage threshold

**Success Criteria**:
- Time to SCRAM: <10 seconds
- Max fuel temperature: <1600 K
- Proper emergency response execution

## Usage

### For Students/Trainees

1. **Start Training Mode**
   - Navigate to `/train` or click "🎓 TRAINING MODE" from home page
   - Select a scenario from the training center

2. **Read the Briefing**
   - Review initial conditions and mission objectives
   - Understand procedural steps and safety limits
   - Note your role and available controls

3. **Execute the Scenario**
   - Follow procedural guidance (if enabled for your role)
   - Monitor reactor parameters closely
   - Respond appropriately to changes and alarms

4. **Review Performance**
   - Examine your score and objective completion
   - Read instructor feedback
   - Review control action log to understand your decisions
   - Retry scenario to improve performance

### For Instructors/Course Designers

#### Creating New Scenarios

1. **Define the Scenario** (in `scenarios/your-scenario.ts`):

```typescript
import type { TrainingScenario } from '../types';
import { TrainingRole } from '../types';

export const yourScenario: TrainingScenario = {
  id: 'PWR_YOUR_SCENARIO_01',
  name: 'Your Scenario Name',
  description: 'Brief description for scenario selector',
  difficulty: 2, // 1-4
  estimatedDuration: 10, // minutes
  recommendedRole: TrainingRole.RO,

  initialState: {
    reactorState: {
      t: 0,
      P: 0.5,  // 50% power
      Tf: 900,
      Tc: 570,
      C: [/* precursor concentrations */],
    },
    controls: {
      rod: 0.6,
      pumpOn: true,
      scram: false,
    },
    timeAcceleration: 1,
  },

  objectives: [
    {
      id: 'OBJ1',
      description: 'What the trainee should achieve',
      assessmentCriteria: [
        {
          metric: 'finalPower',
          target: '48-52', // Range: min-max
          unit: '%',
          weight: 0.5, // Importance (0-1)
        },
        {
          metric: 'tripsOccurred',
          target: '0', // Exact value
          unit: 'count',
          weight: 0.5,
        },
      ],
    },
  ],

  completionConditions: {
    type: 'state_reached',
    parameters: {
      powerMin: 0.48,
      powerMax: 0.52,
      stableDuration: 30, // seconds
    },
  },

  failureConditions: [
    {
      type: 'trip',
      parameters: {},
      description: 'Automatic reactor trip occurred',
    },
  ],

  briefing: `Your detailed briefing text here...`,

  proceduralGuidance: [
    {
      step: 1,
      instruction: 'First action to take',
      expectedAction: 'rod_movement',
    },
    // ... more steps
  ],

  hints: [
    {
      triggerId: 'HINT_ID',
      triggerCondition: 'power > 0.6',
      content: 'Your hint text here',
      displayMode: 'automatic',
      priority: 'warning',
    },
  ],
};
```

2. **Register the Scenario** (in `index.ts`):

```typescript
import { yourScenario } from './scenarios/your-scenario';

export const SCENARIOS: TrainingScenario[] = [
  normalStartupScenario,
  pumpTripScenario,
  yourScenario, // Add your scenario
];
```

3. **Test the Scenario**:
   - Verify initial conditions are achievable
   - Test completion and failure conditions
   - Validate assessment criteria logic
   - Review feedback messages

## Performance Assessment

### Scoring Algorithm

The scoring system evaluates performance across multiple dimensions:

1. **Objective Achievement** (weighted by criterion importance)
   - Each assessment criterion is evaluated against target values
   - Criteria can specify: exact values, ranges, thresholds (<, >)
   - Individual criterion scores are weighted and averaged

2. **Penalty Deductions**
   - Automatic trips: -20 points each
   - Safety limit violations: -15 points each
   - Skipped procedure steps: -5 points each

3. **Final Score** = (Objective Score - Penalties), clamped to 0-100

### Score Interpretation

- **90-100**: EXCELLENT - Ready for independent operation
- **75-89**: GOOD - Competent with minor areas for improvement
- **60-74**: SATISFACTORY - Meets minimum standards
- **0-59**: NEEDS IMPROVEMENT - Additional training required

## Customization

### Reactor Profiles (Future Enhancement)

The system is designed to support multiple reactor types through configuration profiles:

```typescript
interface ReactorProfile {
  name: string;
  type: 'PWR' | 'BWR' | 'SMR' | 'Generation_IV';
  nominalPowerMWt: number;
  feedbackCoefficients: { ... };
  operationalLimits: { ... };
  controlCharacteristics: { ... };
}
```

This enables:
- Life extension/uprate retraining (modified parameters)
- SMR transition training (different thermal characteristics)
- Advanced reactor onboarding (novel physics)

### Integration with LMS

Performance metrics can be exported for integration with Learning Management Systems:

```typescript
const metrics = metricsCollector.getMetrics();
const exportData = {
  sessionId: metrics.sessionId,
  userId: 'student-123',
  scenarioId: metrics.scenarioId,
  score: metrics.score,
  success: metrics.success,
  timestamp: metrics.endTime,
  evidence: {
    objectives: metrics.objectivesCompleted,
    violations: metrics.safetyLimitViolations,
    actions: metrics.rodMovements,
  },
};

// POST to LMS API or export as xAPI/SCORM
```

## Regulatory Positioning

**IMPORTANT**: This simulator is positioned as:
- ✅ **Pre-qualification training** - prepares candidates for site-specific programs
- ✅ **Foundational education** - teaches reactor physics and operations concepts
- ✅ **Skills maintenance** - refresher training between certifications
- ✅ **Technology familiarization** - introduction to new reactor types (SMR, Gen IV)

**NOT positioned as**:
- ❌ Replacement for NRC-licensed operator training
- ❌ Satisfaction of 10 CFR 55 requirements
- ❌ Plant-specific qualification substitute

The system is **aligned with**:
- IAEA Safety Standards (NS-G-2.2: Operations)
- NRC operator licensing competencies (NUREG-1021)
- INPO training standards and systematic approach to training (SAT)

## Roadmap

### Phase 1 - MVP (Current)
- [x] Core training framework (scenarios, roles, metrics)
- [x] 2 training scenarios (startup, pump trip)
- [x] Basic UI (selector, briefing, debrief)
- [x] Performance metrics and scoring

### Phase 2 - Enhancement (Next 3-6 months)
- [ ] Additional scenarios (rod ramp, xenon transient, spurious trip)
- [ ] Enhanced procedural guidance with validation
- [ ] Real-time hints system with intelligent triggers
- [ ] Session replay capability
- [ ] Instructor dashboard for monitoring trainees

### Phase 3 - Advanced (6-12 months)
- [ ] Multi-reactor profile support (PWR, BWR, SMR)
- [ ] Multi-user collaborative scenarios
- [ ] AI-powered adaptive hint system
- [ ] Digital credential integration (Credly, Accredible)
- [ ] LMS integration (xAPI, SCORM)
- [ ] Voice command interface

## License and Use

This training system is part of the U-FORCE educational digital twin project. For commercial licensing, institutional partnerships, or integration inquiries, contact the development team.

## Contributing

To add new scenarios or enhance the training system:

1. Follow the scenario creation pattern in `scenarios/`
2. Ensure all type definitions match `types.ts`
3. Test scenarios thoroughly before committing
4. Document learning objectives and assessment criteria
5. Provide realistic briefing text with proper context

---

**U-FORCE Training System** - Transforming nuclear workforce development through simulation-based learning.
