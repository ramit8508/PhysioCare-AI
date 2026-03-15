"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type DataPoint = {
  date: string;
  accuracy: number;
  maxAngle: number;
};

type Props = {
  data: DataPoint[];
};

export default function ProgressChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">No sessions in the last 7 days.</p>;
  }

  return (
    <div className="mt-4 h-[320px] w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" domain={[0, 100]} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 180]} />
          <Tooltip />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="accuracy"
            stroke="#38bdf8"
            strokeWidth={2}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="maxAngle"
            stroke="#10b981"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
