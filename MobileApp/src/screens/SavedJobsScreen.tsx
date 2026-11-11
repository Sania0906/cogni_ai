import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    loadSavedJobs();
  }, []);

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
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={savedJobs}
          keyExtractor={(item, index) => String(item.id || item.job_id || index)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadSavedJobs();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Bookmark color="#64748b" size={40} />
              <Text style={styles.emptyTitle}>No saved jobs yet</Text>
              <Text style={styles.emptySubtitle}>
                Bookmark positions in the Jobs tab to review them later
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => navigation.navigate("Jobs")}
              >
                <Text style={styles.browseBtnText}>Browse Open Jobs</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobTitle}>{item.title || "Software Engineer"}</Text>
                  <Text style={styles.companyName}>{item.company || "Tech Company"}</Text>
                </View>

                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(item)}
                  activeOpacity={0.7}
                >
                  <Trash2 color="#ef4444" size={18} />
                </TouchableOpacity>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.pill}>
                  <MapPin color="#94a3b8" size={12} />
                  <Text style={styles.pillText}>{item.loc || "Remote"}</Text>
                </View>

                <View style={styles.pill}>
                  <DollarSign color="#94a3b8" size={12} />
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
  container: { flex: 1, backgroundColor: "#090d16" },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  jobTitle: { color: "#ffffff", fontSize: 17, fontWeight: "bold" },
  companyName: { color: "#818cf8", fontSize: 14, marginTop: 2 },
  removeBtn: { padding: 8, backgroundColor: "#450a0a", borderRadius: 8 },
  metaRow: { flexDirection: "row", marginTop: 10, gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillText: { color: "#cbd5e1", fontSize: 12, marginLeft: 4 },
  savedDate: { color: "#64748b", fontSize: 11, marginTop: 10 },
  emptyBox: { alignItems: "center", marginTop: 80, paddingHorizontal: 20 },
  emptyTitle: { color: "#ffffff", fontSize: 18, fontWeight: "bold", marginTop: 14 },
  emptySubtitle: { color: "#94a3b8", fontSize: 14, textAlign: "center", marginTop: 6 },
  browseBtn: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  browseBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 14 },
});

