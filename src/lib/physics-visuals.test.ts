import {describe,expect,it} from "vitest";
import {pendulumAt,projectileAt,refractionAngle} from "./physics-visuals";

describe("physical geometry used by classroom illustrations",()=>{
 it("keeps horizontal velocity at the projectile apex and gravity downward",()=>{
  const apex=projectileAt(1);
  expect(apex.vy).toBe(0);expect(apex.vx).toBe(10);expect(apex.ay).toBe(-10);expect(apex.ax).toBe(0);
  expect(projectileAt(0).y).toBe(0);expect(projectileAt(2).y).toBe(0);
  for(const t of [0.2,0.5,1,1.5])expect(projectileAt(t).y).toBeCloseTo(projectileAt(2-t).y);
 });
 it("keeps the pendulum string length and gravitational energy height consistent",()=>{
  for(const angle of [0,Math.PI/6,Math.PI/4,Math.PI/3]){
   const p=pendulumAt(angle,68);
   expect(Math.hypot(p.x,p.y)).toBeCloseTo(68);
   expect(p.height).toBeCloseTo(68-p.y);
   expect(p.height).toBeGreaterThanOrEqual(0);
  }
  expect(pendulumAt(0).height).toBe(0);
 });
 it("draws air-to-glass rays satisfying Snell's law and bending toward the normal",()=>{
  const incident=Math.PI/4,refracted=refractionAngle(incident,1,1.5)!;
  expect(Math.sin(incident)).toBeCloseTo(1.5*Math.sin(refracted),12);
  expect(refracted*180/Math.PI).toBeCloseTo(28.1255,3);
  expect(refracted).toBeLessThan(incident);
  expect(refractionAngle(0)).toBe(0);
 });
 it("does not invent a transmitted ray under total internal reflection",()=>{
  expect(refractionAngle(Math.PI/3,1.5,1)).toBeNull();
 });
});

