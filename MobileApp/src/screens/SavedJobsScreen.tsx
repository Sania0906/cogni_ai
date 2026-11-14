import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import { Bookmark, MapPin, DollarSign, Trash2, ArrowLeft, Briefcase } from "lucide-react-native";

export function SavedJobsScreen({ navigation }: any) {
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSavedJobs = async () => {
    try {
      const data = await api.getSavedJobs();
      const list = Array.isArray(data) ? data : data?.data || [];
      setSavedJobs(list);
    } catch (e) {
      console.warn("Failed to load saved jobs:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSavedJobs();
      const interval = setInterval(loadSavedJobs, 10000);
      return () => clearInterval(interval);
    }, [])
  );

  const handleRemove = async (item: any) => {
    const jobId = String(item.job_id || item.id);
    // Optimistic removal
    setSavedJobs((prev) => prev.filter((j) => String(j.job_id || j.id) !== jobId));

    try {
      await api.deleteSavedJob(jobId);
    } catch (e: any) {
      // Reload on failure
      loadSavedJobs();
      Alert.alert("Error", "Could not remove job from saved bookmarks.");
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={savedJobs}
          keyExtractor={(item, index) => String(item.id || item.job_id || index)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              colors={[colors.primary]}
              onRefresh={() => {
                setRefreshing(true);
                loadSavedJobs();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Bookmark color={colors.textMuted} size={44} />
              <Text style={styles.emptyTitle}>No saved jobs yet</Text>
              <Text style={styles.emptySubtitle}>
                Bookmark positions in the Jobs tab to review them later
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => navigation.navigate("Jobs")}
                activeOpacity={0.8}
              >
                <Text style={styles.browseBtnText}>Browse Open Jobs</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.jobTitle}>{item.title || "Software Engineer"}</Text>
                  <Text style={styles.companyName}>{item.company || "Tech Company"}</Text>
                </View>

                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(item)}
                  activeOpacity={0.7}
                >
                  <Trash2 color={colors.destructive} size={18} />
                </TouchableOpacity>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.pill}>
                  <MapPin color={colors.textSecondary} size={12} />
                  <Text style={styles.pillText}>{item.loc || "Remote"}</Text>
                </View>

                <View style={styles.pill}>
                  <DollarSign color={colors.textSecondary} size={12} />
                  <Text style={styles.pillText}>{item.salary || "$120k+"}</Text>
                </View>
              </View>

              {item.saved_at && (
                <Text style={styles.savedDate}>
                  Saved on {new Date(item.saved_at).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  jobTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "bold" },
  companyName: { color: colors.primary, fontSize: 13, fontWeight: "600", marginTop: 2 },
  removeBtn: {
    padding: 8,
    backgroundColor: colors.destructiveBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.destructiveBorder,
  },
  metaRow: { flexDirection: "row", marginTop: 10, gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: { color: colors.textSecondary, fontSize: 12, marginLeft: 4, fontWeight: "500" },
  savedDate: { color: colors.textMuted, fontSize: 11, marginTop: 10 },
  emptyBox: { alignItems: "center", marginTop: 80, paddingHorizontal: 20 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "bold", marginTop: 14 },
  emptySubtitle: { color: colors.textSecondary, fontSize: 14, textAlign: "center", marginTop: 6, lineHeight: 20 },
  browseBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  browseBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
});
