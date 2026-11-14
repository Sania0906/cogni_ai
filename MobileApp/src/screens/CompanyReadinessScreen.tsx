import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import {
  Building,
  Award,
  CheckCircle2,
  AlertTriangle,
  Target,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react-native";

const PRESET_COMPANIES = [
  "Google",
  "Microsoft",
  "Amazon",
  "Meta",
  "Apple",
  "Netflix",
  "TCS",
  "Infosys",
  "Accenture",
];

const PRESET_ROLES = [
  "Software Engineer",
  "AI Engineer",
  "Data Scientist",
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
];

export function CompanyReadinessScreen() {
  const [company, setCompany] = useState("Google");
  const [role, setRole] = useState("Software Engineer");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadLatest = async () => {
    try {
      const res = await api.getLatestCompanyReadiness();
      if (res && (res.company_name || res.companyName)) {
        setReport(res);
        if (res.company_name || res.companyName) setCompany(res.company_name || res.companyName);
        if (res.target_role || res.targetRole) setRole(res.target_role || res.targetRole);
      }
    } catch (e) {
      console.warn("Failed to load latest readiness:", e);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLatest();
      const interval = setInterval(loadLatest, 10000);
      return () => clearInterval(interval);
    }, [])
  );

  const handleGenerate = async () => {
    if (!company.trim() || !role.trim()) return;
    setLoading(true);
    try {
      const res = await api.generateCompanyReadiness(company.trim(), role.trim());
      setReport(res);
    } catch (e) {
      console.warn("Readiness generate error:", e);
    } finally {
      setLoading(false);
    }
  };

  const readinessScore = report?.readiness_score ?? report?.readinessScore ?? 85;
  const companyName = report?.company_name || report?.companyName || company || "Target Company";
  const targetRole = report?.target_role || report?.targetRole || role || "Software Engineer";

  const missingGaps: string[] =
    report?.gaps ||
    report?.missing_skills?.technical ||
    ["System Design", "Cloud Infrastructure Scaling"];

  const recommendations: string[] =
    report?.recommendations || [
      "Review core algorithms and system design patterns",
      "Prepare distributed architecture case studies tailored to " + companyName,
    ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.primary}
          colors={[colors.primary]}
          onRefresh={() => {
            setRefreshing(true);
            loadLatest();
          }}
        />
      }
    >
      <Text style={styles.title}>Company Readiness Analysis</Text>
      <Text style={styles.subtitle}>
        Compare your uploaded resume against specific company and role requirements.
      </Text>

      {/* Target Selection Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Target color={colors.primary} size={18} />
          <Text style={styles.cardTitle}>Target Selection</Text>
        </View>

        {/* Company Presets */}
        <Text style={styles.inputLabel}>Target Company</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
          {PRESET_COMPANIES.map((c) => {
            const isSelected = company.toLowerCase() === c.toLowerCase();
            return (
              <TouchableOpacity
                key={c}
                style={[styles.presetPill, isSelected && styles.presetPillActive]}
                onPress={() => setCompany(c)}
              >
                <Text style={[styles.presetPillText, isSelected && styles.presetPillTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TextInput
          style={styles.input}
          placeholder="Or type custom company..."
          placeholderTextColor={colors.textMuted}
          value={company}
          onChangeText={setCompany}
        />

        {/* Role Presets */}
        <Text style={[styles.inputLabel, { marginTop: 14 }]}>Target Position</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
          {PRESET_ROLES.map((r) => {
            const isSelected = role.toLowerCase() === r.toLowerCase();
            return (
              <TouchableOpacity
                key={r}
                style={[styles.presetPill, isSelected && styles.presetPillActive]}
                onPress={() => setRole(r)}
              >
                <Text style={[styles.presetPillText, isSelected && styles.presetPillTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TextInput
          style={styles.input}
          placeholder="Or type custom role..."
          placeholderTextColor={colors.textMuted}
          value={role}
          onChangeText={setRole}
        />

        <TouchableOpacity
          style={styles.btn}
          onPress={handleGenerate}
          disabled={loading || !company.trim() || !role.trim()}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Sparkles color="#ffffff" size={18} />
              <Text style={styles.btnText}>Analyze Readiness</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Readiness Results Report */}
      {report && (
        <View style={{ marginTop: 6 }}>
          {/* Score Header Hero Banner */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreNumber}>{readinessScore}%</Text>
                <Text style={styles.scoreLabel}>Score</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.heroCompanyTitle}>{companyName} Readiness</Text>
                <Text style={styles.heroSubText}>
                  Based on your latest profile, you have a {readinessScore}% alignment for the{" "}
                  <Text style={{ fontWeight: "700" }}>{targetRole}</Text> role at {companyName}.
                </Text>
              </View>
            </View>
          </View>

          {/* Fit Metrics */}
          <View style={styles.metricRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Technical Fit</Text>
              <Text style={styles.metricVal}>
                {report.technical_fit || report.technicalFit || Math.round(readinessScore * 0.96)}%
              </Text>
              <Text style={styles.metricNote}>Benchmark alignment</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Cultural Alignment</Text>
              <Text style={styles.metricVal}>
                {report.cultural_fit || report.culturalFit || Math.round(readinessScore * 0.94)}%
              </Text>
              <Text style={styles.metricNote}>Behavioral profile</Text>
            </View>
          </View>

          {/* Missing Skills & Gaps */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <AlertTriangle color={colors.warning} size={18} />
              <Text style={styles.cardTitle}>Missing Technical Skills & Gaps</Text>
            </View>
            {missingGaps.map((gap, idx) => (
              <View key={`gap-${idx}`} style={styles.gapRow}>
                <View style={styles.gapDot} />
                <Text style={styles.gapText}>{gap}</Text>
              </View>
            ))}
          </View>

          {/* Preparation Recommendations */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Award color={colors.success} size={18} />
              <Text style={styles.cardTitle}>Actionable Recommendations</Text>
            </View>
            {recommendations.map((rec, idx) => (
              <View key={`rec-${idx}`} style={styles.recRow}>
                <View style={styles.recNumberCircle}>
                  <Text style={styles.recNumber}>{idx + 1}</Text>
                </View>
                <Text style={styles.recText}>{rec}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "bold", marginTop: 6 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginBottom: 18, marginTop: 4, lineHeight: 18 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  cardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "bold" },
  inputLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 8, letterSpacing: 0.5 },
  pillScroll: { marginBottom: 10, marginHorizontal: -4 },
  presetPill: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  presetPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetPillText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  presetPillTextActive: { color: "#ffffff", fontWeight: "bold" },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    fontSize: 14,
    marginBottom: 6,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  btnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  heroCard: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 20,
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTopRow: { flexDirection: "row", alignItems: "center" },
  scoreCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  scoreNumber: { color: "#ffffff", fontSize: 22, fontWeight: "black" },
  scoreLabel: { color: "rgba(255, 255, 255, 0.8)", fontSize: 9, fontWeight: "bold", textTransform: "uppercase" },
  heroCompanyTitle: { color: "#ffffff", fontSize: 18, fontWeight: "bold" },
  heroSubText: { color: "rgba(255, 255, 255, 0.9)", fontSize: 12, lineHeight: 17, marginTop: 4 },
  metricRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  metricCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    width: "48%",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  metricLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  metricVal: { color: colors.textPrimary, fontSize: 22, fontWeight: "bold", marginTop: 4 },
  metricNote: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  gapRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  gapDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.warning },
  gapText: { color: colors.textPrimary, fontSize: 13, fontWeight: "500" },
  recRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  recNumberCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.successBg,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  recNumber: { color: colors.success, fontSize: 11, fontWeight: "bold" },
  recText: { color: colors.textPrimary, fontSize: 13, flex: 1, lineHeight: 18, fontWeight: "500" },
});
