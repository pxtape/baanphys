# Stage 3 — Physics identities for Explorer Studio

Eight Pre-POSN chapter identities now have distinct restrained accent colors, scientific diagrams and short optional thought questions. The hints explain assumptions and link to an OpenStax primary textbook section. Native details/summary controls work by keyboard and do not record scores, unlock lessons or affect course progress. Chapters of other courses do not inherit Pre-POSN diagrams before their syllabus is defined.

## Scientific review

| Levels | Representation and review conditions |
| --- | --- |
| 1–3 | Position/time slope, constant-acceleration velocity/time slope, signed displacement as the area below a positive constant-velocity graph. |
| 4–5 | Free-body diagrams of a block on a horizontal surface. Equal opposite vertical forces; balanced horizontal forces in Newton I. In Newton II the horizontal surface is taken to be frictionless. Acceleration is a separate vector, not a force. |
| 6 | Computed parabolic trajectory in uniform gravity without air resistance. At the apex vy = 0, vx remains positive and g still points down. The schematic model uses g = 10 with matching initial vertical speed 10; axis labels show no numerical scale. |
| 7–8 | Velocity tangent to a circle, centripetal acceleration inward. Relative velocities are collinear in the same direction and subtraction gives the relative velocity. |
| 9 | Mutual gravitational forces have equal magnitudes and opposite directions, despite different object sizes. |
| 10–11 | Pendulum positions share one fixed string length. A is released from rest; U = 0 at lowest point B. Normalized bars show U at A and K at B with equal total energy, no dissipative work. Work diagram has parallel horizontal force and displacement. |
| 12–13 | Momentum illustrations state the zero external resultant condition for total momentum conservation. Balls represent pre-collision states; no outcome or kinetic-energy conservation is implied. |
| 14–16 | Tangential force perpendicular to radius, fixed-axis rotation with constant inertia. Spring restoring force opposite positive displacement from equilibrium. |
| 17–20 | Hydrostatic pressure increases with depth in a uniform stationary liquid. Steady incompressible flow through a rectangular channel of uniform depth: widths 76:32 and velocity-arrow lengths 32:76 conserve A v. Heat flows spontaneously hot to cold; phase-change plateau is at fixed pressure for a pure substance. |
| 21–23 | Radial E points away from a positive source and toward a negative source; circular equipotentials around a positive point source are perpendicular to E. Potential zero is at infinity. |
| 24–27 | Closed ideal battery/resistor DC circuits. Conventional current leaves the positive terminal through external resistors and returns to the negative terminal. Series resistors lie on the sole path without a bypass wire; parallel resistors join the same two nodes, neither node is between battery plates. |
| 28–29 | Reflection angles are equal about the normal. Air/glass refraction uses n1 = 1, n2 = 1.5, incidence 45 degrees and transmitted angle 28.1255 degrees, computed with Snell's law. |
| 30 | Ideal-gas particles in a rigid closed container. Fixed n and V imply p/T constant using absolute temperature in kelvin. |
| 31 | Closed magnetic field loops point N to S externally and S to N internally. Diagrams show directions, not quantitative field strength or spacing. |

All diagrams are code-native SVGs with explicit geometry. Decorative laboratory/observatory images remain separate from the scientific illustrations. Vector magnitudes across different physical quantities are not comparable; diagrams are schematic except for the stated calculated geometry.

## Validation

- 86 tests across 20 files pass, including projectile apex/gravity, fixed pendulum length, Snell's law, total internal reflection and existing access/checklist behavior.
- TypeScript and the production static export pass. GitHub Pages verification checks local links, required assets and accidental server-secret exposure.
- Desktop and 390px mobile review covers energy, electric fields/circuits, optics, magnetic loops, expanding hints and absence of horizontal overflow.

## Primary textbook references

- [Velocity and speed](https://openstax.org/books/university-physics-volume-1/pages/3-2-instantaneous-velocity-and-speed)
- [Projectile motion](https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion)
- [Conservation of energy](https://openstax.org/books/university-physics-volume-1/pages/8-3-conservation-of-energy)
- [Fluid pressure](https://openstax.org/books/university-physics-volume-1/pages/14-1-fluids-density-and-pressure)
- [Electric field lines](https://openstax.org/books/university-physics-volume-2/pages/5-6-electric-field-lines)
- [Resistors in series and parallel](https://openstax.org/books/university-physics-volume-2/pages/10-2-resistors-in-series-and-parallel)
- [Refraction](https://openstax.org/books/university-physics-volume-3/pages/1-3-refraction)
- [Ideal gas model](https://openstax.org/books/university-physics-volume-2/pages/2-1-molecular-model-of-an-ideal-gas)
- [Magnetic field lines](https://openstax.org/books/university-physics-volume-2/pages/11-2-magnetic-fields-and-lines)

