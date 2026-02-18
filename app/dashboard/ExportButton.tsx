"use client";

import React, { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

export default function ExportButton({
  selectedDataset,
  allData,
  dashboardData,
  onMessage,
}: {
  selectedDataset: string;
  allData: any[];
  dashboardData?: any;
  onMessage?: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const toast = (m: string) => onMessage?.(m);

  // ========== PROFESSIONAL PDF WITH REAL CHARTS ==========
  const exportProfessionalPDF = async () => {
    setBusy(true);
    try {
      toast("📊 Starting PDF generation...");
      
      // 🐛 DEBUG: Check what charts we have
      console.log("📊 Dashboard Data:", dashboardData);
      console.log("📊 Charts:", dashboardData?.charts);
      console.log("📊 Number of charts:", dashboardData?.charts?.length || 0);

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let currentPage = 1;

      // Helper: Add header
      const addHeader = (title: string) => {
        pdf.setFillColor(79, 70, 229);
        pdf.rect(0, 0, pageWidth, 15, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("R&K ANALYTICS", 20, 10);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.text(title, pageWidth - 20, 10, { align: "right" });
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.5);
        pdf.line(20, 18, pageWidth - 20, 18);
      };

      // Helper: Add footer
      const addFooter = (pageNum: number) => {
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.5);
        pdf.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "italic");
        pdf.text("Confidential - For Internal Use Only", pageWidth / 2, pageHeight - 10, { align: "center" });
        pdf.text(`Page ${pageNum}`, pageWidth - 20, pageHeight - 10, { align: "right" });
        pdf.text(new Date().toLocaleDateString(), 20, pageHeight - 10);
      };

      let currentY = 20;
      const now = new Date();

      // ========== PAGE 1: COVER ==========
      pdf.setFillColor(79, 70, 229);
      pdf.rect(0, 0, pageWidth, 50, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(32);
      pdf.setFont("helvetica", "bold");
      pdf.text("R&K ANALYTICS", pageWidth / 2, 25, { align: "center" });
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "normal");
      pdf.text("Professional Data Intelligence Report", pageWidth / 2, 38, { align: "center" });

      currentY = 80;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(28);
      pdf.setFont("helvetica", "bold");
      pdf.text("Analytics Report", pageWidth / 2, currentY, { align: "center" });

      currentY += 20;
      pdf.setFontSize(20);
      pdf.setTextColor(79, 70, 229);
      pdf.text(selectedDataset, pageWidth / 2, currentY, { align: "center" });

      currentY += 15;
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, pageWidth / 2, currentY, { align: "center" });

      // Executive Summary
      currentY += 25;
      pdf.setFillColor(240, 245, 255);
      pdf.roundedRect(20, currentY, pageWidth - 40, 80, 5, 5, "F");
      currentY += 12;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("📋 Executive Summary", 30, currentY);

      currentY += 12;
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      const summaryText = dashboardData?.executive?.takeaway || dashboardData?.summary || "Comprehensive analysis with actionable insights";
      const wrappedSummary = pdf.splitTextToSize(summaryText, pageWidth - 60);
      pdf.text(wrappedSummary, 30, currentY);

      // Confidence
      currentY += 45;
      const confidence = dashboardData?.executive?.confidence || "Medium";
      const confidenceColors: Record<string, [number, number, number]> = {
        High: [16, 185, 129],
        Medium: [245, 158, 11],
        Low: [239, 68, 68],
      };
      const confColor = confidenceColors[confidence];
      pdf.setFillColor(...confColor);
      pdf.roundedRect(pageWidth / 2 - 35, currentY, 70, 12, 3, 3, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Confidence: ${confidence}`, pageWidth / 2, currentY + 8, { align: "center" });

      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "italic");
      pdf.text("Confidential - For Internal Use Only", pageWidth / 2, pageHeight - 10, { align: "center" });
      pdf.text("Page 1", pageWidth - 20, pageHeight - 10, { align: "right" });

      // ========== PAGE 2: KPIs ==========
      pdf.addPage();
      currentPage++;
      addHeader("Key Performance Indicators");
      currentY = 30;

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("📊 Key Performance Indicators", 20, currentY);
      currentY += 15;

      const kpis = dashboardData?.kpis || [];
      console.log("📊 KPIs:", kpis);
      
      const cardWidth = (pageWidth - 50) / 2;
      const cardHeight = 40;
      let cardX = 20;
      let cardY = currentY;

      kpis.slice(0, 4).forEach((kpi: any, index: number) => {
        pdf.setFillColor(250, 250, 250);
        pdf.roundedRect(cardX, cardY, cardWidth - 5, cardHeight, 5, 5, "F");
        pdf.setDrawColor(79, 70, 229);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(cardX, cardY, cardWidth - 5, cardHeight, 5, 5, "S");

        pdf.setFontSize(22);
        pdf.text(kpi.icon, cardX + 8, cardY + 15);

        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.setFont("helvetica", "bold");
        pdf.text(kpi.title.toUpperCase(), cardX + 8, cardY + 25);

        pdf.setFontSize(20);
        pdf.setTextColor(79, 70, 229);
        pdf.setFont("helvetica", "bold");
        const valueStr = String(kpi.value);
        pdf.text(valueStr.substring(0, 20), cardX + 8, cardY + 36);

        if ((index + 1) % 2 === 0) {
          cardX = 20;
          cardY += cardHeight + 8;
        } else {
          cardX += cardWidth + 5;
        }
      });

      currentY = cardY + 10;

      // Risk & Action
      pdf.setFillColor(254, 243, 199);
      pdf.roundedRect(20, currentY, (pageWidth - 45) / 2, 45, 5, 5, "F");
      pdf.setTextColor(120, 53, 15);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("⚠️  Risk Analysis", 25, currentY + 10);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      const riskText = dashboardData?.executive?.risk || "No significant risks detected";
      const wrappedRisk = pdf.splitTextToSize(riskText, (pageWidth - 55) / 2);
      pdf.text(wrappedRisk, 25, currentY + 20);

      pdf.setFillColor(220, 252, 231);
      pdf.roundedRect((pageWidth / 2) + 2.5, currentY, (pageWidth - 45) / 2, 45, 5, 5, "F");
      pdf.setTextColor(6, 95, 70);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("✅  Recommended Actions", (pageWidth / 2) + 7.5, currentY + 10);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      const actionText = dashboardData?.executive?.action || "Continue monitoring key metrics";
      const wrappedAction = pdf.splitTextToSize(actionText, (pageWidth - 55) / 2);
      pdf.text(wrappedAction, (pageWidth / 2) + 7.5, currentY + 20);

      addFooter(currentPage);

      // ========== PAGES 3+: CHARTS WITH IMAGES ==========
      const charts = dashboardData?.charts || [];
      
      console.log("📊 ATTEMPTING TO CAPTURE CHARTS...");
      console.log("📊 Total charts to capture:", charts.length);
      
      toast(`📸 Attempting to capture ${charts.length} chart(s)...`);

      // 🐛 DEBUG: Check what chart containers exist
      const allContainers = document.querySelectorAll('.recharts-responsive-container');
      console.log("📊 Found Recharts containers:", allContainers.length);
      
      // Try alternative selectors
      const altContainers = document.querySelectorAll('[class*="recharts"]');
      console.log("📊 Found elements with 'recharts' in class:", altContainers.length);

      for (let i = 0; i < charts.length; i++) {
        const chart = charts[i];
        console.log(`📊 Processing chart ${i + 1}/${charts.length}:`, chart.title);

        // 🔧 IMPROVED: Try multiple methods to find charts
        let chartImage: string | null = null;
        try {
          // Method 1: Try Recharts container
          if (allContainers[i]) {
            console.log(`  ✓ Found container using .recharts-responsive-container`);
            const canvas = await html2canvas(allContainers[i] as HTMLElement, {
              backgroundColor: "#ffffff",
              scale: 2,
              logging: false,
            });
            chartImage = canvas.toDataURL("image/png");
            console.log(`  ✓ Chart ${i + 1} captured successfully!`);
          } else {
            console.log(`  ✗ No container found at index ${i}`);
          }
        } catch (e) {
          console.error(`  ✗ Chart ${i + 1} capture failed:`, e);
        }

        pdf.addPage();
        currentPage++;
        addHeader(`Visualization ${i + 1} of ${charts.length}`);
        currentY = 30;

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text(chart.title, 20, currentY);

        currentY += 10;
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.setFont("helvetica", "normal");
        pdf.text(chart.subtitle, 20, currentY);

        currentY += 15;

        // Add chart image if captured
        if (chartImage) {
          console.log(`  ✓ Adding chart ${i + 1} image to PDF`);
          try {
            pdf.addImage(chartImage, "PNG", 20, currentY, pageWidth - 40, 100);
            currentY += 105;
          } catch (e) {
            console.error(`  ✗ Failed to add chart ${i + 1} image to PDF:`, e);
          }
        } else {
          console.log(`  ⚠️ No image for chart ${i + 1}, using fallback bars`);
        }

        // Fallback: Bar visualization
        if (!chartImage || currentY < 150) {
          if (!chartImage) currentY = 55;
          
          const topData = chart.data.slice(0, 6);
          const maxValue = Math.max(...chart.data.map((d: any) => d.value));

          topData.forEach((item: any, idx: number) => {
            const colors = [[79, 70, 229], [6, 182, 212], [245, 158, 11], [239, 68, 68], [16, 185, 129], [139, 92, 246]];
            const color = colors[idx] || [150, 150, 150];

            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont("helvetica", "normal");
            pdf.text(item.name.substring(0, 25), 25, currentY + 6);

            const barWidth = ((item.value / maxValue) * (pageWidth - 120));
            pdf.setFillColor(...color);
            pdf.roundedRect(90, currentY, barWidth, 10, 2, 2, "F");

            pdf.setTextColor(...color);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            pdf.text(String(item.value), 95 + barWidth, currentY + 7);

            const percentage = ((item.value / chart.data.reduce((a: number, b: any) => a + b.value, 0)) * 100).toFixed(1);
            pdf.setFontSize(9);
            pdf.text(`${percentage}%`, pageWidth - 25, currentY + 7, { align: "right" });

            currentY += 15;
          });
        }

        currentY += 10;

        // Insight Box
        pdf.setFillColor(240, 245, 255);
        pdf.roundedRect(20, currentY, pageWidth - 40, 40, 5, 5, "F");
        pdf.setTextColor(79, 70, 229);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("💡 Key Insight", 25, currentY + 10);

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const insightText = chart.detailedInsight || chart.insight;
        const wrappedInsight = pdf.splitTextToSize(insightText, pageWidth - 50);
        pdf.text(wrappedInsight, 25, currentY + 20);

        addFooter(currentPage);
      }

      // ========== FINAL PAGE: DATA ==========
      pdf.addPage();
      currentPage++;
      addHeader("Data Summary");
      currentY = 30;

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("📋 Data Summary", 20, currentY);
      currentY += 15;

      const filteredRows = allData.filter((r) => r.dataset_name === selectedDataset);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Total Records: ${filteredRows.length}`, 20, currentY);
      currentY += 12;

      if (filteredRows.length > 0) {
        const columns = filteredRows[0].column_names || [];
        const visibleColumns = columns.slice(0, 4);

        pdf.setFillColor(79, 70, 229);
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");

        const colWidth = (pageWidth - 40) / visibleColumns.length;
        visibleColumns.forEach((col: string, i: number) => {
          pdf.rect(20 + i * colWidth, currentY, colWidth, 10, "F");
          pdf.text(String(col).substring(0, 15), 22 + i * colWidth, currentY + 7);
        });

        currentY += 10;

        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);

        filteredRows.slice(0, 25).forEach((row: any, rowIndex: number) => {
          const rowData = row.row_data || {};

          if (rowIndex % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(20, currentY, pageWidth - 40, 8, "F");
          }

          visibleColumns.forEach((col: string, i: number) => {
            const value = String(rowData[col] || "-").substring(0, 15);
            pdf.text(value, 22 + i * colWidth, currentY + 6);
          });

          currentY += 8;
          if (currentY > pageHeight - 30) return;
        });
      }

      addFooter(currentPage);

      console.log("📊 PDF generation complete!");
      pdf.save(`${selectedDataset}_Complete_Report_${now.toISOString().split("T")[0]}.pdf`);
      toast("✅ PDF generated! Check browser console for debug info.");
      setBusy(false);
      setOpen(false);
    } catch (e) {
      console.error("PDF generation error:", e);
      toast("❌ PDF export failed - check console");
      setBusy(false);
    }
  };

  // ========== CSV EXPORT ==========
  const exportCSV = () => {
    try {
      const rows = allData.filter((r) => r.dataset_name === selectedDataset);
      if (!rows.length) {
        toast("No rows to export.");
        return;
      }

      const cols = Array.from(new Set(rows.flatMap((r) => (r.column_names || []).map((c: any) => String(c)))));
      const escape = (v: any) => {
        const s = String(v ?? "");
        if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };

      const header = cols.map(escape).join(",");
      const body = rows
        .map((r) => {
          const rd = r.row_data || {};
          return cols.map((c) => escape(rd[c])).join(",");
        })
        .join("\n");

      const csv = `${header}\n${body}`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedDataset || "dataset"}-export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("CSV exported ✅");
    } catch (e) {
      console.error(e);
      toast("CSV export failed ❌");
    }
  };

  // ========== EXCEL EXPORT ==========
  const exportExcel = () => {
    try {
      const rows = allData.filter((r) => r.dataset_name === selectedDataset);
      if (!rows.length) {
        toast("No rows to export.");
        return;
      }

      const cols = Array.from(new Set(rows.flatMap((r) => (r.column_names || []).map((c: any) => String(c)))));
      const excelData = rows.map((r) => {
        const rd = r.row_data || {};
        const rowObj: any = {};
        cols.forEach((col) => {
          rowObj[col] = rd[col] ?? "";
        });
        return rowObj;
      });

      const ws = XLSX.utils.json_to_sheet(excelData);
      const colWidths = cols.map((col) => {
        const maxLength = Math.max(col.length, ...excelData.map((row) => String(row[col] || "").length));
        return { wch: Math.min(maxLength + 2, 50) };
      });
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, selectedDataset.slice(0, 31) || "Data");
      wb.Props = {
        Title: `${selectedDataset} Export`,
        Subject: "Dashboard Data Export",
        Author: "R&K AI Dashboard",
        CreatedDate: new Date(),
      };

      XLSX.writeFile(wb, `${selectedDataset || "dataset"}-export.xlsx`);
      toast("Excel exported ✅");
    } catch (e) {
      console.error(e);
      toast("Excel export failed ❌");
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          fontWeight: 900,
          fontSize: 13,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
          color: "#E5E7EB",
          cursor: "pointer",
        }}
      >
        {busy ? "Exporting…" : "Export ▾"}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: 240,
            padding: 10,
            borderRadius: 14,
            background: "rgba(255,255,255,0.96)",
            border: "1px solid rgba(11,18,32,0.12)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
            zIndex: 9999,
          }}
        >
          <button
            onClick={exportProfessionalPDF}
            disabled={busy}
            style={{
              ...menuBtn,
              background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
              color: "#fff",
              marginBottom: 8,
            }}
          >
            📊 Professional PDF Report
          </button>
          <button onClick={exportExcel} disabled={busy} style={menuBtn}>
            📊 Export Excel
          </button>
          <button onClick={exportCSV} disabled={busy} style={menuBtn}>
            📦 Export CSV
          </button>
        </div>
      )}
    </div>
  );
}

const menuBtn: React.CSSProperties = {
  width: "100%",
  padding: "10px 10px",
  borderRadius: 12,
  border: "1px solid rgba(11,18,32,0.10)",
  background: "transparent",
  cursor: "pointer",
  fontWeight: 900,
  color: "#0B1220",
  textAlign: "left",
  marginBottom: 4,
};