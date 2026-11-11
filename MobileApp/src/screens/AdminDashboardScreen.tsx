import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Shield, Users, Briefcase, BookOpen, CheckCircle, LogOut, Activity } from "lucide-react-native";

export function AdminDashboardScreen() {
  const { user, logout } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [adminRes, platformRes] = await Promise.all([
        api.getAdminAnalytics().catch(() => null),
        api.getPlatformAnalytics().catch(() => null),
      ]);
      setAnalytics({
        ...(platformRes || {}),
        ...(adminRes?.data || adminRes || {}),
      });
    } catch (e) {
      console.warn("Analytics load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = () => {
    Alert.alert("Admin Logout", "Sign out of administrative console?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  };

  const totalUsers = analytics?.totalUsers ?? analytics?.total_users ?? 0;
  const totalJobs = analytics?.totalJobs ?? analytics?.total_jobs ?? 0;
  const totalCourses = analytics?.totalCourses ?? analytics?.total_courses ?? 0;
  const healthLabel = analytics?.healthScore ?? (analytics?.mlEngineOnline ? "100%" : "Degraded");
  const mlStatusText = analytics?.subsystems?.mlEngine ?? (analytics?.mlEngineOnline ? "PORT 8000" : "FALLBACK");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
        />
      }
    >
      <View style={styles.topBar}>
        <View>
          <Text style={styles.headerTitle}>System Admin Console</Text>
          <Text style={styles.subTitle}>Signed in as {user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color="#ef4444" size={20} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
      ) : (
        <View style={{ marginTop: 16 }}>
          {/* Real Database KPI Metrics */}
          <Text style={styles.sectionTitle}>Database & Platform Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Users color="#6366f1" size={24} />
              <Text style={styles.statNumber}>{totalUsers}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>

            <View style={styles.statCard}>
              <Briefcase color="#10b981" size={24} />
              <Text style={styles.statNumber}>{totalJobs}</Text>
              <Text style={styles.statLabel}>Active Jobs</Text>
            </View>

            <View style={styles.statCard}>
              <BookOpen color="#f59e0b" size={24} />
              <Text style={styles.statNumber}>{totalCourses}</Text>
              <Text style={styles.statLabel}>Courses</Text>
            </View>

            <View style={styles.statCard}>
              <Activity color="#ec4899" size={24} />
              <Text style={styles.statNumber}>{healthLabel}</Text>
              <Text style={styles.statLabel}>System Health</Text>
            </View>
          </View>

          {/* Subsystem Health Status */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Subsystems Status</Text>
          <View style={styles.systemBox}>
            <View style={styles.sysRow}>
              <Text style={styles.sysName}>Supabase PostgreSQL Database</Text>
              <View style={styles.healthyBadge}>
                <CheckCircle color="#10b981" size={14} />
                <Text style={styles.healthyText}>{analytics?.subsystems?.database || "ONLINE"}</Text>
              </View>
            </View>

            <View style={styles.sysRow}>
              <Text style={styles.sysName}>Express Unified REST API</Text>
              <View style={styles.healthyBadge}>
                <CheckCircle color="#10b981" size={14} />
                <Text style={styles.healthyText}>{analytics?.subsystems?.backend || "PORT 5000"}</Text>
              </View>
            </View>

            <View style={styles.sysRow}>
              <Text style={styles.sysName}>FastAPI Python ML Inference Engine</Text>
              <View style={styles.healthyBadge}>
                <CheckCircle color="#10b981" size={14} />
                <Text style={styles.healthyText}>{mlStatusText}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16" },
  content: { padding: 16, paddingBottom: 40 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  headerTitle: { color: "#ffffff", fontSize: 24, fontWeight: "bold" },
  subTitle: { color: "#94a3b8", fontSize: 13, marginTop: 2 },
  logoutBtn: { backgroundColor: "#1e293b", padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#334155" },
  sectionTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "600", marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  statCard: {
    backgroundColor: "#1e293b",
    width: "48%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  statNumber: { color: "#ffffff", fontSize: 26, fontWeight: "bold", marginTop: 8 },
  statLabel: { color: "#94a3b8", fontSize: 12, marginTop: 4 },
  systemBox: { backgroundColor: "#1e293b", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#334155" },
  sysRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#334155" },
  sysName: { color: "#e2e8f0", fontSize: 13, fontWeight: "500", flex: 1 },
  healthyBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#065f46", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  healthyText: { color: "#34d399", fontSize: 11, fontWeight: "bold", marginLeft: 4 },
});
