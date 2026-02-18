"use client";

import React from "react";
import {
  ResponsiveContainer,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  FunnelChart,
  Funnel,
  LabelList,
  Treemap,
} from "recharts";

const COLORS = [
  "#4F46E5", "#06B6D4", "#F59E0B", "#EF4444", 
  "#10B981", "#8B5CF6", "#F97316", "#14B8A6"
];

// 🆕 GAUGE CHART
export function GaugeChart({ 
  value, 
  max = 100, 
  title = "Progress",
  color = "#4F46E5" 
}: { 
  value: number; 
  max?: number; 
  title?: string;
  color?: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  const angle = (percentage / 100) * 180 - 90;

  return (
    <div style={styles.gaugeContainer}>
      <svg width="100%" height="200" viewBox="0 0 200 120">
        {/* Background Arc */}
        <path
          d="M 30 100 A 70 70 0 0 1 170 100"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="20"
          strokeLinecap="round"
        />
        
        {/* Progress Arc */}
        <path
          d="M 30 100 A 70 70 0 0 1 170 100"
          fill="none"
          stroke={color}
          strokeWidth="20"
          strokeLinecap="round"
          strokeDasharray={`${(percentage / 100) * 220} 220`}
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
        
        {/* Needle */}
        <line
          x1="100"
          y1="100"
          x2="100"
          y2="40"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${angle} 100 100)`}
          style={{ transition: "transform 0.5s ease" }}
        />
        
        {/* Center Circle */}
        <circle cx="100" cy="100" r="8" fill="#fff" />
        
        {/* Value Text */}
        <text
          x="100"
          y="90"
          textAnchor="middle"
          fill="#fff"
          fontSize="24"
          fontWeight="900"
        >
          {value.toFixed(1)}
        </text>
        
        {/* Max Text */}
        <text
          x="100"
          y="110"
          textAnchor="middle"
          fill="rgba(255,255,255,0.6)"
          fontSize="12"
          fontWeight="700"
        >
          / {max}
        </text>
      </svg>
      
      <div style={styles.gaugeTitle}>{title}</div>
      <div style={styles.gaugePercentage}>{percentage.toFixed(1)}%</div>
    </div>
  );
}

// 🆕 HEATMAP CHART
export function HeatmapChart({ 
  data 
}: { 
  data: Array<{ name: string; value: number }> 
}) {
  const max = Math.max(...data.map(d => d.value));
  const gridSize = Math.ceil(Math.sqrt(data.length));

  return (
    <div style={styles.heatmapContainer}>
      <div 
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gap: 4,
          width: "100%",
        }}
      >
        {data.slice(0, gridSize * gridSize).map((item, idx) => {
          const intensity = item.value / max;
          const colorIndex = Math.floor(intensity * (COLORS.length - 1));
          
          return (
            <div
              key={idx}
              style={{
                aspectRatio: "1",
                background: COLORS[colorIndex],
                opacity: 0.3 + (intensity * 0.7),
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 8,
                transition: "all 0.3s ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.opacity = String(0.3 + (intensity * 0.7));
              }}
            >
              <div style={styles.heatmapValue}>{item.value}</div>
              <div style={styles.heatmapLabel}>
                {item.name.length > 8 ? item.name.slice(0, 8) + "..." : item.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 🆕 FUNNEL CHART
export function FunnelChartComponent({ 
  data 
}: { 
  data: Array<{ name: string; value: number }> 
}) {
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <FunnelChart>
        <Tooltip 
          contentStyle={{
            background: "rgba(255,255,255,0.95)",
            border: "1px solid rgba(11,18,32,0.12)",
            borderRadius: 12,
            color: "#0B1220",
            fontWeight: 900,
          }}
        />
        <Funnel
          dataKey="value"
          data={sortedData}
          isAnimationActive
        >
          <LabelList 
            position="inside" 
            fill="#fff" 
            stroke="none" 
            dataKey="name"
            style={{ fontSize: 14, fontWeight: 900 }}
          />
          {sortedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}

// 🆕 RADAR CHART
export function RadarChartComponent({ 
  data 
}: { 
  data: Array<{ name: string; value: number }> 
}) {
  const limitedData = data.slice(0, 6);
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={limitedData}>
        <PolarGrid stroke="rgba(255,255,255,0.2)" />
        <PolarAngleAxis 
          dataKey="name" 
          tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 700 }}
        />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 'auto']}
          tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
        />
        <Radar
          name="Values"
          dataKey="value"
          stroke="#4F46E5"
          fill="#4F46E5"
          fillOpacity={0.6}
          strokeWidth={3}
        />
        <Tooltip 
          contentStyle={{
            background: "rgba(255,255,255,0.95)",
            border: "1px solid rgba(11,18,32,0.12)",
            borderRadius: 12,
            color: "#0B1220",
            fontWeight: 900,
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// 🆕 TREEMAP CHART
export function TreemapChart({ 
  data 
}: { 
  data: Array<{ name: string; value: number }> 
}) {
  const CustomizedContent = (props: any) => {
    const { x, y, width, height, index, name, value } = props;
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: COLORS[index % COLORS.length],
            stroke: "rgba(11,18,32,0.5)",
            strokeWidth: 2,
          }}
        />
        {width > 60 && height > 40 && (
          <>
            <text
              x={x + width / 2}
              y={y + height / 2 - 8}
              textAnchor="middle"
              fill="#fff"
              fontSize={14}
              fontWeight={900}
            >
              {name.length > 12 ? name.slice(0, 12) + "..." : name}
            </text>
            <text
              x={x + width / 2}
              y={y + height / 2 + 12}
              textAnchor="middle"
              fill="#fff"
              fontSize={16}
              fontWeight={900}
            >
              {value}
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <Treemap
        data={data}
        dataKey="value"
        aspectRatio={4 / 3}
        stroke="#0B1220"
        fill="#4F46E5"
        content={<CustomizedContent />}
      />
    </ResponsiveContainer>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  gaugeContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: 20,
  },
  gaugeTitle: {
    fontSize: 14,
    fontWeight: 900,
    color: "rgba(255,255,255,0.8)",
    marginTop: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  gaugePercentage: {
    fontSize: 12,
    fontWeight: 800,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },
  heatmapContainer: {
    width: "100%",
    padding: 20,
  },
  heatmapValue: {
    fontSize: 16,
    fontWeight: 900,
    color: "#fff",
    marginBottom: 4,
  },
  heatmapLabel: {
    fontSize: 10,
    fontWeight: 800,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
  },
};