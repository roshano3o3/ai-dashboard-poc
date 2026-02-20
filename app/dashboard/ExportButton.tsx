// ExportButton_FINAL_FIXED.tsx
"use client";

import React, { useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

type ExportButtonProps = {
  selectedDataset: string;
  allData: any[];
  dashboardData?: any;
  onMessage: (msg: string) => void;
};

export default function ExportButton({
  selectedDataset,
  allData,
  dashboardData,
  onMessage,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const filteredData = allData.filter((r) => r.dataset_name === selectedDataset);
  const exportData = filteredData.map((r) => r.row_data);

  // FIXED: Smart data analyzer with proper aggregation
  const analyzePerformance = () => {
    if (!exportData || exportData.length === 0) return null;

    const analysis: any = {
      campaigns: [],
      topPerformer: null,
      bestROI: null,
      totalMetrics: {},
      insights: [],
    };

    // Find numeric and category columns
    const sampleRow = exportData[0];
    const numericColumns: string[] = [];
    const categoryColumns: string[] = [];

    Object.keys(sampleRow).forEach((col) => {
      const values = exportData.map((r) => r[col]).filter((v) => v != null);
      const isNumeric = values.every((v) => !isNaN(parseFloat(String(v))));
      
      if (isNumeric) {
        numericColumns.push(col);
      } else {
        categoryColumns.push(col);
      }
    });

    // FIXED: Choose best identifier column (region, product, campaign, etc.)
    const identifierPriority = [
      'region', 'product', 'category', 'campaign',
      'channel', 'source', 'type', 'name'
    ];

    let identifierCol = null;
    for (const priority of identifierPriority) {
      const found = categoryColumns.find((c) => 
        c.toLowerCase().includes(priority)
      );
      if (found) {
        identifierCol = found;
        break;
      }
    }
    if (!identifierCol) {
      identifierCol = categoryColumns[0];
    }

    // FIXED: Aggregate data by identifier (group rows together)
    const grouped: any = {};

    exportData.forEach((row) => {
      const identifier = row[identifierCol] || 'Unknown';
      
      if (!grouped[identifier]) {
        grouped[identifier] = {
          name: identifier,
          count: 0,
        };
        // Initialize all numeric columns to 0
        numericColumns.forEach((col) => {
          grouped[identifier][col] = 0;
        });
      }
      
      // Sum up all numeric values for this identifier
      grouped[identifier].count++;
      numericColumns.forEach((col) => {
        const value = parseFloat(String(row[col]));
        if (!isNaN(value)) {
          grouped[identifier][col] += value;
        }
      });
    });

    // Convert grouped object to array
    analysis.campaigns = Object.values(grouped);

    // FIXED: Choose best metric (prioritize revenue, sales, conversions)
    const metricPriority = [
      'revenue', 'sales', 'profit', 'income',
      'conversions', 'orders', 'transactions',
      'clicks', 'views', 'impressions',
    ];

    let mainMetric = null;
    for (const priority of metricPriority) {
      const found = numericColumns.find((c) => 
        c.toLowerCase().includes(priority)
      );
      if (found) {
        mainMetric = found;
        break;
      }
    }
    if (!mainMetric) {
      mainMetric = numericColumns[0];
    }

    // Calculate ROI if cost and conversion data available
    const convCol = numericColumns.find((c) => c.toLowerCase().includes('conversion'));
    const costCol = numericColumns.find((c) => c.toLowerCase().includes('cost'));

    if (convCol && costCol) {
      analysis.campaigns.forEach((campaign: any) => {
        if (campaign[convCol] && campaign[costCol]) {
          campaign.costPerConversion = campaign[costCol] / campaign[convCol];
        }
      });
    }

    // Sort by main metric and find top performer
    if (mainMetric) {
      analysis.campaigns.sort((a, b) => (b[mainMetric] || 0) - (a[mainMetric] || 0));
      analysis.topPerformer = analysis.campaigns[0];
      
      // Calculate totals
      analysis.totalMetrics = {
        total: analysis.campaigns.reduce((sum, c) => sum + (c[mainMetric] || 0), 0),
        average: analysis.campaigns.reduce((sum, c) => sum + (c[mainMetric] || 0), 0) / analysis.campaigns.length,
        metric: mainMetric,
      };
    }

    // Find best ROI
    if (analysis.campaigns[0]?.costPerConversion) {
      const sortedByROI = [...analysis.campaigns]
        .filter(c => c.costPerConversion)
        .sort((a, b) => a.costPerConversion - b.costPerConversion);
      if (sortedByROI.length > 0) {
        analysis.bestROI = sortedByROI[0];
      }
    }

    // Generate insights
    if (analysis.topPerformer && mainMetric) {
      const topValue = analysis.topPerformer[mainMetric];
      const topShare = ((topValue / analysis.totalMetrics.total) * 100).toFixed(1);
      
      analysis.insights.push({
        type: 'success',
        title: 'Top Performer Identified',
        text: `${analysis.topPerformer.name} leads with ${topValue.toFixed(0)} ${mainMetric}, representing ${topShare}% of total performance.`,
      });
    }

    if (analysis.bestROI && analysis.topPerformer && analysis.bestROI.name !== analysis.topPerformer.name) {
      analysis.insights.push({
        type: 'info',
        title: 'Best Cost Efficiency',
        text: `${analysis.bestROI.name} shows the best ROI at $${analysis.bestROI.costPerConversion.toFixed(2)} per conversion.`,
      });
    }

    if (exportData.length < 20) {
      analysis.insights.push({
        type: 'warning',
        title: 'Limited Data',
        text: `Dataset contains only ${exportData.length} records. Consider collecting more data for stronger insights.`,
      });
    }

    return analysis;
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      setIsOpen(false);
      onMessage("Generating professional PDF report...");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      let yPos = 20;
      let pageNumber = 1;

      const analysis = analyzePerformance();
      const date = new Date();
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString();

      // Helper functions
      const addNewPage = () => {
        pdf.addPage();
        yPos = 20;
        pageNumber++;
      };

      const checkPageBreak = (space: number) => {
        if (yPos + space > pageHeight - 20) {
          addNewPage();
        }
      };

      const addDarkHeader = (title: string) => {
        pdf.setFillColor(11, 18, 32);
        pdf.rect(0, 0, pageWidth, 25, "F");
        
        pdf.setFillColor(79, 70, 229);
        pdf.rect(0, 25, pageWidth, 2, "F");

        pdf.setFontSize(14);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.text("R&K", 20, 12);
        
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text("ANALYTICS", 20, 18);

        pdf.setFontSize(11);
        pdf.setTextColor(200, 200, 220);
        pdf.setFont("helvetica", "normal");
        pdf.text(title, pageWidth - 20, 15, { align: "right" });
      };

      const addDarkFooter = () => {
        pdf.setFillColor(11, 18, 32);
        pdf.rect(0, pageHeight - 15, pageWidth, 15, "F");

        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 170);
        pdf.text(dateStr, 20, pageHeight - 8);
        pdf.text("Confidential - R&K Analytics", pageWidth / 2, pageHeight - 8, { align: "center" });
        pdf.text(`Page ${pageNumber}`, pageWidth - 20, pageHeight - 8, { align: "right" });
      };

      const addDarkBackground = () => {
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
      };

      // ============================================
      // PAGE 1: EXECUTIVE COVER
      // ============================================
      
      addDarkBackground();

      pdf.setFillColor(79, 70, 229);
      pdf.rect(0, 0, pageWidth, 80, "F");

      pdf.setFontSize(48);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.text("R&K", 20, 40);

      pdf.setFontSize(22);
      pdf.setFont("helvetica", "normal");
      pdf.text("ANALYTICS", 20, 54);

      pdf.setFontSize(14);
      pdf.setTextColor(220, 220, 240);
      pdf.text("Executive Performance Report", 20, 68);

      yPos = 100;
      pdf.setFontSize(32);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.text(selectedDataset, 20, yPos, { maxWidth: pageWidth - 40 });

      yPos = 120;
      pdf.setFontSize(11);
      pdf.setTextColor(180, 180, 200);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Report Generated: ${dateStr} at ${timeStr}`, 20, yPos);
      pdf.text(`Total Records: ${exportData.length}`, 20, yPos + 7);
      pdf.text(`Data Fields: ${Object.keys(exportData[0] || {}).length}`, 20, yPos + 14);

      yPos = 150;
      pdf.setFillColor(31, 41, 67);
      pdf.roundedRect(20, yPos, pageWidth - 40, 80, 4, 4, "F");
      
      pdf.setDrawColor(79, 70, 229);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(20, yPos, pageWidth - 40, 80, 4, 4, "S");

      pdf.setFontSize(18);
      pdf.setTextColor(167, 139, 250);
      pdf.setFont("helvetica", "bold");
      pdf.text("EXECUTIVE SUMMARY", 30, yPos + 15);

      pdf.setFontSize(11);
      pdf.setTextColor(220, 220, 240);
      pdf.setFont("helvetica", "normal");

      if (analysis?.topPerformer && analysis?.totalMetrics?.metric) {
        const mainMetric = analysis.totalMetrics.metric;
        const topValue = analysis.topPerformer[mainMetric];
        const topShare = ((topValue / analysis.totalMetrics.total) * 100).toFixed(1);

        let summaryText = `${analysis.topPerformer.name} is your top performer with ${topValue.toFixed(0)} ${mainMetric}, `;
        summaryText += `representing ${topShare}% of total performance.`;
        
        if (analysis.bestROI && analysis.bestROI.name !== analysis.topPerformer.name) {
          summaryText += ` However, ${analysis.bestROI.name} shows the best cost efficiency at `;
          summaryText += `$${analysis.bestROI.costPerConversion.toFixed(2)} per conversion.`;
        }

        pdf.text(summaryText, 30, yPos + 30, { maxWidth: pageWidth - 60, lineHeightFactor: 1.6 });
      } else {
        pdf.text("Analysis complete. Review detailed metrics in the following pages.", 30, yPos + 30, {
          maxWidth: pageWidth - 60,
        });
      }

      yPos = 245;
      
      if (analysis) {
        const metrics = [
          {
            label: "TOP",
            sublabel: "Best Performer",
            value: analysis.topPerformer?.name || "N/A",
            color: [34, 197, 94],
          },
          {
            label: "ROI",
            sublabel: "Best Efficiency",  
            value: analysis.bestROI?.name || "N/A",
            color: [245, 158, 11],
          },
          {
            label: "DATA",
            sublabel: "Dataset Size",
            value: `${exportData.length} rows`,
            color: [59, 130, 246],
          },
        ];

        metrics.forEach((metric, idx) => {
          const xPos = 20 + idx * 57;
          
          pdf.setFillColor(31, 41, 67);
          pdf.roundedRect(xPos, yPos, 50, 40, 3, 3, "F");

          pdf.setDrawColor(metric.color[0], metric.color[1], metric.color[2]);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(xPos, yPos, 50, 40, 3, 3, "S");

          pdf.setFontSize(14);
          pdf.setTextColor(metric.color[0], metric.color[1], metric.color[2]);
          pdf.setFont("helvetica", "bold");
          pdf.text(metric.label, xPos + 5, yPos + 12);

          pdf.setFontSize(8);
          pdf.setTextColor(160, 160, 180);
          pdf.setFont("helvetica", "normal");
          pdf.text(metric.sublabel, xPos + 5, yPos + 20, { maxWidth: 40 });

          pdf.setFontSize(9);
          pdf.setTextColor(220, 220, 240);
          pdf.setFont("helvetica", "bold");
          
          const valueText = metric.value.length > 12 ? metric.value.substring(0, 10) + "..." : metric.value;
          pdf.text(valueText, xPos + 5, yPos + 33, { maxWidth: 40 });
        });
      }

      addDarkFooter();

      // ============================================
      // PAGE 2: PERFORMANCE ANALYSIS
      // ============================================
      
      addNewPage();
      addDarkBackground();
      addDarkHeader("Performance Analysis");

      yPos = 35;
      pdf.setFontSize(20);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.text("Performance Analysis", 20, yPos);

      yPos += 15;

      if (analysis?.campaigns && analysis?.totalMetrics?.metric) {
        const mainMetric = analysis.totalMetrics.metric;
        
        pdf.setFontSize(14);
        pdf.setTextColor(167, 139, 250);
        pdf.setFont("helvetica", "bold");
        pdf.text(`Top Performers by ${mainMetric}`, 20, yPos);

        yPos += 12;

        const sortedCampaigns = [...analysis.campaigns].sort((a, b) => 
          (b[mainMetric] || 0) - (a[mainMetric] || 0)
        );

        sortedCampaigns.slice(0, 8).forEach((campaign, idx) => {
          checkPageBreak(25);

          pdf.setFillColor(31, 41, 67);
          pdf.roundedRect(20, yPos, pageWidth - 40, 22, 2, 2, "F");

          const rankColors = [
            [34, 197, 94],
            [59, 130, 246],
            [245, 158, 11],
          ];
          const color = rankColors[idx] || [100, 100, 120];

          pdf.setFillColor(color[0], color[1], color[2]);
          pdf.circle(28, yPos + 11, 6, "F");

          pdf.setFontSize(10);
          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold");
          pdf.text(String(idx + 1), 28, yPos + 13, { align: "center" });

          pdf.setFontSize(12);
          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold");
          pdf.text(campaign.name, 40, yPos + 10);

          pdf.setFontSize(16);
          pdf.setTextColor(color[0], color[1], color[2]);
          pdf.setFont("helvetica", "bold");
          pdf.text(String((campaign[mainMetric] || 0).toFixed(0)), 40, yPos + 19);

          const maxValue = sortedCampaigns[0][mainMetric];
          const percentage = (campaign[mainMetric] / maxValue) * 100;
          const barWidth = 80;
          const barX = pageWidth - barWidth - 30;

          pdf.setFillColor(45, 55, 80);
          pdf.rect(barX, yPos + 8, barWidth, 8, "F");

          pdf.setFillColor(color[0], color[1], color[2]);
          pdf.rect(barX, yPos + 8, (barWidth * percentage) / 100, 8, "F");

          pdf.setFontSize(10);
          pdf.setTextColor(220, 220, 240);
          pdf.text(`${percentage.toFixed(1)}%`, barX + barWidth + 5, yPos + 14);

          yPos += 26;
        });
      }

      addDarkFooter();

      // ============================================
      // PAGE 3: COST EFFICIENCY (if available)
      // ============================================
      
      if (analysis?.bestROI) {
        addNewPage();
        addDarkBackground();
        addDarkHeader("Cost Efficiency Analysis");

        yPos = 35;
        pdf.setFontSize(20);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.text("Cost Efficiency Analysis", 20, yPos);

        yPos += 15;

        pdf.setFontSize(14);
        pdf.setTextColor(167, 139, 250);
        pdf.setFont("helvetica", "bold");
        pdf.text("Cost Per Conversion Ranking", 20, yPos);

        yPos += 12;

        const sortedByROI = [...analysis.campaigns]
          .filter(c => c.costPerConversion)
          .sort((a, b) => a.costPerConversion - b.costPerConversion);

        sortedByROI.forEach((campaign, idx) => {
          checkPageBreak(25);

          pdf.setFillColor(31, 41, 67);
          pdf.roundedRect(20, yPos, pageWidth - 40, 22, 2, 2, "F");

          pdf.setFontSize(11);
          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "normal");
          pdf.text(campaign.name, 25, yPos + 10);

          pdf.setFontSize(14);
          pdf.setTextColor(idx === 0 ? 34 : idx === 1 ? 59 : 245, 
                           idx === 0 ? 197 : idx === 1 ? 130 : 158, 
                           idx === 0 ? 94 : idx === 1 ? 246 : 11);
          pdf.setFont("helvetica", "bold");
          pdf.text(`$${campaign.costPerConversion.toFixed(2)}`, 25, yPos + 18);

          const maxCost = sortedByROI[sortedByROI.length - 1].costPerConversion;
          const efficiency = 100 - ((campaign.costPerConversion / maxCost) * 100);
          const barWidth = 80;
          const barX = pageWidth - barWidth - 30;

          pdf.setFillColor(45, 55, 80);
          pdf.rect(barX, yPos + 8, barWidth, 8, "F");

          pdf.setFillColor(34, 197, 94);
          pdf.rect(barX, yPos + 8, (barWidth * efficiency) / 100, 8, "F");

          if (idx === 0) {
            pdf.setFontSize(10);
            pdf.setTextColor(34, 197, 94);
            pdf.setFont("helvetica", "bold");
            pdf.text("BEST", barX + barWidth + 5, yPos + 14);
          }

          yPos += 26;
        });

        yPos += 10;
        checkPageBreak(40);

        pdf.setFillColor(31, 41, 67);
        pdf.roundedRect(20, yPos, pageWidth - 40, 35, 3, 3, "F");

        pdf.setDrawColor(34, 197, 94);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(20, yPos, pageWidth - 40, 35, 3, 3, "S");

        pdf.setFontSize(12);
        pdf.setTextColor(34, 197, 94);
        pdf.setFont("helvetica", "bold");
        pdf.text("KEY INSIGHT", 25, yPos + 12);

        pdf.setFontSize(10);
        pdf.setTextColor(220, 220, 240);
        pdf.setFont("helvetica", "normal");
        
        const bestROI = sortedByROI[0];
        const worstROI = sortedByROI[sortedByROI.length - 1];
        const savingsPct = ((worstROI.costPerConversion - bestROI.costPerConversion) / worstROI.costPerConversion * 100).toFixed(0);

        pdf.text(
          `${bestROI.name} achieves ${savingsPct}% better cost efficiency than ${worstROI.name}. Consider reallocating budget to maximize ROI.`,
          25,
          yPos + 22,
          { maxWidth: pageWidth - 50, lineHeightFactor: 1.5 }
        );

        addDarkFooter();
      }

      // ============================================
      // PAGE 4: KEY METRICS
      // ============================================
      
      addNewPage();
      addDarkBackground();
      addDarkHeader("Key Metrics");

      yPos = 35;
      pdf.setFontSize(20);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.text("Key Performance Metrics", 20, yPos);

      yPos += 15;

      if (dashboardData?.kpis) {
        dashboardData.kpis.forEach((kpi: any) => {
          checkPageBreak(35);

          pdf.setFillColor(31, 41, 67);
          pdf.roundedRect(20, yPos, pageWidth - 40, 30, 3, 3, "F");

          // FIXED: No emoji icon, just colored circle with text
          pdf.setFillColor(79, 70, 229);
          pdf.circle(28, yPos + 15, 7, "F");
          
          pdf.setFontSize(10);
          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold");
          pdf.text("KPI", 28, yPos + 17, { align: "center" });

          pdf.setFontSize(10);
          pdf.setTextColor(160, 160, 180);
          pdf.setFont("helvetica", "bold");
          pdf.text(kpi.title.toUpperCase(), 42, yPos + 11);

          pdf.setFontSize(20);
          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold");
          pdf.text(String(kpi.value), 42, yPos + 23);

          if (kpi.subtitle) {
            pdf.setFontSize(8);
            pdf.setTextColor(140, 140, 160);
            pdf.setFont("helvetica", "normal");
            pdf.text(kpi.subtitle, pageWidth - 25, yPos + 20, { align: "right", maxWidth: 60 });
          }

          yPos += 35;
        });
      }

      yPos += 10;
      checkPageBreak(60);

      if (analysis?.insights) {
        pdf.setFontSize(14);
        pdf.setTextColor(167, 139, 250);
        pdf.setFont("helvetica", "bold");
        pdf.text("Actionable Insights", 20, yPos);

        yPos += 12;

        analysis.insights.forEach((insight: any) => {
          checkPageBreak(35);

          const colors: any = {
            success: [34, 197, 94],
            info: [59, 130, 246],
            warning: [245, 158, 11],
          };
          const color = colors[insight.type] || [100, 100, 120];

          pdf.setFillColor(31, 41, 67);
          pdf.roundedRect(20, yPos, pageWidth - 40, 30, 2, 2, "F");

          pdf.setDrawColor(color[0], color[1], color[2]);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(20, yPos, pageWidth - 40, 30, 2, 2, "S");

          pdf.setFontSize(11);
          pdf.setTextColor(color[0], color[1], color[2]);
          pdf.setFont("helvetica", "bold");
          pdf.text(insight.title, 25, yPos + 10);

          pdf.setFontSize(9);
          pdf.setTextColor(220, 220, 240);
          pdf.setFont("helvetica", "normal");
          pdf.text(insight.text, 25, yPos + 19, { maxWidth: pageWidth - 50, lineHeightFactor: 1.5 });

          yPos += 35;
        });
      }

      addDarkFooter();

      // ============================================
      // FINAL PAGE: DATA TABLE
      // ============================================
      
      addNewPage();
      addDarkBackground();
      addDarkHeader("Complete Data");

      yPos = 35;
      pdf.setFontSize(20);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.text("Complete Data Table", 20, yPos);

      yPos += 5;
      pdf.setFontSize(10);
      pdf.setTextColor(160, 160, 180);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${exportData.length} records`, 20, yPos + 5);

      yPos += 15;

      if (exportData.length > 0) {
        const columns = Object.keys(exportData[0]);
        const visibleCols = columns.slice(0, 5);
        const colWidth = (pageWidth - 40) / visibleCols.length;

        pdf.setFillColor(31, 41, 67);
        pdf.rect(20, yPos, pageWidth - 40, 10, "F");

        pdf.setFontSize(8);
        pdf.setTextColor(167, 139, 250);
        pdf.setFont("helvetica", "bold");
        visibleCols.forEach((col, idx) => {
          const colText = col.length > 12 ? col.substring(0, 10) + ".." : col;
          pdf.text(colText, 22 + idx * colWidth, yPos + 7);
        });

        yPos += 10;

        exportData.slice(0, 20).forEach((row, rowIdx) => {
          checkPageBreak(9);

          pdf.setFillColor(rowIdx % 2 === 0 ? 25 : 20, rowIdx % 2 === 0 ? 35 : 30, rowIdx % 2 === 0 ? 52 : 47);
          pdf.rect(20, yPos, pageWidth - 40, 8, "F");

          pdf.setFontSize(7);
          pdf.setTextColor(220, 220, 240);
          pdf.setFont("helvetica", "normal");

          visibleCols.forEach((col, idx) => {
            const value = String(row[col] || "");
            const truncated = value.length > 15 ? value.substring(0, 12) + "..." : value;
            pdf.text(truncated, 22 + idx * colWidth, yPos + 5);
          });

          yPos += 8;
        });

        if (exportData.length > 20) {
          yPos += 5;
          pdf.setFontSize(9);
          pdf.setTextColor(140, 140, 160);
          pdf.setFont("helvetica", "italic");
          pdf.text(
            `... and ${exportData.length - 20} more records`,
            20,
            yPos
          );
        }
      }

      addDarkFooter();

      const filename = `${selectedDataset.replace(/\s+/g, "_")}_Report_${dateStr.replace(/\//g, "-")}.pdf`;
      pdf.save(filename);

      onMessage(`PDF exported successfully: ${filename}`);
    } catch (error) {
      console.error("PDF error:", error);
      onMessage(`Export failed: ${error}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = () => {
    try {
      setIsOpen(false);
      onMessage("Exporting to Excel...");

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, selectedDataset.substring(0, 31));

      const filename = `${selectedDataset.replace(/\s+/g, "_")}_${new Date().toLocaleDateString().replace(/\//g, "-")}.xlsx`;
      XLSX.writeFile(wb, filename);

      onMessage(`Excel exported: ${filename}`);
    } catch (error) {
      onMessage(`Export failed: ${error}`);
    }
  };

  const handleExportCSV = () => {
    try {
      setIsOpen(false);
      onMessage("Exporting to CSV...");

      const headers = Object.keys(exportData[0] || {});
      const csv = [
        headers.join(","),
        ...exportData.map((row) =>
          headers.map((h) => `"${String(row[h] || "").replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedDataset.replace(/\s+/g, "_")}_${new Date().toLocaleDateString().replace(/\//g, "-")}.csv`;
      a.click();

      onMessage(`CSV exported: ${a.download}`);
    } catch (error) {
      onMessage(`Export failed: ${error}`);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={exporting}
        style={{
          padding: "12px 18px",
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 14,
          background: exporting
            ? "rgba(100,100,100,0.2)"
            : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
          border: "none",
          color: "#fff",
          cursor: exporting ? "not-allowed" : "pointer",
          boxShadow: exporting ? "none" : "0 4px 12px rgba(16,185,129,0.3)",
        }}
      >
        {exporting ? "Generating..." : "Export"}
      </button>

      {isOpen && !exporting && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 8,
            background: "rgba(15,23,42,0.98)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: "8px",
            minWidth: 200,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 1000,
          }}
        >
          <button
            onClick={handleExportPDF}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "rgba(79,70,229,0.15)",
              border: "1px solid rgba(79,70,229,0.30)",
              borderRadius: 8,
              color: "#E5E7EB",
              cursor: "pointer",
              textAlign: "left",
              fontWeight: 700,
              fontSize: 14,
              marginBottom: 6,
            }}
          >
            Professional Dark PDF
          </button>
          <button
            onClick={handleExportExcel}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: 8,
              color: "#E5E7EB",
              cursor: "pointer",
              textAlign: "left",
              fontWeight: 700,
              fontSize: 14,
              marginBottom: 4,
            }}
          >
            Excel Spreadsheet
          </button>
          <button
            onClick={handleExportCSV}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: 8,
              color: "#E5E7EB",
              cursor: "pointer",
              textAlign: "left",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            CSV Data File
          </button>
        </div>
      )}
    </div>
  );
}