import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useAuth } from "../context/AuthContext";
import { User, LogOut, Bell, Shield, Bookmark, ChevronRight } from "lucide-react-native";
export { ProfileScreen } from "./ProfileScreen";

export function SettingsScreen({ navigation }: any) {
  const { logout, user } = useAuth();

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
          <User color="#818cf8" size={28} />
        </View>
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text style={styles.userName}>{user?.name || "Account User"}</Text>
          <Text style={styles.userEmail}>{user?.email || "user@example.com"}</Text>
          <Text style={styles.userRole}>Role: {user?.role || "user"}</Text>
        </View>
        <ChevronRight color="#64748b" size={20} />
      </TouchableOpacity>

      <Text style={styles.sectionHeader}>Preferences & Saved</Text>
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate("SavedJobs")}
          activeOpacity={0.7}
        >
          <Bookmark color="#38bdf8" size={20} />
          <Text style={styles.rowText}>Saved Job Bookmarks</Text>
          <ChevronRight color="#64748b" size={18} style={styles.chevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate("Notifications")}
          activeOpacity={0.7}
        >
          <Bell color="#a855f7" size={20} />
          <Text style={styles.rowText}>Notifications</Text>
          <ChevronRight color="#64748b" size={18} style={styles.chevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, { borderBottomWidth: 0 }]}
          onPress={() => navigation.navigate("Profile")}
          activeOpacity={0.7}
        >
          <Shield color="#10b981" size={20} />
          <Text style={styles.rowText}>Edit Profile & Details</Text>
          <ChevronRight color="#64748b" size={18} style={styles.chevron} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <LogOut color="#ef4444" size={20} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16" },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: "#ffffff", fontSize: 24, fontWeight: "bold", marginTop: 10, marginBottom: 16 },
  profileBox: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  avatarCircle: {
    backgroundColor: "#0f172a",
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  userName: { color: "#ffffff", fontSize: 17, fontWeight: "bold" },
  userEmail: { color: "#94a3b8", fontSize: 13, marginTop: 2 },
  userRole: { color: "#818cf8", fontSize: 11, marginTop: 4, textTransform: "capitalize" },
  sectionHeader: { color: "#94a3b8", fontSize: 13, fontWeight: "600", marginBottom: 8, textTransform: "uppercase" },
  section: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  rowText: { color: "#f8fafc", marginLeft: 12, fontSize: 15, flex: 1 },
  chevron: { marginLeft: "auto" },
  logoutBtn: {
    backgroundColor: "#450a0a",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#7f1d1d",
  },
  logoutText: { color: "#ef4444", fontWeight: "600", fontSize: 16, marginLeft: 8 },
});
