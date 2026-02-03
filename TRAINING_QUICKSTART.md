# U-FORCE Training System - Quick Start Guide

## What's Been Built

A complete educational training platform built on top of your nuclear reactor simulator. This transforms it from a physics sandbox into a workforce development tool.

## 🎯 Key Features Implemented

### 1. **Scenario-Based Training**
Two complete training scenarios:
- **Normal Startup**: Bring reactor from cold shutdown to 20% power
- **Emergency Response**: Handle loss of coolant pump at 70% power

### 2. **Role-Based Access Control**
Five operator roles with different permissions:
- Reactor Operator Trainee (limited controls, hints enabled)
- Reactor Operator (full operational authority)
- Senior Reactor Operator (supervisory authority)
- Maintenance Technician (view-only)
- Free Play Mode (unrestricted)

### 3. **Performance Assessment**
Automatic metrics tracking:
- Response times and procedural compliance
- Parameter control quality
- Safety violations and trips
- 0-100 scoring with detailed feedback

### 4. **Educational UI**
- Scenario selector with difficulty ratings
- Pre-scenario briefings with objectives
- Post-scenario debrief with performance analysis
- Real-time monitoring during training

## 📁 What Was Created

```
lib/training/
├── types.ts              # Type definitions for scenarios, roles, metrics
├── roles.ts              # Permission system for different operator roles
├── metrics.ts            # Performance tracking and scoring engine
├── index.ts              # Scenario registry
├── scenarios/
│   ├── startup.ts        # Normal startup scenario
│   └── pump-trip.ts      # Emergency pump trip scenario
└── README.md             # Detailed technical documentation

components/
├── ScenarioSelector.tsx  # Choose scenario or free play
├── ScenarioBriefing.tsx  # Pre-scenario briefing screen
└── ScenarioDebrief.tsx   # Post-scenario results screen

app/
├── page.tsx              # Free play mode (existing, now with link to training)
└── train/
    └── page.tsx          # New training mode page
```

## 🚀 How to Use

### Running the Training System

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Access the simulator**:
   - **Free Play Mode**: http://localhost:3000
   - **Training Mode**: http://localhost:3000/train

### As a Student

1. Go to http://localhost:3000/train
2. Select "Normal Startup from Cold Shutdown" scenario
3. Read the briefing carefully
4. Click "BEGIN SCENARIO"
5. Follow the procedural guidance
6. Complete the objectives
7. Click "STOP" when finished
8. Review your performance in the debrief

### As an Instructor

1. Review scenarios in `lib/training/scenarios/`
2. Modify objectives and assessment criteria
3. Adjust difficulty and time limits
4. Test scenarios with students
5. Export performance metrics for analysis

## 🎓 Example Training Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SCENARIO SELECTOR                        │
│  Choose: Free Play | Startup Scenario | Emergency Response │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    SCENARIO BRIEFING                        │
│  Mission: Bring reactor from shutdown to 20% power         │
│  Objectives: 1) Achieve criticality 2) No trips 3) ±2%     │
│  Procedure: 7 steps with guidance                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    SIMULATOR RUNNING                        │
│  [Operator performs startup procedure]                     │
│  • Withdraw rods gradually                                 │
│  • Monitor power rise                                      │
│  • Observe temperature feedback                            │
│  • Stabilize at 20% power                                  │
│  [Metrics tracked automatically]                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    SCENARIO DEBRIEF                         │
│  ✓ SCENARIO PASSED - Score: 85/100 - GOOD                 │
│  ✓ Achieved criticality safely                             │
│  ✓ Final power: 19.8% (target: 18-22%)                    │
│  ✓ No trips or violations                                  │
│  ⚠ Slightly slow initial response (42s to first action)   │
│  Actions: 12 rod movements, 0 trips, 0 violations         │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Adding New Scenarios

**Quick Example**: Create a "Load Following" scenario

1. **Create scenario file** (`lib/training/scenarios/load-follow.ts`):

