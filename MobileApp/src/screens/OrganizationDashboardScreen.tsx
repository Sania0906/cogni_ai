import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from "react-native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Users, Search, Star, LogOut, CheckCircle } from "lucide-react-native";
import { colors } from "../theme/colors";

export function OrganizationDashboardScreen() {
  const { user, logout } = useAuth();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [shortlistedMap, setShortlistedMap] = useState<Record<string, boolean>>({});

  const loadCandidates = async () => {
    try {
      const data = await api.getRecruiterCandidates();
      const list = Array.isArray(data) ? data : data?.data || [];
      setCandidates(list);

      // Initialize shortlisted map
      const initialMap: Record<string, boolean> = {};
      list.forEach((c: any) => {
        if (c.id && c.is_shortlisted) {
          initialMap[c.id] = true;
        }
      });
      setShortlistedMap(initialMap);
    } catch (e) {
      console.warn("Error loading candidates:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const handleToggleShortlist = async (candidateId: string) => {
    const nextState = !shortlistedMap[candidateId];
    setShortlistedMap((prev) => ({ ...prev, [candidateId]: nextState }));
    try {
      await api.toggleShortlist(candidateId, nextState);
    } catch (e) {
      // Revert if API fails
      setShortlistedMap((prev) => ({ ...prev, [candidateId]: !nextState }));
      Alert.alert("Error", "Could not update shortlist status.");
    }
  };

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  };

  const filteredCandidates = candidates.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (item.name || item.full_name || "").toLowerCase();
    const role = (item.target_role || "").toLowerCase();
    const skills = Array.isArray(item.skills) ? item.skills.join(" ").toLowerCase() : "";
    return name.includes(q) || role.includes(q) || skills.includes(q);
  });

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.headerTitle}>Talent Pool</Text>
          <Text style={styles.subTitle}>Welcome, {user?.name || "Recruiter"}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color={colors.destructive} size={20} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBox}>
        <Search color={colors.textSecondary} size={18} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search candidates by name, role or skill..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredCandidates}
          keyExtractor={(item, index) => item.id || index.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadCandidates();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Users color={colors.textSecondary} size={36} />
              <Text style={styles.emptyText}>No matching candidates found.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const candidateId = item.id || item.user_id;
            const isShortlisted = !!shortlistedMap[candidateId];
            const skillsStr = Array.isArray(item.skills) && item.skills.length > 0
              ? item.skills.join(", ")
              : typeof item.skills === "string" && item.skills.trim()
              ? item.skills
              : "No skills extracted yet";
            const matchVal = item.match_score ?? item.employability_score ?? 0;

            return (
              <View style={styles.candidateCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.candidateName}>{item.name || item.full_name || "Candidate"}</Text>
                    <Text style={styles.candidateRole}>{item.target_role || "Software Engineer"}</Text>
                  </View>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>
                      {matchVal}% Match
                    </Text>
                  </View>
                </View>

                <Text style={styles.skillsList}>Skills: {skillsStr}</Text>

                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={[styles.shortlistBtn, isShortlisted && styles.shortlistBtnActive]}
                    onPress={() => handleToggleShortlist(candidateId)}
                  >
                    <Star
                      color={isShortlisted ? colors.warning : colors.textSecondary}
                      size={16}
                      fill={isShortlisted ? colors.warning : "transparent"}
                    />
                    <Text style={[styles.shortlistBtnText, isShortlisted && styles.shortlistBtnTextActive]}>
                      {isShortlisted ? "Shortlisted" : "Shortlist Candidate"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  headerTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: "bold" },
  subTitle: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  logoutBtn: {
    backgroundColor: colors.destructiveBg,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.destructiveBorder,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: { color: colors.textPrimary, marginLeft: 8, flex: 1, fontSize: 14 },
  candidateCard: {
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
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  candidateName: { color: colors.textPrimary, fontSize: 17, fontWeight: "bold" },
  candidateRole: { color: colors.primary, fontSize: 13, marginTop: 2, fontWeight: "600" },
  scoreBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  scoreText: { color: colors.success, fontSize: 12, fontWeight: "bold" },
  skillsList: { color: colors.textSecondary, fontSize: 13, marginTop: 10, lineHeight: 18 },
  cardFooter: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorderSubtle,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  shortlistBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  shortlistBtnActive: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
  },
  shortlistBtnText: { color: colors.textSecondary, fontSize: 12, marginLeft: 6, fontWeight: "600" },
  shortlistBtnTextActive: { color: colors.warning, fontWeight: "700" },
  emptyBox: { alignItems: "center", marginTop: 50 },
  emptyText: { color: colors.textSecondary, marginTop: 10, fontSize: 14 },
});
