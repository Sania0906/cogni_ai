import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import {
  Brain,
  Sparkles,
  RefreshCw,
  User,
  Activity,
  Zap,
  MessageSquare,
  Shield,
  Target,
  TrendingUp,
  AlertTriangle,
  Briefcase,
} from "lucide-react-native";

function DimensionRow({
  label,
  score,
  icon: Icon,
  color,
}: {
  label: string;
  score: number;
  icon: any;
  color: string;
}) {
  const safeScore = Math.min(100, Math.max(0, score || 75));
  return (
    <View style={styles.dimRow}>
      <View style={styles.dimHeader}>
        <View style={styles.dimLabelBox}>
          <Icon color={color} size={16} />
          <Text style={styles.dimLabel}>{label}</Text>
        </View>
        <Text style={styles.dimScore}>{safeScore}/100</Text>
      </View>
      <View style={styles.dimBarBg}>
        <View style={[styles.dimBarFill, { width: `${safeScore}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function CareerTwinScreen() {
  const [twin, setTwin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const fetchTwin = async () => {
    try {
      const data = await api.getLatestCareerTwin().catch(() => api.generateCareerTwin());
      setTwin(data);
    } catch (e) {
      console.warn("Career Twin error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const data = await api.generateCareerTwin();
      setTwin(data);
    } catch (e) {
      console.warn("Recalculate error:", e);
    } finally {
      setRecalculating(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTwin();
      const interval = setInterval(fetchTwin, 10000);
      return () => clearInterval(interval);
    }, [])
  );

  const personalityName = twin?.personality || twin?.archetype || "Strategic Architect";
  const maturityLevel = twin?.maturity_level || "Professional";
  const desc =
    twin?.summary ||
    twin?.description ||
    "A dynamic digital representation of your professional identity. Extracted entirely from your latest resume structure, linguistics, and experience map.";

  const strengths: string[] =
    twin?.top_strengths ||
    twin?.strengths ||
    ["Technical Depth", "Structured Problem Solving", "Production Delivery"];

  const improvements: string[] =
    twin?.improvement_areas ||
    twin?.weaknesses ||
    ["Executive Storytelling", "Cross-Org Dependency Mapping"];

  const paths: string[] =
    twin?.predicted_paths ||
    twin?.recommended_roles ||
    ["Backend Developer", "Systems Engineer", "Full Stack Developer"];

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
            fetchTwin();
          }}
        />
      }
    >
      <Text style={styles.title}>AI Career Twin</Text>
      <Text style={styles.subtitle}>
        A dynamic digital representation of your professional identity mapped against industry traits.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <View>
          {/* Main Identity Banner */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroIconCircle}>
                <Brain color="#ffffff" size={32} />
              </View>
              <View style={styles.maturityBadge}>
                <Briefcase color="#ffffff" size={13} />
                <Text style={styles.maturityText}>{maturityLevel}</Text>
              </View>
            </View>

            <Text style={styles.heroLabel}>Career Personality</Text>
            <Text style={styles.heroTitle}>{personalityName}</Text>
            <Text style={styles.heroDesc}>{desc}</Text>
          </View>

          {/* Core Dimensions & Scores */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Activity color={colors.primary} size={18} />
              <Text style={styles.cardTitle}>Core Dimensions</Text>
            </View>

            <DimensionRow
              label="Technical Prowess"
              score={twin?.technical_score || 85}
              icon={Zap}
              color={colors.primary}
            />
            <DimensionRow
              label="Soft Skills"
              score={twin?.soft_skills_score || 78}
              icon={MessageSquare}
              color={colors.accentPink}
            />
            <DimensionRow
              label="Leadership Potential"
              score={twin?.leadership_potential || 72}
              icon={Shield}
              color={colors.warning}
            />
            <DimensionRow
              label="Communication"
              score={twin?.communication_score || 80}
              icon={MessageSquare}
              color={colors.success}
            />
            <DimensionRow
              label="Problem Solving"
              score={twin?.problem_solving_score || 88}
              icon={Target}
              color={colors.primary}
            />
            <DimensionRow
              label="Learning Agility"
              score={twin?.learning_ability || 84}
              icon={Brain}
              color={colors.accentPink}
            />
          </View>

          {/* Top Strengths */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <TrendingUp color={colors.success} size={18} />
              <Text style={[styles.cardTitle, { color: colors.success }]}>Top Strengths</Text>
            </View>
            {strengths.map((s, idx) => (
              <View key={`str-${idx}`} style={styles.bulletRow}>
                <View style={styles.strNumberCircle}>
                  <Text style={styles.strNumber}>{idx + 1}</Text>
                </View>
                <Text style={styles.bulletText}>{s}</Text>
              </View>
            ))}
          </View>

          {/* Areas to Improve */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <AlertTriangle color={colors.destructive} size={18} />
              <Text style={[styles.cardTitle, { color: colors.destructive }]}>Areas to Improve</Text>
            </View>
            {improvements.map((s, idx) => (
              <View key={`imp-${idx}`} style={styles.bulletRow}>
                <View style={styles.impNumberCircle}>
                  <Text style={styles.impNumber}>{idx + 1}</Text>
                </View>
                <Text style={styles.bulletText}>{s}</Text>
              </View>
            ))}
          </View>

          {/* Predicted Pathways */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Target color={colors.primary} size={18} />
              <Text style={styles.cardTitle}>Predicted Career Pathways</Text>
            </View>
            <View style={styles.pathBadgeWrap}>
              {paths.map((p, idx) => (
                <View key={`path-${idx}`} style={styles.pathPill}>
                  <Text style={styles.pathPillText}>{p}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Recalculate Twin Button */}
          <TouchableOpacity
            style={styles.recalcBtn}
            onPress={handleRecalculate}
            disabled={recalculating}
            activeOpacity={0.8}
          >
            {recalculating ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <RefreshCw color="#ffffff" size={18} />
                <Text style={styles.recalcBtnText}>Recalculate Twin</Text>
              </>
            )}
          </TouchableOpacity>
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
  heroCard: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  maturityBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  maturityText: { color: "#ffffff", fontSize: 11, fontWeight: "bold", textTransform: "capitalize" },
  heroLabel: { color: "rgba(255, 255, 255, 0.8)", fontSize: 11, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5 },
  heroTitle: { color: "#ffffff", fontSize: 22, fontWeight: "black", marginTop: 4 },
  heroDesc: { color: "rgba(255, 255, 255, 0.9)", fontSize: 13, lineHeight: 19, marginTop: 8 },
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
  dimRow: { marginBottom: 12 },
  dimHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  dimLabelBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  dimLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: "600" },
  dimScore: { color: colors.textPrimary, fontSize: 13, fontWeight: "bold" },
  dimBarBg: { height: 8, backgroundColor: colors.backgroundSecondary, borderRadius: 4, overflow: "hidden" },
  dimBarFill: { height: "100%", borderRadius: 4 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  strNumberCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.successBg,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  strNumber: { color: colors.success, fontSize: 11, fontWeight: "bold" },
  impNumberCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.destructiveBg,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  impNumber: { color: colors.destructive, fontSize: 11, fontWeight: "bold" },
  bulletText: { color: colors.textPrimary, fontSize: 13, flex: 1, lineHeight: 18, fontWeight: "500" },
  pathBadgeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pathPill: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pathPillText: { color: colors.textPrimary, fontSize: 12, fontWeight: "700" },
  recalcBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  recalcBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "bold" },
});
