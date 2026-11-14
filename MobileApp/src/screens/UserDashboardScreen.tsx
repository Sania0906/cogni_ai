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
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import {
  User,
  Brain,
  Award,
  Sparkles,
  BookOpen,
  ChevronRight,
  Briefcase,
  GraduationCap,
  FileText,
  TrendingUp,
} from "lucide-react-native";

export function UserDashboardScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dna, setDna] = useState<any>(null);
  const [employability, setEmployability] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [resumeData, setResumeData] = useState<any>(null);

  const loadDashboardData = async () => {
    try {
      const [freshUser, dnaRes, empRes, skillsRes, atsRes, profileRes] = await Promise.all([
        refreshUser().catch(() => null),
        api.getCareerDNA().catch(() => null),
        api.getEmployability().catch(() => null),
        api.getSkills().catch(() => []),
        api.getLatestAtsReport().catch(() => null),
        api.getProfile().catch(() => null),
      ]);
      setDna(dnaRes);
      setEmployability(empRes);
      setSkills(skillsRes || []);

      const activeAts = atsRes || profileRes?.resumeDetails || null;
      setResumeData(activeAts);
    } catch (e) {
      console.warn("Error loading dashboard data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
      const interval = setInterval(loadDashboardData, 10000);
      return () => clearInterval(interval);
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
            loadDashboardData();
          }}
        />
      }
    >
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || "Member"}</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBadge}
          onPress={() => navigation.navigate("Profile")}
          activeOpacity={0.7}
        >
          <User color={colors.primary} size={22} />
        </TouchableOpacity>
      </View>

      {/* Ask AI Assistant Card (Matching Web Home) */}
      <TouchableOpacity
        style={styles.aiAssistantCard}
        onPress={() => navigation.navigate("AIAssistant")}
        activeOpacity={0.85}
      >
        <View style={styles.aiAssistantContent}>
          <View style={styles.aiAssistantIconBox}>
            <Sparkles color="#ffffff" size={20} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.aiAssistantTitle}>Ask AI Assistant</Text>
            <Text style={styles.aiAssistantSubtitle}>
              Get guidance on careers, resumes & skill gaps
            </Text>
          </View>
        </View>
        <ChevronRight color="rgba(255, 255, 255, 0.85)" size={18} />
      </TouchableOpacity>

      {/* Employability Score Hero Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.cardRow}>
          <View>
            <Text style={styles.heroSubtitle}>Employability Index</Text>
            <Text style={styles.heroScore}>{employability?.overallScore || 85}/100</Text>
          </View>
          <View style={styles.heroIconBox}>
            <Award color="#ffffff" size={32} />
          </View>
        </View>
        <Text style={styles.heroDesc}>
          Top candidate ready for software and AI engineering roles. Backed by live platform analytics.
        </Text>
      </View>

      {/* ATS Resume Status Card */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View>
            <Text style={styles.cardSubtitle}>AI Resume ATS Score</Text>
            <Text style={styles.cardScore}>
              {resumeData?.score || resumeData?.ats_score
                ? `${resumeData.score || resumeData.ats_score}%`
                : "Not Scanned"}
            </Text>
          </View>
          <View style={[styles.iconPill, { backgroundColor: "rgba(99, 102, 241, 0.12)" }]}>
            <FileText color={colors.primary} size={24} />
          </View>
        </View>
        <Text style={styles.cardDesc}>
          {resumeData?.target_role || resumeData?.predicted_role
            ? `Target role: ${resumeData.target_role || resumeData.predicted_role}. Matched against live industry benchmarks.`
            : "Upload or update your resume to run AI ATS scoring and job matching."}
        </Text>
      </View>

      {/* Career DNA Preview */}
      <View style={styles.card}>
        <View style={styles.dnaHeader}>
          <View style={[styles.iconPill, { backgroundColor: "rgba(139, 92, 246, 0.12)" }]}>
            <Brain color="#8b5cf6" size={24} />
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.dnaLabel}>Career DNA Archetype</Text>
            <Text style={styles.dnaArchetype}>{dna?.archetype || "System Architect"}</Text>
            <Text style={styles.dnaTagline}>{dna?.tagline || "Analytical & High-Impact Builder"}</Text>
          </View>
        </View>
      </View>

      {/* Quick Action Navigation Grid */}
      <Text style={styles.sectionTitle}>
        Platform Features & Tools
      </Text>
      <View style={styles.grid}>
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate("CareerPaths")}
          activeOpacity={0.7}
        >
          <View style={[styles.gridIconCircle, { backgroundColor: "rgba(14, 165, 233, 0.1)" }]}>
            <TrendingUp color="#0284c7" size={22} />
          </View>
          <Text style={styles.gridTitle}>Career Paths</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate("Jobs")}
          activeOpacity={0.7}
        >
          <View style={[styles.gridIconCircle, { backgroundColor: "rgba(99, 102, 241, 0.1)" }]}>
            <Briefcase color={colors.primary} size={22} />
          </View>
          <Text style={styles.gridTitle}>Browse Jobs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate("Courses")}
          activeOpacity={0.7}
        >
          <View style={[styles.gridIconCircle, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
            <GraduationCap color="#d97706" size={22} />
          </View>
          <Text style={styles.gridTitle}>Courses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate("SkillGap")}
          activeOpacity={0.7}
        >
          <View style={[styles.gridIconCircle, { backgroundColor: "rgba(236, 72, 153, 0.1)" }]}>
            <Sparkles color="#db2777" size={22} />
          </View>
          <Text style={styles.gridTitle}>Skill Gap</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate("CareerTwin")}
          activeOpacity={0.7}
        >
          <View style={[styles.gridIconCircle, { backgroundColor: "rgba(139, 92, 246, 0.1)" }]}>
            <Brain color="#7c3aed" size={22} />
          </View>
          <Text style={styles.gridTitle}>Career Twin</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate("CompanyReadiness")}
          activeOpacity={0.7}
        >
          <View style={[styles.gridIconCircle, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
            <Award color="#059669" size={22} />
          </View>
          <Text style={styles.gridTitle}>Readiness</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridCard, { width: "100%" }]}
          onPress={() => navigation.navigate("AIInterview")}
          activeOpacity={0.7}
        >
          <View style={[styles.gridIconCircle, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}>
            <BookOpen color="#2563eb" size={22} />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.gridTitle}>AI Mock Interview Simulator</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Practice real-world technical & behavioral questions</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.roadmapBtn}
        onPress={() => navigation.navigate("LearningRoadmap")}
        activeOpacity={0.8}
      >
        <Text style={styles.roadmapBtnText}>View Personalized AI Roadmap</Text>
        <ChevronRight color="#ffffff" size={20} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centerContainer: { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  greeting: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  userName: { color: colors.textPrimary, fontSize: 24, fontWeight: "bold" },
  profileBadge: {
    backgroundColor: colors.card,
    padding: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aiAssistantCard: {
    backgroundColor: "#6366f1",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  aiAssistantContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  aiAssistantIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  aiAssistantTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  aiAssistantSubtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    marginTop: 2,
  },
  heroBanner: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroSubtitle: { color: "rgba(255, 255, 255, 0.85)", fontSize: 13, fontWeight: "600", textTransform: "uppercase" },
  heroScore: { color: "#ffffff", fontSize: 34, fontWeight: "bold", marginTop: 2 },
  heroIconBox: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  heroDesc: { color: "rgba(255, 255, 255, 0.9)", fontSize: 13, marginTop: 12, lineHeight: 18 },
  card: {
    backgroundColor: colors.card,
    padding: 18,
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
  cardSubtitle: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  cardScore: { color: colors.textPrimary, fontSize: 28, fontWeight: "bold", marginTop: 2 },
  cardDesc: { color: colors.textSecondary, fontSize: 13, marginTop: 10, lineHeight: 19 },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  dnaHeader: { flexDirection: "row", alignItems: "center" },
  dnaLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  dnaArchetype: { color: colors.textPrimary, fontSize: 17, fontWeight: "bold", marginTop: 2 },
  dnaTagline: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 12,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  gridCard: {
    backgroundColor: colors.card,
    width: "48%",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  gridIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  gridTitle: { color: colors.textPrimary, marginLeft: 10, fontWeight: "700", fontSize: 13, flexShrink: 1 },
  roadmapBtn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  roadmapBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
});
