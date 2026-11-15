"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

export function TrendChart({ data }: { data: { name: string; pct: number }[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Examination percentage over time">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#C9DAF0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v: number) => `${v}%`} />
          <Line type="monotone" dataKey="pct" name="Percentage" stroke="#3B6DB3" strokeWidth={2.5} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SkillChart({ data }: { data: { category: string; latest: number; previous: number | null }[] }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Skill percentages, latest versus previous exam">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#C9DAF0" />
          <XAxis dataKey="category" tick={{ fontSize: 12 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v: number) => `${v}%`} /><Legend />
          <Bar dataKey="previous" name="Previous" fill="#9DB9DD" radius={[4, 4, 0, 0]} />
          <Bar dataKey="latest" name="Latest" fill="#3B6DB3" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AvgBar({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Average percentage by group">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#C9DAF0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v: number) => `${v}%`} />
          <Bar dataKey="value" name="Average %" fill="#3B6DB3" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
