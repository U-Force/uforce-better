Nuclear Reactor Digital Twin Simulator

An interactive, physics-based nuclear reactor simulator designed to model reactor dynamics, operator decision-making, and safety feedback systems in real time.

⸻

Overview

The U.S. nuclear workforce is aging, while demand for reliable, carbon-free energy is increasing. Training new operators is expensive, slow, and often fragmented across classroom theory and on-site experience.

This project builds a digital twin-style reactor simulator that combines reactor physics modeling with an interactive interface to help users develop intuition about:
	•	Reactivity and feedback mechanisms
	•	Thermal-hydraulic behavior
	•	Control rod dynamics
	•	Pump and coolant system performance
	•	Stability and runaway scenarios

The goal is not just to simulate equations, but to create an educational systems-level tool for understanding how complex energy infrastructure behaves under real-world constraints.

⸻

Key Features
	•	Real-time point kinetics modeling of neutron population
	•	Temperature-dependent Doppler feedback
	•	Moderator density feedback modeling
	•	Control rod insertion dynamics
	•	Coolant pump flow simulation
	•	Scenario-based failure modes (e.g., pump degradation, rapid rod withdrawal)
	•	Visual dashboard displaying:
	•	Core temperature
	•	Reactivity
	•	Power output
	•	Feedback coefficients

⸻

Technical Overview

The reactor core dynamics are modeled using point kinetics equations with temperature-dependent reactivity feedback:

ρ_total = ρ_control + ρ_Doppler + ρ_moderator

Neutron population evolves according to:

dN/dt = ((ρ - β)/Λ)N + Σ λ_i C_i

State variables are updated using a 4th-order Runge–Kutta integrator to ensure numerical stability under rapidly changing conditions.

Thermal behavior is approximated using lumped-parameter heat transfer models:

dT/dt = (Power - Heat Removal) / (m c_p)

The simulator emphasizes feedback coupling, showing how small reactivity changes propagate through temperature, density, and neutron population.

⸻

Why This Matters

Most educational reactor models isolate individual equations. Real systems do not behave in isolation.

This simulator emphasizes:
	•	Coupled nonlinear dynamics
	•	Stability vs. instability regimes
	•	Sensitivity to control actions
	•	Systems-level thinking

Understanding these dynamics is critical for:
	•	Operator training
	•	Policy discussions
	•	Advanced reactor design
	•	AI-assisted grid optimization

⸻

Installation

Clone the repository:

git clone https://github.com/yourusername/nuclear-digital-twin.git
cd nuclear-digital-twin

Install dependencies:

pip install -r requirements.txt

Run the simulator:

python main.py

⸻

Usage
	1.	Adjust control rod position using the interface slider
	2.	Monitor reactivity and core temperature
	3.	Modify coolant pump flow rate
	4.	Trigger predefined training scenarios
	5.	Observe system stability or divergence

The dashboard updates in real time.

⸻

Example Scenarios
	•	Gradual rod insertion (controlled power ramp-down)
	•	Sudden rod withdrawal (prompt critical excursion)
	•	Pump degradation (insufficient cooling instability)
	•	Negative temperature coefficient stabilization

⸻

Roadmap
	•	Full thermal-hydraulic coupling model
	•	Multi-zone core modeling
	•	Operator scoring + performance analytics
	•	AI agent that suggests corrective actions
	•	Cloud-deployable web version
	•	Integration with real-world reactor parameter datasets

⸻

Tech Stack
	•	Python
	•	NumPy
	•	SciPy
	•	Matplotlib / Plotly
	•	(Optional) React frontend

⸻

Educational Focus

This project is designed to bridge:
	•	Reactor physics theory
	•	Numerical simulation
	•	Real-time systems engineering
	•	Human decision-making under uncertainty

It aims to make nuclear systems more transparent, interactive, and accessible.

⸻

Future Vision

Long-term, this project could evolve into:
	•	A workforce training platform
	•	An AI-assisted operator simulator
	•	A grid-integrated reactor modeling system
	•	An educational tool for energy systems programs