```typescript
import type { TrainingScenario } from '../types';
import { TrainingRole } from '../types';

export const loadFollowingScenario: TrainingScenario = {
  id: 'PWR_LOAD_FOLLOW_01',
  name: 'Load Following - Power Maneuver',
  description: 'Increase power from 50% to 80% over 10 minutes',
  difficulty: 2,
  estimatedDuration: 15,
  recommendedRole: TrainingRole.RO,

  initialState: {
    reactorState: {
      t: 0,
      P: 0.5,  // Start at 50% power
      Tf: 950,
      Tc: 575,
      C: [0.0006, 0.0005, 0.0004, 0.0003, 0.0002, 0.0001],
    },
    controls: { rod: 0.55, pumpOn: true, scram: false },
    timeAcceleration: 2,
  },

  objectives: [
    {
      id: 'OBJ1',
      description: 'Reach 80% power within 10 minutes',
      assessmentCriteria: [
        { metric: 'finalPower', target: '75-85', unit: '%', weight: 0.6 },
        { metric: 'timeToTarget', target: '<600', unit: 'seconds', weight: 0.4 },
      ],
    },
  ],

  completionConditions: {
    type: 'state_reached',
    parameters: { powerMin: 0.75, powerMax: 0.85, stableDuration: 30 },
  },

  failureConditions: [
    {
      type: 'trip',
      parameters: {},
      description: 'Automatic trip during power maneuver',
    },
  ],

  briefing: `Perform a controlled power increase from 50% to 80%...`,
  proceduralGuidance: [/* steps */],
  hints: [/* contextual hints */],
};
```

2. **Register it** (in `lib/training/index.ts`):

```typescript
import { loadFollowingScenario } from './scenarios/load-follow';

export const SCENARIOS: TrainingScenario[] = [
  normalStartupScenario,
  pumpTripScenario,
  loadFollowingScenario,  // ← Add here
];
```

3. **Test it**:
   - Go to http://localhost:3000/train
   - Your new scenario appears in the list
   - Select it and verify all objectives work

## 📊 Performance Metrics Explained

### Automatic Tracking

The system automatically tracks:

```typescript
{
  // Timing
  duration: 487,              // Total time in seconds
  timeToFirstAction: 12,      // Seconds until first control movement

  // Safety
  tripCount: 0,               // Number of automatic trips
  scramCount: 1,              // Manual SCRAMs
  safetyLimitViolations: [],  // Limit breaches

  // Control Quality
  rodMovements: [
    { timestamp: 12, action: 'withdraw', fromValue: 0.05, toValue: 0.15 },
    { timestamp: 45, action: 'withdraw', fromValue: 0.15, toValue: 0.25 },
    // ... more actions
  ],

  // Final State
  finalPower: 0.198,          // 19.8%
  finalFuelTemp: 875,
  finalCoolantTemp: 565,

  // Assessment
  objectivesCompleted: ['OBJ1_CRITICALITY', 'OBJ2_POWER_LEVEL', 'OBJ3_NO_TRIPS'],
  success: true,
  score: 85,
  feedback: [
    '✓ Scenario completed successfully',
    '✓ Achieved criticality using gradual rod withdrawal',
    '✓ Reached 20% power without exceeding thermal limits',
    '⚠ Slightly slow initial response time',
  ],
}
```

### Scoring Formula

```
Base Score = Σ(criterion_score × weight) for all criteria

Final Score = Base Score
              - (20 × tripCount)
              - (15 × violationCount)
              - (5 × skippedSteps)

Clamped to [0, 100]
```

### Grade Interpretation

- **90-100** (EXCELLENT): Ready for independent operation
- **75-89** (GOOD): Competent with minor improvements needed
- **60-74** (SATISFACTORY): Meets minimum standards
- **0-59** (NEEDS IMPROVEMENT): Additional training required

## 🎮 Try It Now

### Quick Test - Free Play Mode
1. Go to http://localhost:3000
2. Click "START"
3. Slowly drag the rod slider to the right (withdraw rods)
4. Watch power increase as reactor goes critical
5. Observe how temperature feedback affects reactivity

### Quick Test - Training Mode
1. Go to http://localhost:3000/train
2. Click "Normal Startup from Cold Shutdown"
3. Read the briefing
4. Click "BEGIN SCENARIO"
5. Follow Step 1: "Begin rod withdrawal slowly - increase to 15%"
6. Drag rod slider from 5% to 15%
7. Continue following steps to reach 20% power
8. Click "STOP" and review your performance

## 🔬 Technical Details

### Physics Model
- Point kinetics with 6 delayed neutron groups
- Doppler fuel temperature feedback (prompt, negative)
- Moderator coolant temperature feedback (delayed, negative)
- Control rod worth modeling
- SCRAM insertion dynamics

### Training Architecture
- **Modular scenarios**: JSON-like configuration format
- **Pluggable assessment**: Custom criteria per objective
- **Real-time metrics**: Non-intrusive performance tracking
- **Role-based UI**: Dynamic control enabling/disabling

### Next Steps

See `lib/training/README.md` for:
- Complete API documentation
- Advanced scenario creation
- Instructor tools
- LMS integration guidance
- Regulatory positioning

---

**You now have a fully functional nuclear operator training platform!** 🎓⚛️

Navigate to http://localhost:3000/train to try it out.
