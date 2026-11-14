import React, { useState, useEffect } from "react";
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
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles,
  ArrowRight,
  Briefcase,
} from "lucide-react-native";

export function CareerPathsScreen({ navigation }: any) {
  const [paths, setPaths] = useState<any[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCareerPaths = async () => {
    try {
      const data = await api.getCareerPaths();
      const list = Array.isArray(data) ? data : data?.paths || [];
      setPaths(list);
    } catch (e) {
      console.warn("Failed to load career paths:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCareerPaths();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const activePath = paths[selectedIdx] || null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadCareerPaths();
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <Text style={styles.title}>AI Career Paths</Text>
      <Text style={styles.subtitle}>
        Personalized AI recommendations and skill alignments based on your verified profile.
      </Text>

      {paths.length === 0 ? (
        <View style={styles.emptyBox}>
          <Briefcase color={colors.textMuted} size={40} />
          <Text style={styles.emptyTitle}>No Career Paths Available</Text>
          <Text style={styles.emptySub}>Upload a resume or complete skill assessments to generate tailored career trajectories.</Text>
        </View>
      ) : (
        <>
          {/* Horizontal Track Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.trackScroll}
            contentContainerStyle={styles.trackContent}
          >
            {paths.map((p, idx) => {
              const isSelected = idx === selectedIdx;
              return (
                <TouchableOpacity
                  key={`track-${idx}`}
                  style={[styles.trackTab, isSelected && styles.trackTabActive]}
                  onPress={() => setSelectedIdx(idx)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.trackTabText,
                      isSelected && styles.trackTabTextActive,
                    ]}
                  >
                    {p.role} ({p.matchPercentage}%)
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {activePath && (
            <>
              {/* Highlight Banner */}
              <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <Text style={styles.heroRole}>{activePath.role}</Text>
                  <View style={styles.matchPill}>
                    <TrendingUp color="#ffffff" size={14} />
                    <Text style={styles.matchPillText}>{activePath.matchPercentage}% Match</Text>
                  </View>
                </View>
                <Text style={styles.heroDesc}>
                  Calculated based on your verified skills, academic history, assessment scores, and resume trajectory.
                </Text>
              </View>

              {/* Salary & Timeline Row */}
              <View style={styles.metricRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Avg Market Salary</Text>
                  <Text style={styles.metricValue}>{activePath.salaryRange || "$95,000 - $140,000"}</Text>
                  <Text style={styles.metricNote}>Estimated annual base</Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Target Timeline</Text>
                  <Text style={styles.metricValue}>
                    {activePath.matchPercentage >= 80
                      ? "Immediate Fit"
                      : activePath.matchPercentage >= 65
                      ? "6-12 Months"
                      : "1-2 Years"}
                  </Text>
                  <Text style={styles.metricNote}>Based on current skill gap</Text>
                </View>
              </View>

              {/* Core Required Skills */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Core Required Skills</Text>
                <Text style={styles.cardSub}>
                  Compare your verified competencies against industry hiring benchmarks
                </Text>

                <View style={styles.skillsWrap}>
                  {(activePath.requiredSkills || []).map((skill: string, sIdx: number) => {
                    const isMissing = (activePath.missingSkills || []).includes(skill);
                    return (
                      <View
                        key={`req-sk-${sIdx}`}
                        style={[styles.skillBadge, isMissing ? styles.skillMissing : styles.skillOwned]}
                      >
                        {isMissing ? (
                          <XCircle color={colors.destructive} size={14} />
                        ) : (
                          <CheckCircle color={colors.success} size={14} />
                        )}
                        <Text
                          style={[
                            styles.skillBadgeText,
                            isMissing ? styles.skillMissingText : styles.skillOwnedText,
                          ]}
                        >
                          {skill}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Action Navigation */}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate("SkillGap")}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnText}>Analyze Complete Skill Gap</Text>
                <ArrowRight color="#ffffff" size={18} />
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "bold", marginTop: 6 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginBottom: 18, marginTop: 4, lineHeight: 18 },
  emptyBox: {
    backgroundColor: colors.card,
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "bold", marginTop: 12 },
  emptySub: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 6 },
  trackScroll: { marginBottom: 18, marginHorizontal: -16 },
  trackContent: { paddingHorizontal: 16 },
  trackTab: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  trackTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  trackTabText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  trackTabTextActive: { color: "#ffffff", fontWeight: "bold" },
  heroCard: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 18,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  heroHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroRole: { color: "#ffffff", fontSize: 20, fontWeight: "bold", flex: 1 },
  matchPill: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  matchPillText: { color: "#ffffff", fontSize: 12, fontWeight: "bold" },
  heroDesc: { color: "rgba(255, 255, 255, 0.9)", fontSize: 12, marginTop: 10, lineHeight: 18 },
  metricRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  metricCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  metricLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  metricValue: { color: colors.textPrimary, fontSize: 16, fontWeight: "bold", marginTop: 4 },
  metricNote: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "bold" },
  cardSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2, marginBottom: 14 },
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  skillOwned: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  skillMissing: {
    backgroundColor: colors.destructiveBg,
    borderColor: colors.destructiveBorder,
  },
  skillBadgeText: { fontSize: 12, fontWeight: "600", marginLeft: 6 },
  skillOwnedText: { color: colors.success },
  skillMissingText: { color: colors.destructive },
  actionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    marginTop: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnText: { color: "#ffffff", fontWeight: "bold", fontSize: 15 },
});
