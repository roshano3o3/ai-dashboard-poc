"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// User tiers (this will come from database in production)
type UserTier = "free" | "pro" | "business" | "enterprise";

export default function BrandingPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userTier, setUserTier] = useState<UserTier>("free"); // Mock tier for now
  
  // Branding settings
  const [companyName, setCompanyName] = useState("R&K Analytics");
  const [logo, setLogo] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [secondaryColor, setSecondaryColor] = useState("#EC4899");
  const [whiteLabel, setWhiteLabel] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        router.push("/auth");
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/auth");
        return;
      }

      setUserId(data.user.id);
      setUserEmail(data.user.email || "");
      
      // Load saved branding settings (mock for now)
      loadBrandingSettings(data.user.id);
      
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const loadBrandingSettings = async (uid: string) => {
    // In production, load from database
    // For now, use localStorage
    const saved = localStorage.getItem(`branding_${uid}`);
    if (saved) {
      const settings = JSON.parse(saved);
      setCompanyName(settings.companyName || "R&K Analytics");
      setLogo(settings.logo || null);
      setPrimaryColor(settings.primaryColor || "#4F46E5");
      setSecondaryColor(settings.secondaryColor || "#EC4899");
      setWhiteLabel(settings.whiteLabel || false);
    }
  };

  const saveBrandingSettings = async () => {
    setSaving(true);

    // In production, save to database
    // For now, use localStorage
    const settings = {
      companyName,
      logo,
      primaryColor,
      secondaryColor,
      whiteLabel,
    };

    localStorage.setItem(`branding_${userId}`, JSON.stringify(settings));

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSaving(false);
    alert("✅ Branding settings saved successfully!");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("File size must be less than 2MB");
      return;
    }

    setUploadingLogo(true);

    // Convert to base64 for preview (in production, upload to storage)
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogo(reader.result as string);
      setUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogo(null);
  };

  const resetToDefaults = () => {
    if (confirm("Reset all branding to defaults?")) {
      setCompanyName("R&K Analytics");
      setLogo(null);
      setPrimaryColor("#4F46E5");
      setSecondaryColor("#EC4899");
      setWhiteLabel(false);
    }
  };

  // Feature availability based on tier
  const canUploadLogo = ["pro", "business", "enterprise"].includes(userTier);
  const canCustomizeColors = ["business", "enterprise"].includes(userTier);
  const canWhiteLabel = ["business", "enterprise"].includes(userTier);

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={{ fontSize: 24, fontWeight: 900 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logo}>R&K</div>
          <div>
            <div style={styles.brandTitle}>Branding Settings</div>
            <div style={styles.brandSub}>{userEmail}</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <button onClick={() => router.push("/dashboard")} style={styles.btn}>
            ← Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.container}>
          {/* Left Side - Settings */}
          <div style={styles.settingsPanel}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>🎨 Customize Your Brand</h2>
              <p style={styles.sectionSubtitle}>
                Make the dashboard yours with custom branding
              </p>
            </div>

            {/* Tier Badge */}
            <div style={styles.tierBadge}>
              <span style={styles.tierIcon}>⭐</span>
              <span style={styles.tierText}>Current Plan: {userTier.toUpperCase()}</span>
            </div>

            {/* Company Name */}
            <div style={styles.settingCard}>
              <label style={styles.label}>
                <span style={styles.labelText}>Company Name</span>
                <span style={styles.labelBadge}>All Plans</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter your company name"
                style={styles.input}
                maxLength={50}
              />
              <p style={styles.hint}>This will appear in the header and exports</p>
            </div>

            {/* Logo Upload */}
            <div style={styles.settingCard}>
              <label style={styles.label}>
                <span style={styles.labelText}>Company Logo</span>
                <span style={{ ...styles.labelBadge, ...(canUploadLogo ? styles.labelBadgeEnabled : styles.labelBadgeLocked) }}>
                  {canUploadLogo ? "PRO+" : "🔒 PRO+"}
                </span>
              </label>

              {canUploadLogo ? (
                <div style={styles.logoUpload}>
                  {logo ? (
                    <div style={styles.logoPreview}>
                      <img src={logo} alt="Logo" style={styles.logoImage} />
                      <button onClick={removeLogo} style={styles.removeLogoBtn}>
                        ✕ Remove
                      </button>
                    </div>
                  ) : (
                    <label style={styles.uploadBox}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        style={{ display: "none" }}
                        disabled={uploadingLogo}
                      />
                      <div style={styles.uploadIcon}>📁</div>
                      <div style={styles.uploadText}>
                        {uploadingLogo ? "Uploading..." : "Click to upload logo"}
                      </div>
                      <div style={styles.uploadHint}>PNG, JPG up to 2MB</div>
                    </label>
                  )}
                </div>
              ) : (
                <div style={styles.lockedFeature}>
                  <div style={styles.lockedIcon}>🔒</div>
                  <div style={styles.lockedText}>Upgrade to Pro to upload your logo</div>
                  <button onClick={() => alert("Upgrade to Pro! (Payment coming soon)")} style={styles.upgradeBtn}>
                    Upgrade to Pro
                  </button>
                </div>
              )}

              <p style={styles.hint}>Recommended: 200x50px transparent PNG</p>
            </div>

            {/* Primary Color */}
            <div style={styles.settingCard}>
              <label style={styles.label}>
                <span style={styles.labelText}>Primary Brand Color</span>
                <span style={{ ...styles.labelBadge, ...(canCustomizeColors ? styles.labelBadgeEnabled : styles.labelBadgeLocked) }}>
                  {canCustomizeColors ? "BUSINESS+" : "🔒 BUSINESS+"}
                </span>
              </label>

              {canCustomizeColors ? (
                <div style={styles.colorPicker}>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={styles.input}
                    placeholder="#4F46E5"
                  />
                </div>
              ) : (
                <div style={styles.lockedFeature}>
                  <div style={styles.lockedIcon}>🔒</div>
                  <div style={styles.lockedText}>Upgrade to Business to customize colors</div>
                  <button onClick={() => alert("Upgrade to Business! (Payment coming soon)")} style={styles.upgradeBtn}>
                    Upgrade to Business
                  </button>
                </div>
              )}

              <p style={styles.hint}>Used for buttons, accents, and highlights</p>
            </div>

            {/* Secondary Color */}
            <div style={styles.settingCard}>
              <label style={styles.label}>
                <span style={styles.labelText}>Secondary Brand Color</span>
                <span style={{ ...styles.labelBadge, ...(canCustomizeColors ? styles.labelBadgeEnabled : styles.labelBadgeLocked) }}>
                  {canCustomizeColors ? "BUSINESS+" : "🔒 BUSINESS+"}
                </span>
              </label>

              {canCustomizeColors ? (
                <div style={styles.colorPicker}>
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    style={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    style={styles.input}
                    placeholder="#EC4899"
                  />
                </div>
              ) : (
                <div style={styles.lockedFeature}>
                  <div style={styles.lockedIcon}>🔒</div>
                  <div style={styles.lockedText}>Upgrade to Business to customize colors</div>
                </div>
              )}

              <p style={styles.hint}>Used for gradients and secondary elements</p>
            </div>

            {/* White Label */}
            <div style={styles.settingCard}>
              <label style={styles.label}>
                <span style={styles.labelText}>White Label Mode</span>
                <span style={{ ...styles.labelBadge, ...(canWhiteLabel ? styles.labelBadgeEnabled : styles.labelBadgeLocked) }}>
                  {canWhiteLabel ? "BUSINESS+" : "🔒 BUSINESS+"}
                </span>
              </label>

              {canWhiteLabel ? (
                <label style={styles.toggleWrapper}>
                  <input
                    type="checkbox"
                    checked={whiteLabel}
                    onChange={(e) => setWhiteLabel(e.target.checked)}
                    style={{ display: "none" }}
                  />
                  <div style={{ ...styles.toggle, ...(whiteLabel ? styles.toggleActive : {}) }}>
                    <div style={styles.toggleKnob} />
                  </div>
                  <span style={styles.toggleLabel}>
                    {whiteLabel ? "Enabled - R&K branding hidden" : "Disabled - R&K branding shown"}
                  </span>
                </label>
              ) : (
                <div style={styles.lockedFeature}>
                  <div style={styles.lockedIcon}>🔒</div>
                  <div style={styles.lockedText}>Upgrade to Business for white-label</div>
                  <button onClick={() => alert("Upgrade to Business! (Payment coming soon)")} style={styles.upgradeBtn}>
                    Upgrade to Business
                  </button>
                </div>
              )}

              <p style={styles.hint}>Remove "Powered by R&K" from all pages and exports</p>
            </div>

            {/* Action Buttons */}
            <div style={styles.actionButtons}>
              <button onClick={saveBrandingSettings} disabled={saving} style={styles.saveBtn}>
                {saving ? "💾 Saving..." : "💾 Save Changes"}
              </button>
              <button onClick={resetToDefaults} style={styles.resetBtn}>
                🔄 Reset to Defaults
              </button>
            </div>
          </div>

          {/* Right Side - Preview */}
          <div style={styles.previewPanel}>
            <div style={styles.previewHeader}>
              <h3 style={styles.previewTitle}>Live Preview</h3>
              <p style={styles.previewSubtitle}>See how your branding looks</p>
            </div>

            {/* Preview Dashboard */}
            <div style={styles.previewBox}>
              {/* Mock Header */}
              <div style={{ ...styles.mockHeader, background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                {logo ? (
                  <img src={logo} alt="Logo" style={styles.mockLogo} />
                ) : (
                  <div style={styles.mockLogoPlaceholder}>{companyName.substring(0, 2).toUpperCase()}</div>
                )}
                <div style={styles.mockCompanyName}>{companyName}</div>
              </div>

              {/* Mock Content */}
              <div style={styles.mockContent}>
                <div style={styles.mockCard}>
                  <div style={styles.mockCardTitle}>Dashboard Preview</div>
                  <div style={styles.mockChart} />
                  <button style={{ ...styles.mockButton, background: primaryColor }}>
                    Primary Action
                  </button>
                </div>
              </div>

              {/* Mock Footer */}
              {!whiteLabel && (
                <div style={styles.mockFooter}>
                  Powered by R&K Analytics
                </div>
              )}
            </div>

            {/* Color Swatches */}
            <div style={styles.swatchCard}>
              <div style={styles.swatchTitle}>Your Brand Colors</div>
              <div style={styles.swatches}>
                <div style={styles.swatch}>
                  <div style={{ ...styles.swatchBox, background: primaryColor }} />
                  <div style={styles.swatchLabel}>Primary</div>
                  <div style={styles.swatchValue}>{primaryColor}</div>
                </div>
                <div style={styles.swatch}>
                  <div style={{ ...styles.swatchBox, background: secondaryColor }} />
                  <div style={styles.swatchLabel}>Secondary</div>
                  <div style={styles.swatchValue}>{secondaryColor}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 650px at 18% 0%, rgba(79,70,229,0.22), transparent 60%), #0B1220",
    color: "#E5E7EB",
    fontFamily: "'Inter', system-ui, sans-serif",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0B1220",
    color: "#fff",
  },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    padding: "16px 20px",
    background: "rgba(11,18,32,0.92)",
    backdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    color: "#fff",
  },

  brandTitle: {
    fontSize: 16,
    fontWeight: 950,
    color: "#fff",
  },

  brandSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.60)",
    marginTop: 2,
  },

  headerRight: {
    display: "flex",
    gap: 10,
  },

  btn: {
    padding: "10px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#E5E7EB",
    fontWeight: 900,
    fontSize: 13,
    cursor: "pointer",
  },

  main: {
    padding: "40px 20px 80px",
  },

  container: {
    maxWidth: 1400,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 32,
  },

  settingsPanel: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  sectionHeader: {
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 32,
    fontWeight: 950,
    marginBottom: 8,
  },

  sectionSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.70)",
  },

  tierBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    borderRadius: 12,
    background: "rgba(79,70,229,0.15)",
    border: "1px solid rgba(79,70,229,0.30)",
  },

  tierIcon: {
    fontSize: 18,
  },

  tierText: {
    fontSize: 13,
    fontWeight: 900,
    color: "#A5B4FC",
  },

  settingCard: {
    padding: 24,
    background: "rgba(15,23,42,0.85)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
  },

  label: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  labelText: {
    fontSize: 14,
    fontWeight: 900,
    color: "#fff",
  },

  labelBadge: {
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  labelBadgeEnabled: {
    background: "rgba(16,185,129,0.15)",
    color: "#10B981",
  },

  labelBadgeLocked: {
    background: "rgba(239,68,68,0.15)",
    color: "#EF4444",
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    outline: "none",
  },

  hint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    marginTop: 8,
  },

  logoUpload: {
    marginBottom: 12,
  },

  logoPreview: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: 16,
    background: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
  },

  logoImage: {
    width: 120,
    height: 60,
    objectFit: "contain",
  },

  removeLogoBtn: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid rgba(239,68,68,0.30)",
    background: "rgba(239,68,68,0.15)",
    color: "#EF4444",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },

  uploadBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    border: "2px dashed rgba(255,255,255,0.20)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.02)",
    cursor: "pointer",
    transition: "all 0.2s",
  },

  uploadIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  uploadText: {
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 4,
  },

  uploadHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
  },

  lockedFeature: {
    padding: 32,
    textAlign: "center",
    background: "rgba(0,0,0,0.20)",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
  },

  lockedIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  lockedText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.70)",
    marginBottom: 16,
  },

  upgradeBtn: {
    padding: "10px 20px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 900,
    cursor: "pointer",
  },

  colorPicker: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 12,
  },

  colorInput: {
    width: 60,
    height: 48,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    cursor: "pointer",
  },

  toggleWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    marginBottom: 12,
  },

  toggle: {
    width: 56,
    height: 32,
    borderRadius: 999,
    background: "rgba(255,255,255,0.15)",
    position: "relative",
    transition: "all 0.2s",
  },

  toggleActive: {
    background: "#10B981",
  },

  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 999,
    background: "#fff",
    position: "absolute",
    top: 4,
    left: 4,
    transition: "all 0.2s",
  },

  toggleLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: "rgba(255,255,255,0.80)",
  },

  actionButtons: {
    display: "flex",
    gap: 12,
  },

  saveBtn: {
    flex: 1,
    padding: "16px 24px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(79,70,229,0.35)",
  },

  resetBtn: {
    flex: 1,
    padding: "16px 24px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "#E5E7EB",
    fontSize: 15,
    fontWeight: 950,
    cursor: "pointer",
  },

  previewPanel: {
    position: "sticky",
    top: 100,
    height: "fit-content",
  },

  previewHeader: {
    marginBottom: 20,
  },

  previewTitle: {
    fontSize: 22,
    fontWeight: 950,
    marginBottom: 4,
  },

  previewSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.70)",
  },

  previewBox: {
    background: "rgba(15,23,42,0.85)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },

  mockHeader: {
    padding: 20,
    display: "flex",
    alignItems: "center",
    gap: 16,
  },

  mockLogo: {
    width: 100,
    height: 40,
    objectFit: "contain",
  },

  mockLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 12,
    background: "rgba(255,255,255,0.20)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    fontWeight: 950,
    color: "#fff",
  },

  mockCompanyName: {
    fontSize: 20,
    fontWeight: 950,
    color: "#fff",
  },

  mockContent: {
    padding: 20,
  },

  mockCard: {
    padding: 20,
    background: "rgba(0,0,0,0.20)",
    borderRadius: 12,
  },

  mockCardTitle: {
    fontSize: 16,
    fontWeight: 900,
    marginBottom: 16,
  },

  mockChart: {
    height: 120,
    background: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    marginBottom: 16,
  },

  mockButton: {
    width: "100%",
    padding: "12px",
    borderRadius: 10,
    border: "none",
    color: "#fff",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
  },

  mockFooter: {
    padding: 12,
    textAlign: "center",
    fontSize: 11,
    color: "rgba(255,255,255,0.50)",
    background: "rgba(0,0,0,0.20)",
  },

  swatchCard: {
    padding: 20,
    background: "rgba(15,23,42,0.85)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
  },

  swatchTitle: {
    fontSize: 16,
    fontWeight: 900,
    marginBottom: 16,
  },

  swatches: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },

  swatch: {
    textAlign: "center",
  },

  swatchBox: {
    height: 80,
    borderRadius: 12,
    marginBottom: 8,
    border: "1px solid rgba(255,255,255,0.15)",
  },

  swatchLabel: {
    fontSize: 12,
    fontWeight: 900,
    color: "rgba(255,255,255,0.70)",
    marginBottom: 4,
  },

  swatchValue: {
    fontSize: 13,
    fontWeight: 800,
    color: "#fff",
    fontFamily: "monospace",
  },
};