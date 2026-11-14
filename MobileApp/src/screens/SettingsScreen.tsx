import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import { User, LogOut, Bell, Shield, Bookmark, ChevronRight, Award, BookOpen, Target } from "lucide-react-native";
export { ProfileScreen } from "./ProfileScreen";

export function SettingsScreen({ navigation }: any) {
  const { logout, user, refreshUser } = useAuth();
  const [certsCount, setCertsCount] = useState<number>(0);
  const [coursesCount, setCoursesCount] = useState<number>(0);
  const [skillsCount, setSkillsCount] = useState<number>(0);

  const loadSettingsData = async () => {
    try {
      const [freshUser, certs, courses, skills] = await Promise.all([
        refreshUser().catch(() => null),
        api.getCertificates().catch(() => []),
        api.getMyCourses().catch(() => []),
        api.getSkills().catch(() => []),
      ]);
      setCertsCount(Array.isArray(certs) ? certs.length : 0);
      setCoursesCount(Array.isArray(courses) ? courses.length : 0);
      setSkillsCount(Array.isArray(skills) ? skills.length : 0);
    } catch (e) {
      console.warn("Failed to load settings data:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSettingsData();
      const interval = setInterval(loadSettingsData, 10000);
      return () => clearInterval(interval);
    }, [])
  );

  const handleLogout = () => {
    Alert.alert("Confirm Sign Out", "Are you sure you want to log out of CognifyAI?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings & Account</Text>

      {/* Profile Header Card */}
      <TouchableOpacity
        style={styles.profileBox}
        onPress={() => navigation.navigate("Profile")}
        activeOpacity={0.7}
      >
        <View style={styles.avatarCircle}>
          <User color={colors.primary} size={28} />
        </View>
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text style={styles.userName}>{user?.name || "Account User"}</Text>
          <Text style={styles.userEmail}>{user?.email || "user@example.com"}</Text>
          <View style={styles.roleBadgeContainer}>
            <Text style={styles.userRole}>
              Role: <Text style={{ fontWeight: "700" }}>{user?.role || "user"}</Text>
            </Text>
          </View>
        </View>
        <ChevronRight color={colors.textSecondary} size={20} />
      </TouchableOpacity>

      {/* Counts Grid (Certificates, Courses, Skills matching WebApp) */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIconCircle, { backgroundColor: "rgba(59, 130, 246, 0.12)" }]}>
            <Award color="#3b82f6" size={20} />
          </View>
          <Text style={styles.statCount}>{certsCount}</Text>
          <Text style={styles.statLabel}>Certificates</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconCircle, { backgroundColor: "rgba(99, 102, 241, 0.12)" }]}>
            <BookOpen color={colors.primary} size={20} />
          </View>
          <Text style={styles.statCount}>{coursesCount}</Text>
          <Text style={styles.statLabel}>Courses</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconCircle, { backgroundColor: "rgba(236, 72, 153, 0.12)" }]}>
            <Target color="#ec4899" size={20} />
          </View>
          <Text style={styles.statCount}>{skillsCount}</Text>
          <Text style={styles.statLabel}>Skills</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Preferences & Shortcuts</Text>
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate("Profile")}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: "rgba(99, 102, 241, 0.1)" }]}>
            <Shield color={colors.primary} size={18} />
          </View>
          <Text style={styles.rowText}>Edit Profile & Details</Text>
          <ChevronRight color={colors.textSecondary} size={18} style={styles.chevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate("SavedJobs")}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: "rgba(56, 189, 248, 0.12)" }]}>
            <Bookmark color="#0284c7" size={18} />
          </View>
          <Text style={styles.rowText}>Saved Job Bookmarks</Text>
          <ChevronRight color={colors.textSecondary} size={18} style={styles.chevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, { borderBottomWidth: 0 }]}
          onPress={() => navigation.navigate("Notifications")}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: "rgba(168, 85, 247, 0.12)" }]}>
            <Bell color="#9333ea" size={18} />
          </View>
          <Text style={styles.rowText}>Notifications</Text>
          <ChevronRight color={colors.textSecondary} size={18} style={styles.chevron} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <LogOut color={colors.destructive} size={20} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "bold", marginTop: 6, marginBottom: 16 },
  profileBox: {
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarCircle: {
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
  },
  userName: { color: colors.textPrimary, fontSize: 17, fontWeight: "bold" },
  userEmail: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  roleBadgeContainer: {
    marginTop: 4,
    alignSelf: "flex-start",
  },
  userRole: { color: colors.primary, fontSize: 11, textTransform: "capitalize" },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    width: "31%",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statCount: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "bold",
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  sectionHeader: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderSubtle,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  rowText: { color: colors.textPrimary, marginLeft: 12, fontSize: 15, fontWeight: "600", flex: 1 },
  chevron: { marginLeft: "auto" },
  logoutBtn: {
    backgroundColor: colors.destructiveBg,
    padding: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.destructiveBorder,
    marginTop: 8,
  },
  logoutText: { color: colors.destructive, fontWeight: "700", fontSize: 15, marginLeft: 8 },
});
