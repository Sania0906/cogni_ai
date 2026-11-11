import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { api } from "../services/api";
import { Target, Flame, TrendingUp, CheckCircle2 } from "lucide-react-native";

export function SkillGapScreen() {
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

  useEffect(() => {
    loadGapData();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
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
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
      ) : (
        <View>
          <View style={styles.matchCard}>
            <Text style={styles.matchLabel}>Target Role Compatibility</Text>
            <Text style={styles.matchVal}>{gapData?.matchPercentage ?? 78}%</Text>
          </View>

          <Text style={[styles.title, { fontSize: 18, marginTop: 16 }]}>Competency Breakdown</Text>
          {(gapData?.skills || [
            { name: "TypeScript / Node.js", current: 85, required: 90, gap: 5 },
            { name: "Distributed Systems & Cloud", current: 70, required: 85, gap: 15 },
            { name: "Machine Learning / PyTorch", current: 65, required: 80, gap: 15 },
            { name: "PostgreSQL & Supabase", current: 90, required: 85, gap: -5 },
          ]).map((item: any, i: number) => {
            const gapVal = Number(item.gap) || 0;
            const isDeficit = gapVal > 0;
            const currentPct = Math.min(100, Math.max(0, item.current || 50));

            return (
              <View key={i} style={styles.skillCard}>
                <View style={styles.row}>
                  <Text style={styles.skillName}>{item.name}</Text>
                  {isDeficit ? (
                    <Text style={styles.gapDeficit}>-{gapVal}% Gap</Text>
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
                        backgroundColor: isDeficit ? "#6366f1" : "#10b981",
                      },
                    ]}
                  />
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>Current: {currentPct}%</Text>
                  <Text style={styles.metaText}>Required: {item.required || 80}%</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16" },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: "#ffffff", fontSize: 24, fontWeight: "bold", marginTop: 10 },
  subtitle: { color: "#94a3b8", fontSize: 14, marginBottom: 20, marginTop: 4 },
  matchCard: {
    backgroundColor: "#1e1b4b",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#3730a3",
  },
  matchLabel: { color: "#a5b4fc", fontSize: 14 },
  matchVal: { color: "#ffffff", fontSize: 36, fontWeight: "bold", marginTop: 4 },
  skillCard: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, alignItems: "center" },
  skillName: { color: "#ffffff", fontSize: 16, fontWeight: "600", flex: 1 },
  gapDeficit: { color: "#ef4444", fontSize: 12, fontWeight: "bold" },
  gapSurplus: { color: "#10b981", fontSize: 12, fontWeight: "bold" },
  barBg: { height: 8, backgroundColor: "#334155", borderRadius: 4, overflow: "hidden", marginBottom: 6 },
  barFill: { height: "100%", borderRadius: 4 },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaText: { color: "#64748b", fontSize: 12 },
});
