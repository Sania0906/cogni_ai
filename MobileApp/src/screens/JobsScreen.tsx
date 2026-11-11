import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { api } from "../services/api";
import {
  Briefcase,
  Search,
  MapPin,
  DollarSign,
  Bookmark,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";

export function JobsScreen({ navigation }: any) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRemoteOnly, setFilterRemoteOnly] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [jobsData, savedData, appliedData] = await Promise.all([
        api.getJobs().catch(() => []),
        api.getSavedJobs().catch(() => []),
        api.getAppliedJobs().catch(() => []),
      ]);

      const jobsList = Array.isArray(jobsData) ? jobsData : jobsData?.data || [];
      setJobs(jobsList);

      const savedList = Array.isArray(savedData) ? savedData : savedData?.data || [];
      const savedIds = new Set<string>(savedList.map((s: any) => String(s.job_id || s.id)));
      setSavedJobIds(savedIds);

      const appliedList = Array.isArray(appliedData) ? appliedData : appliedData?.data || [];
      setAppliedJobIds(new Set<string>(appliedList.map((a: any) => String(a.id || a.job_id))));
    } catch (e) {
      console.warn("Failed to load jobs:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyJob = async (job: any) => {
    const jobId = String(job.id || job._id);
    if (appliedJobIds.has(jobId)) return;
    setApplyingId(jobId);
    try {
      await api.applyJob(jobId);
      const updated = new Set(appliedJobIds);
      updated.add(jobId);
      setAppliedJobIds(updated);
      Alert.alert("Application Submitted", `Your application for ${job.title} at ${job.company} has been saved.`);
    } catch (e: any) {
      Alert.alert("Application Error", e?.response?.data?.message || "Failed to submit job application.");
    } finally {
      setApplyingId(null);
    }
  };

  const handleToggleSave = async (job: any) => {
    const jobId = String(job.id || job._id);
    const isCurrentlySaved = savedJobIds.has(jobId);

    // Optimistic UI update
    const updated = new Set(savedJobIds);
    if (isCurrentlySaved) {
      updated.delete(jobId);
    } else {
      updated.add(jobId);
    }
    setSavedJobIds(updated);

    try {
      if (isCurrentlySaved) {
        await api.deleteSavedJob(jobId);
      } else {
        await api.saveJob(jobId);
      }
    } catch (e: any) {
      // Revert if API fails
      setSavedJobIds(new Set(savedJobIds));
      Alert.alert("Bookmark Error", "Failed to update saved job status.");
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const q = searchQuery.toLowerCase();
    const title = (job.title || "").toLowerCase();
    const company = (job.company || "").toLowerCase();
    const loc = (job.loc || "").toLowerCase();
    const matchesSearch = !q || title.includes(q) || company.includes(q) || loc.includes(q);
    const matchesRemote = !filterRemoteOnly || loc.includes("remote");
    return matchesSearch && matchesRemote;
  });

  return (
    <View style={styles.container}>
      {/* Search & Actions Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search color="#64748b" size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs, titles, companies..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterRemoteOnly && styles.filterChipActive]}
            onPress={() => setFilterRemoteOnly(!filterRemoteOnly)}
          >
            <Text style={[styles.filterChipText, filterRemoteOnly && styles.filterChipTextActive]}>
              {filterRemoteOnly ? "Remote Only ✓" : "Remote Only"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.savedNavBtn}
            onPress={() => navigation.navigate("SavedJobs")}
          >
            <Bookmark color="#818cf8" size={15} fill="#818cf8" />
            <Text style={styles.savedNavBtnText}>
              Saved ({savedJobIds.size})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item, index) => String(item.id || item._id || index)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Briefcase color="#64748b" size={36} />
              <Text style={styles.emptyTitle}>No matching jobs found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your search criteria</Text>
            </View>
          }
          renderItem={({ item }) => {
            const jobId = String(item.id || item._id);
            const isSaved = savedJobIds.has(jobId);
            const isExpanded = expandedJobId === jobId;
            const matchScore = item.match || 85;

            return (
              <View style={styles.jobCard}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobTitle}>{item.title}</Text>
                    <Text style={styles.companyName}>{item.company}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.bookmarkTouch}
                    onPress={() => handleToggleSave(item)}
                    activeOpacity={0.7}
                  >
                    <Bookmark
                      color={isSaved ? "#fbbf24" : "#94a3b8"}
                      fill={isSaved ? "#fbbf24" : "transparent"}
                      size={22}
                    />
                  </TouchableOpacity>
                </View>

                {/* Metadata Pills */}
                <View style={styles.pillsRow}>
                  <View style={styles.pill}>
                    <MapPin color="#94a3b8" size={12} />
                    <Text style={styles.pillText}>{item.loc || "Remote"}</Text>
                  </View>

                  <View style={styles.pill}>
                    <DollarSign color="#94a3b8" size={12} />
                    <Text style={styles.pillText}>{item.salary || "$120k+"}</Text>
                  </View>

                  <View style={styles.matchBadge}>
                    <Text style={styles.matchText}>{matchScore}% Match</Text>
                  </View>
                </View>

                {/* Description snippet */}
                <Text
                  style={styles.description}
                  numberOfLines={isExpanded ? undefined : 2}
                >
                  {item.description || "Exciting opportunity to build cutting-edge software solutions."}
                </Text>

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    {Array.isArray(item.requirements) && item.requirements.length > 0 && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={styles.sectionHeading}>Required Skills & Tech:</Text>
                        <View style={styles.tagsContainer}>
                          {item.requirements.map((req: string, i: number) => (
                            <View key={i} style={styles.tag}>
                              <Text style={styles.tagText}>{req}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.applyBtn,
                        appliedJobIds.has(jobId) && { backgroundColor: "#065f46" },
                      ]}
                      disabled={appliedJobIds.has(jobId) || applyingId === jobId}
                      onPress={() => handleApplyJob(item)}
                    >
                      <CheckCircle color="#ffffff" size={16} />
                      <Text style={styles.applyBtnText}>
                        {applyingId === jobId
                          ? "Submitting..."
                          : appliedJobIds.has(jobId)
                          ? "Applied ✓"
                          : "Quick Apply"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Toggle details accordion */}
                <TouchableOpacity
                  style={styles.expandToggle}
                  onPress={() => setExpandedJobId(isExpanded ? null : jobId)}
                >
                  <Text style={styles.expandToggleText}>
                    {isExpanded ? "Show Less" : "View Details & Requirements"}
                  </Text>
                  {isExpanded ? (
                    <ChevronUp color="#818cf8" size={16} />
                  ) : (
                    <ChevronDown color="#818cf8" size={16} />
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16" },
  header: { padding: 16, backgroundColor: "#090d16", borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchInput: { color: "#ffffff", marginLeft: 8, flex: 1, fontSize: 14 },
  filterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  filterChipActive: { backgroundColor: "#312e81", borderColor: "#6366f1" },
  filterChipText: { color: "#94a3b8", fontSize: 12, fontWeight: "500" },
  filterChipTextActive: { color: "#ffffff", fontWeight: "bold" },
  savedNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#1e1b4b",
    borderWidth: 1,
    borderColor: "#4338ca",
  },
  savedNavBtnText: { color: "#a5b4fc", fontSize: 12, fontWeight: "600", marginLeft: 6 },
  listContent: { padding: 16, paddingBottom: 40 },
  jobCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  jobTitle: { color: "#ffffff", fontSize: 17, fontWeight: "bold" },
  companyName: { color: "#818cf8", fontSize: 14, marginTop: 2 },
  bookmarkTouch: { padding: 4 },
  pillsRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 10, gap: 8 },
  pill: { flexDirection: "row", alignItems: "center", backgroundColor: "#0f172a", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pillText: { color: "#cbd5e1", fontSize: 12, marginLeft: 4 },
  matchBadge: { backgroundColor: "#065f46", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  matchText: { color: "#34d399", fontSize: 12, fontWeight: "bold" },
  description: { color: "#94a3b8", fontSize: 13, marginTop: 10, lineHeight: 18 },
  expandedSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 10 },
  sectionHeading: { color: "#e2e8f0", fontSize: 13, fontWeight: "600", marginBottom: 6 },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { backgroundColor: "#0f172a", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "#334155" },
  tagText: { color: "#a5b4fc", fontSize: 12 },
  applyBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  applyBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 14, marginLeft: 6 },
  expandToggle: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 10, paddingTop: 8 },
  expandToggleText: { color: "#818cf8", fontSize: 13, fontWeight: "500", marginRight: 4 },
  emptyBox: { alignItems: "center", marginTop: 60 },
  emptyTitle: { color: "#ffffff", fontSize: 16, fontWeight: "600", marginTop: 12 },
  emptySubtitle: { color: "#64748b", fontSize: 13, marginTop: 4 },
});

