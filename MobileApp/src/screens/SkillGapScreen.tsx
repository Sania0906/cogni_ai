import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import { Target, Flame, TrendingUp, CheckCircle2, Compass } from "lucide-react-native";

export function SkillGapScreen({ navigation }: any) {
  const [gapData, setGapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGapData = async () => {
    try {
      const data = await api.getSkillGap();
      setGapData(data);
    } catch (e) {
      console.warn("Skill gap load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGapData();
      const interval = setInterval(loadGapData, 10000);
      return () => clearInterval(interval);
    }, [])
  );

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
            loadGapData();
          }}
        />
      }
    >
      <Text style={styles.title}>Skill Gap Analysis</Text>
      <Text style={styles.subtitle}>
        Target Role: {gapData?.targetRole || "Senior Full Stack Architect"}
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <View>
          <View style={styles.matchCard}>
            <Text style={styles.matchLabel}>Target Role Compatibility</Text>
            <Text style={styles.matchVal}>{gapData?.matchPercentage ?? 78}%</Text>
          </View>

          <Text style={[styles.title, { fontSize: 17, marginTop: 16, marginBottom: 12 }]}>
            Competency Breakdown
          </Text>
          {(gapData?.skills || []).map((item: any, i: number) => {
            const gapVal = Number(item.gap) || 0;
            const isDeficit = gapVal < 0 || item.status === "Critical Gap";
            const currentPct = Math.min(100, Math.max(0, item.current || 50));
            const requiredPct = item.required || 80;

            const barColor =
              gapVal >= 0
                ? colors.success
                : gapVal > -20
                ? colors.warning
                : colors.destructive;

            return (
              <View key={i} style={styles.skillCard}>
                <View style={styles.row}>
                  <Text style={styles.skillName}>{item.name}</Text>
                  {isDeficit ? (
                    <Text style={styles.gapDeficit}>-{Math.abs(gapVal)}% Gap</Text>
                  ) : (
                    <Text style={styles.gapSurplus}>
                      {gapVal === 0 ? "Target Met" : `+${Math.abs(gapVal)}% Surplus`}
                    </Text>
                  )}
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${currentPct}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>Current: {currentPct}%</Text>
                  <Text style={styles.metaText}>Required: {requiredPct}%</Text>
                </View>
                {isDeficit && (
                  <Text style={styles.missingHint}>
                    Missing {Math.abs(gapVal)}% skill proficiency
                  </Text>
                )}
              </View>
            );
          })}

          {/* Suggested Bridge Course Action (Matching WebApp) */}
          <View style={styles.bridgeCard}>
            <View style={styles.bridgeHeader}>
              <Compass color={colors.primary} size={22} />
              <Text style={styles.bridgeTitle}>Bridge the Gap</Text>
            </View>
            <Text style={styles.bridgeDesc}>
              To reach 90%+ matching for{" "}
              <Text style={{ fontWeight: "700", color: colors.textPrimary }}>
                {gapData?.targetRole || "your target role"}
              </Text>
              , prioritize studying courses in your missing components.
            </Text>
            <TouchableOpacity
              style={styles.bridgeBtn}
              onPress={() => (navigation as any).navigate("MainTabs", { screen: "Courses" })}
              activeOpacity={0.8}
            >
              <Text style={styles.bridgeBtnText}>Explore Bridge Courses</Text>
            </TouchableOpacity>
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
  subtitle: { color: colors.textSecondary, fontSize: 13, marginBottom: 16, marginTop: 4 },
  matchCard: {
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
  matchLabel: { color: "rgba(255, 255, 255, 0.85)", fontSize: 13, fontWeight: "600", textTransform: "uppercase" },
  matchVal: { color: "#ffffff", fontSize: 36, fontWeight: "bold", marginTop: 4 },
  skillCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, alignItems: "center" },
  skillName: { color: colors.textPrimary, fontSize: 15, fontWeight: "600", flex: 1 },
  gapDeficit: { color: colors.destructive, fontSize: 12, fontWeight: "bold" },
  gapSurplus: { color: colors.success, fontSize: 12, fontWeight: "bold" },
  barBg: { height: 8, backgroundColor: colors.backgroundSecondary, borderRadius: 4, overflow: "hidden", marginBottom: 6 },
  barFill: { height: "100%", borderRadius: 4 },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaText: { color: colors.textSecondary, fontSize: 12 },
  missingHint: { color: colors.destructive, fontSize: 11, fontWeight: "500", marginTop: 4 },
  bridgeCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bridgeHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  bridgeTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "bold", marginLeft: 6 },
  bridgeDesc: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  bridgeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  bridgeBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "bold" },
});
