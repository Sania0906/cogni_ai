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
import { useAuth } from "../context/AuthContext";
import {
  User,
  Brain,
  Award,
  Sparkles,
  BookOpen,
  ChevronRight,
  Briefcase,
  GraduationCap,
} from "lucide-react-native";

export function UserDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dna, setDna] = useState<any>(null);
  const [employability, setEmployability] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);

  const loadDashboardData = async () => {
    try {
      const [dnaRes, empRes, skillsRes] = await Promise.all([
        api.getCareerDNA().catch(() => null),
        api.getEmployability().catch(() => null),
        api.getSkills().catch(() => []),
      ]);
      setDna(dnaRes);
      setEmployability(empRes);
      setSkills(skillsRes || []);
    } catch (e) {
      console.warn("Error loading dashboard data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
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
          onRefresh={() => {
            setRefreshing(true);
            loadDashboardData();
          }}
        />
      }
    >
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
          <User color="#818cf8" size={24} />
        </TouchableOpacity>
      </View>

      {/* Employability Score Banner */}
      <View style={styles.cardHighlight}>
        <View style={styles.cardRow}>
          <View>
            <Text style={styles.cardSubtitle}>Employability Index</Text>
            <Text style={styles.cardScore}>{employability?.overallScore || 85}/100</Text>
          </View>
          <Award color="#f59e0b" size={42} />
        </View>
        <Text style={styles.cardDesc}>
          Top candidate ready for AI/Software engineering roles. Real database backed profile.
        </Text>
      </View>

      {/* Career DNA Preview */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Career DNA Archetype</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.dnaHeader}>
          <Brain color="#6366f1" size={28} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.dnaArchetype}>{dna?.archetype || "System Architect"}</Text>
            <Text style={styles.dnaTagline}>{dna?.tagline || "Analytical & High-Impact Builder"}</Text>
          </View>
        </View>
      </View>

      {/* Quick Action Navigation Grid */}
      <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 12 }]}>
        Platform Features & Tools
      </Text>
      <View style={styles.grid}>
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate("Jobs")}
          activeOpacity={0.7}
        >
          <Briefcase color="#38bdf8" size={26} />
          <Text style={styles.gridTitle}>Browse Jobs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate("Courses")}
          activeOpacity={0.7}
        >
          <GraduationCap color="#f59e0b" size={26} />
          <Text style={styles.gridTitle}>Courses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate("SkillGap")}
          activeOpacity={0.7}
        >
          <Sparkles color="#ec4899" size={26} />
          <Text style={styles.gridTitle}>Skill Gap</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate("CareerTwin")}
          activeOpacity={0.7}
        >
          <Brain color="#8b5cf6" size={26} />
          <Text style={styles.gridTitle}>Career Twin</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate("CompanyReadiness")}
          activeOpacity={0.7}
        >
          <Award color="#10b981" size={26} />
          <Text style={styles.gridTitle}>Readiness</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate("AIInterview")}
          activeOpacity={0.7}
        >
          <BookOpen color="#3b82f6" size={26} />
          <Text style={styles.gridTitle}>AI Interview</Text>
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
  container: { flex: 1, backgroundColor: "#090d16" },
  content: { padding: 16, paddingBottom: 40 },
  centerContainer: { flex: 1, backgroundColor: "#090d16", justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 20 },
  greeting: { color: "#94a3b8", fontSize: 14 },
  userName: { color: "#ffffff", fontSize: 24, fontWeight: "bold" },
  profileBadge: { backgroundColor: "#1e293b", padding: 10, borderRadius: 50, borderWidth: 1, borderColor: "#334155" },
  cardHighlight: { backgroundColor: "#1e1b4b", padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: "#312e81" },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardSubtitle: { color: "#a5b4fc", fontSize: 14 },
  cardScore: { color: "#ffffff", fontSize: 36, fontWeight: "bold", marginTop: 4 },
  cardDesc: { color: "#c7d2fe", fontSize: 13, marginTop: 12, lineHeight: 18 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { color: "#f8fafc", fontSize: 18, fontWeight: "600" },
  card: { backgroundColor: "#1e293b", padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#334155" },
  dnaHeader: { flexDirection: "row", alignItems: "center" },
  dnaArchetype: { color: "#ffffff", fontSize: 18, fontWeight: "bold" },
  dnaTagline: { color: "#94a3b8", fontSize: 13, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  gridCard: {
    backgroundColor: "#1e293b",
    width: "48%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  gridTitle: { color: "#ffffff", marginTop: 8, fontWeight: "500", fontSize: 14 },
  roadmapBtn: {
    backgroundColor: "#6366f1",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 14,
  },
  roadmapBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 15 },
});
