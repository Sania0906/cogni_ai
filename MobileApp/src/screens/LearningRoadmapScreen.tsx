import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import { CheckCircle2, Circle, Sparkles, MapPin } from "lucide-react-native";

export function LearningRoadmapScreen() {
  const [roadmap, setRoadmap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [targetRole, setTargetRole] = useState("Full Stack AI Architect");

  const loadRoadmap = async () => {
    try {
      const data = await api.getLatestRoadmap();
      setRoadmap(data);
    } catch (e: any) {
      // 404 means user hasn't generated one yet
      setRoadmap(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRoadmap();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await api.generateRoadmap(targetRole || "Software Engineer", "TechCorp");
      setRoadmap(data);
      Alert.alert("Roadmap Created!", "Your personalized learning roadmap is ready.");
    } catch (e: any) {
      Alert.alert("Notice", e?.response?.data?.message || "Could not generate roadmap.");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleMilestone = async (milestoneId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "in-progress" : "completed";
    try {
      await api.updateMilestoneStatus(milestoneId, nextStatus, roadmap.id);
      loadRoadmap();
    } catch (e) {
      console.warn("Milestone status update error:", e);
    }
  };

  const milestones = roadmap?.milestones || roadmap?.nodes || [];

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
            loadRoadmap();
          }}
        />
      }
    >
      <Text style={styles.title}>Personalized Learning Roadmap</Text>
      <Text style={styles.subtitle}>
        Milestone-driven path tailored to your verified technical gaps
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : roadmap && milestones.length > 0 ? (
        <View>
          <View style={styles.roadmapHeaderCard}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MapPin color={colors.primary} size={20} />
              <Text style={styles.roadmapRole}>{roadmap.role || targetRole}</Text>
            </View>
            <Text style={styles.roadmapSub}>
              {roadmap.company ? `Targeting ${roadmap.company} • ` : ""}
              {milestones.length} milestones identified
            </Text>
          </View>

          {milestones.map((m: any, i: number) => {
            const isDone = m.status === "completed";
            return (
              <TouchableOpacity
                key={m.id || i}
                style={[styles.milestoneCard, isDone && styles.milestoneDone]}
                onPress={() => m.id && handleToggleMilestone(m.id, m.status)}
                activeOpacity={0.7}
              >
                <View style={styles.row}>
                  {isDone ? (
                    <CheckCircle2 color={colors.success} size={22} />
                  ) : (
                    <Circle color={colors.textMuted} size={22} />
                  )}
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={[styles.mTitle, isDone && styles.mTitleDone]}>
                      {m.title || m.label || `Milestone ${i + 1}`}
                    </Text>
                    <Text style={styles.mDesc}>{m.description || m.desc}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Sparkles color={colors.primary} size={36} />
          <Text style={styles.emptyTitle}>Generate Your Custom Career Roadmap</Text>
          <Text style={styles.emptyDesc}>
            AI builds a step-by-step milestone schedule based on your target role and real-world tech requirements.
          </Text>

          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>Target Role</Text>
            <TextInput
              style={styles.input}
              value={targetRole}
              onChangeText={setTargetRole}
              placeholder="e.g. Senior Machine Learning Engineer"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={styles.generateBtn}
            onPress={handleGenerate}
            disabled={generating}
            activeOpacity={0.8}
          >
            {generating ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.generateBtnText}>Generate Learning Roadmap</Text>
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
  subtitle: { color: colors.textSecondary, fontSize: 13, marginBottom: 16, marginTop: 4 },
  roadmapHeaderCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  roadmapRole: { color: colors.textPrimary, fontSize: 17, fontWeight: "bold", marginLeft: 8 },
  roadmapSub: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  milestoneCard: {
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
  milestoneDone: {
    borderColor: colors.successBorder,
    backgroundColor: colors.successBg,
  },
  row: { flexDirection: "row", alignItems: "flex-start" },
  mTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "700" },
  mTitleDone: { color: colors.success, textDecorationLine: "line-through" },
  mDesc: { color: colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  emptyContainer: {
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "bold", marginTop: 14, textAlign: "center" },
  emptyDesc: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 19 },
  inputBox: { width: "100%", marginTop: 20 },
  inputLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    fontSize: 14,
  },
  generateBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginTop: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  generateBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
});
