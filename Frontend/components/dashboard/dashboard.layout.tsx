"use client";

import { ControlsCard } from "./controls-card";

// import { StatsCard } from "./stats-card";
// import { TrafficChart } from "./traffic-chart";

export function DashboardLayout() {
  return (
    <div className="p-6 grid gap-6 md:grid-cols-3">
      {/* <StatsCard /> */}
      <ControlsCard />
      {/* <EnvCard /> */}

      {/* <StatsCard /> */}
      {/* <TrafficChart /> */}
    </div>
  );
}
