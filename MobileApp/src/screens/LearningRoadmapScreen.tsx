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
          onRefresh={() => {
            setRefreshing(true);
            loadRoadmap();
          }}
        />
      }
    >
      <Text style={styles.title}>Personalized Learning Roadmap</Text>
      <Text style={styles.subtitle}>
        {roadmap?.title || roadmap?.goal || "AI-Guided Path to Technical Mastery"}
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
      ) : milestones.length > 0 ? (
        <View style={{ marginTop: 10 }}>
          {milestones.map((m: any, index: number) => {
            const isDone = m.completed || m.status === "completed";
            const mId = m.id || String(index + 1);

            return (
              <TouchableOpacity
                key={mId}
                style={[styles.milestoneCard, isDone && styles.milestoneDone]}
                onPress={() => handleToggleMilestone(mId, m.status)}
                activeOpacity={0.8}
              >
                <View style={styles.row}>
                  {isDone ? (
                    <CheckCircle2 color="#10b981" size={24} />
                  ) : (
                    <Circle color="#64748b" size={24} />
                  )}
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={[styles.mTitle, isDone && styles.mTitleDone]}>
                      {m.title || m.label || `Phase ${index + 1}`}
                    </Text>
                    <Text style={styles.mDesc}>
                      {m.description || "Master core frameworks, system concepts, and production architectures."}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Sparkles color="#6366f1" size={42} />
          <Text style={styles.emptyTitle}>Generate Your Custom Learning Roadmap</Text>
          <Text style={styles.emptyDesc}>
            CognifyAI analyzes your resume and current skills to construct a phased career path.
          </Text>

          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>Target Role / Dream Job</Text>
            <TextInput
              style={styles.input}
              value={targetRole}
              onChangeText={setTargetRole}
              placeholder="e.g. Senior Machine Learning Engineer"
              placeholderTextColor="#64748b"
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
              <Text style={styles.generateBtnText}>Generate AI Roadmap</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16" },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: "#ffffff", fontSize: 24, fontWeight: "bold", marginTop: 10 },
  subtitle: { color: "#94a3b8", fontSize: 14, marginBottom: 16, marginTop: 4 },
  milestoneCard: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  milestoneDone: { borderColor: "#059669", backgroundColor: "#064e3b22" },
  row: { flexDirection: "row", alignItems: "flex-start" },
  mTitle: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  mTitleDone: { color: "#34d399", textDecorationLine: "line-through" },
  mDesc: { color: "#cbd5e1", fontSize: 13, marginTop: 6, lineHeight: 18 },
  emptyContainer: {
    backgroundColor: "#1e1b4b",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#3730a3",
  },
  emptyTitle: { color: "#ffffff", fontSize: 18, fontWeight: "bold", marginTop: 14, textAlign: "center" },
  emptyDesc: { color: "#c7d2fe", fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 18 },
  inputBox: { width: "100%", marginTop: 20 },
  inputLabel: { color: "#cbd5e1", fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  generateBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 14,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 16,
  },
  generateBtnText: { color: "#ffffff", fontWeight: "bold", fontSize: 15 },
});
