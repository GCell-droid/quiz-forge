"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Jan", desktop: 400, mobile: 240 },
  { name: "Feb", desktop: 300, mobile: 139 },
  { name: "Mar", desktop: 200, mobile: 980 },
  { name: "Apr", desktop: 278, mobile: 390 },
  { name: "May", desktop: 189, mobile: 480 },
  { name: "Jun", desktop: 239, mobile: 380 },
];

export function TrafficChart() {
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Traffic Channels</CardTitle>
        <CardDescription>
          Monthly desktop and mobile traffic
        </CardDescription>
      </CardHeader>

      <CardContent className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <Tooltip />
            <Bar dataKey="desktop" />
            <Bar dataKey="mobile" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
