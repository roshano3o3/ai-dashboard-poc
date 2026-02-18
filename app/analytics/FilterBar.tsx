"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface FilterBarProps {
  startDate: Date | null;
  endDate: Date | null;
  onDateRangeChange: (start: Date | null, end: Date | null) => void;
  selectedDataset: string;
  availableDatasets: string[];
  onDatasetChange: (dataset: string) => void;
  activeFilters: Filter[];
  availableColumns: string[];
  onAddFilter: (filter: Filter) => void;
  onRemoveFilter: (filterId: string) => void;
  onApplyFilters: () => void;
  totalRecords: number;
  filteredRecords: number;
}

export interface Filter {
  id: string;
  column: string;
  operator: "equals" | "contains" | "greater_than" | "less_than" | "not_equals";
  value: string;
}

const DATE_PRESETS = [
  { label: "Last 7 Days", days: 7 },
  { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 },
  { label: "This Month", type: "this_month" },
  { label: "Last Month", type: "last_month" },
  { label: "This Quarter", type: "this_quarter" },
  { label: "Last Quarter", type: "last_quarter" },
];

export default function FilterBar({
  startDate,
  endDate,
  onDateRangeChange,
  selectedDataset,
  availableDatasets,
  onDatasetChange,
  activeFilters,
  availableColumns,
  onAddFilter,
  onRemoveFilter,
  onApplyFilters,
  totalRecords,
  filteredRecords,
}: FilterBarProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [newFilter, setNewFilter] = useState<Partial<Filter>>({
    column: "",
    operator: "equals",
    value: "",
  });

  const handlePresetClick = (preset: typeof DATE_PRESETS[0]) => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    if ("days" in preset) {
      start = new Date(today);
      start.setDate(today.getDate() - preset.days);
    } else {
      switch (preset.type) {
        case "this_month":
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        case "last_month":
          start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          end = new Date(today.getFullYear(), today.getMonth(), 0);
          break;
        case "this_quarter":
          const currentQuarter = Math.floor(today.getMonth() / 3);
          start = new Date(today.getFullYear(), currentQuarter * 3, 1);
          break;
        case "last_quarter":
          const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
          start = new Date(today.getFullYear(), lastQuarter * 3, 1);
          end = new Date(today.getFullYear(), (lastQuarter + 1) * 3, 0);
          break;
        default:
          start = today;
      }
    }

    onDateRangeChange(start, end);
    setShowDatePicker(false);
  };

  const handleAddFilter = () => {
    if (newFilter.column && newFilter.value) {
      onAddFilter({
        id: `filter_${Date.now()}`,
        column: newFilter.column!,
        operator: newFilter.operator || "equals",
        value: newFilter.value!,
      });
      setNewFilter({ column: "", operator: "equals", value: "" });
      setShowAddFilter(false);
    }
  };

  const getOperatorSymbol = (operator: Filter["operator"]) => {
    switch (operator) {
      case "equals": return "=";
      case "not_equals": return "≠";
      case "contains": return "⊃";
      case "greater_than": return ">";
      case "less_than": return "<";
    }
  };

  return (
    <div style={styles.filterBar}>
      <div style={styles.topRow}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>📅 Date Range</label>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowDatePicker(!showDatePicker)} style={styles.dateButton}>
              {startDate && endDate
                ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
                : "Select Date Range"}
              <span style={styles.dropdownIcon}>▼</span>
            </button>

            {showDatePicker && (
              <div style={styles.datePickerDropdown}>
                <div style={styles.presetGrid}>
                  {DATE_PRESETS.map((preset) => (
                    <button key={preset.label} onClick={() => handlePresetClick(preset)} style={styles.presetButton}>
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div style={styles.customDateSection}>
                  <div style={styles.datePickerLabel}>Custom Range:</div>
                  <div style={styles.datePickerRow}>
                    <div>
                      <div style={styles.datePickerSubLabel}>Start Date</div>
                      <DatePicker
                        selected={startDate}
                        onChange={(date) => onDateRangeChange(date, endDate)}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        inline
                      />
                    </div>
                    <div>
                      <div style={styles.datePickerSubLabel}>End Date</div>
                      <DatePicker
                        selected={endDate}
                        onChange={(date) => onDateRangeChange(startDate, date)}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        inline
                      />
                    </div>
                  </div>
                </div>

                <button onClick={() => setShowDatePicker(false)} style={styles.doneButton}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>📊 Dataset</label>
          <select value={selectedDataset} onChange={(e) => onDatasetChange(e.target.value)} style={styles.select}>
            {availableDatasets.map((ds) => (
              <option key={ds} value={ds}>{ds}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>&nbsp;</label>
          <button onClick={() => setShowAddFilter(!showAddFilter)} style={styles.addFilterButton}>
            + Add Filter
          </button>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>&nbsp;</label>
          <button onClick={onApplyFilters} style={styles.applyButton}>
            Apply Filters
          </button>
        </div>

        <div style={styles.recordCount}>
          <div style={styles.recordCountLabel}>Records:</div>
          <div style={styles.recordCountValue}>
            {filteredRecords !== totalRecords ? (
              <>
                <span style={styles.filteredCount}>{filteredRecords}</span>
                <span style={styles.totalCount}> of {totalRecords}</span>
              </>
            ) : (
              <span style={styles.filteredCount}>{totalRecords}</span>
            )}
          </div>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div style={styles.activeFiltersRow}>
          <span style={styles.activeFiltersLabel}>Active Filters:</span>
          {activeFilters.map((filter) => (
            <div key={filter.id} style={styles.filterTag}>
              <span style={styles.filterTagText}>
                {filter.column} {getOperatorSymbol(filter.operator)} "{filter.value}"
              </span>
              <button onClick={() => onRemoveFilter(filter.id)} style={styles.removeFilterButton}>
                ✕
              </button>
            </div>
          ))}
          <button onClick={() => activeFilters.forEach(f => onRemoveFilter(f.id))} style={styles.clearAllButton}>
            Clear All
          </button>
        </div>
      )}

      {showAddFilter && (
        <div style={styles.addFilterModal}>
          <div style={styles.addFilterHeader}>
            <span style={styles.addFilterTitle}>Add New Filter</span>
            <button onClick={() => setShowAddFilter(false)} style={styles.closeModalButton}>
              ✕
            </button>
          </div>

          <div style={styles.addFilterForm}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Column</label>
              <select value={newFilter.column || ""} onChange={(e) => setNewFilter({ ...newFilter, column: e.target.value })} style={styles.formSelect}>
                <option value="">Select column...</option>
                {availableColumns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Operator</label>
              <select value={newFilter.operator || "equals"} onChange={(e) => setNewFilter({ ...newFilter, operator: e.target.value as Filter["operator"] })} style={styles.formSelect}>
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="contains">Contains</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Value</label>
              <input type="text" value={newFilter.value || ""} onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })} placeholder="Enter value..." style={styles.formInput} />
            </div>
          </div>

          <button onClick={handleAddFilter} style={styles.addFilterSubmitButton}>
            Add Filter
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  filterBar: {
    background: "rgba(17, 24, 39, 0.95)",
    backdropFilter: "blur(20px)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    border: "1px solid rgba(79, 70, 229, 0.2)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  },
  topRow: { display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" },
  filterGroup: { display: "flex", flexDirection: "column", minWidth: 180, flex: 1 },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateButton: {
    width: "100%",
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 600,
    background: "#111827",
    border: "2px solid rgba(102, 126, 234, 0.3)",
    borderRadius: 10,
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    transition: "all 0.3s ease",
  },
  dropdownIcon: { fontSize: 10, opacity: 0.7 },
  datePickerDropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    right: 0,
    background: "#1f2937",
    border: "2px solid rgba(102, 126, 234, 0.3)",
    borderRadius: 12,
    padding: 20,
    zIndex: 1000,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    minWidth: 600,
  },
  presetGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 },
  presetButton: {
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 600,
    background: "rgba(102, 126, 234, 0.2)",
    border: "1px solid rgba(102, 126, 234, 0.3)",
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  customDateSection: { marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)" },
  datePickerLabel: { fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 },
  datePickerRow: { display: "flex", gap: 20 },
  datePickerSubLabel: { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 8 },
  doneButton: {
    marginTop: 16,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 700,
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    width: "100%",
  },
  select: {
    width: "100%",
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 600,
    background: "#111827",
    border: "2px solid rgba(102, 126, 234, 0.3)",
    borderRadius: 10,
    color: "#fff",
    cursor: "pointer",
    outline: "none",
  },
  addFilterButton: {
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 700,
    background: "rgba(16, 185, 129, 0.2)",
    border: "2px solid rgba(16, 185, 129, 0.5)",
    borderRadius: 10,
    color: "#10b981",
    cursor: "pointer",
    transition: "all 0.3s ease",
    whiteSpace: "nowrap",
  },
  applyButton: {
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: 700,
    background: "linear-gradient(135deg, #667eea 0%, #f5576c 100%)",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
    whiteSpace: "nowrap",
  },
  recordCount: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    marginLeft: "auto",
  },
  recordCountLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  recordCountValue: { fontSize: 18, fontWeight: 900 },
  filteredCount: { color: "#10b981" },
  totalCount: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  activeFiltersRow: {
    display: "flex",
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid rgba(255,255,255,0.05)",
    flexWrap: "wrap",
    alignItems: "center",
  },
  activeFiltersLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
  },
  filterTag: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 12px",
    background: "rgba(102, 126, 234, 0.2)",
    border: "1px solid rgba(102, 126, 234, 0.4)",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
  },
  filterTagText: { color: "#fff" },
  removeFilterButton: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.6)",
    cursor: "pointer",
    fontSize: 14,
    padding: 0,
    width: 16,
    height: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  clearAllButton: {
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    background: "transparent",
    border: "1px solid rgba(239, 68, 68, 0.5)",
    borderRadius: 20,
    color: "#ef4444",
    cursor: "pointer",
    marginLeft: "auto",
  },
  addFilterModal: {
    marginTop: 16,
    padding: 20,
    background: "rgba(31, 41, 55, 0.95)",
    borderRadius: 12,
    border: "1px solid rgba(102, 126, 234, 0.3)",
  },
  addFilterHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  addFilterTitle: { fontSize: 16, fontWeight: 700, color: "#fff" },
  closeModalButton: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.6)",
    cursor: "pointer",
    fontSize: 20,
  },
  addFilterForm: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 },
  formGroup: { display: "flex", flexDirection: "column" },
  formLabel: { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 6 },
  formSelect: {
    padding: "10px 12px",
    fontSize: 14,
    fontWeight: 600,
    background: "#111827",
    border: "1px solid rgba(102, 126, 234, 0.3)",
    borderRadius: 8,
    color: "#fff",
    outline: "none",
  },
  formInput: {
    padding: "10px 12px",
    fontSize: 14,
    fontWeight: 600,
    background: "#111827",
    border: "1px solid rgba(102, 126, 234, 0.3)",
    borderRadius: 8,
    color: "#fff",
    outline: "none",
  },
  addFilterSubmitButton: {
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 700,
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    width: "100%",
  },
};