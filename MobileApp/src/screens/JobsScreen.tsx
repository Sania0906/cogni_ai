import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
import { colors } from "../theme/colors";
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

  useFocusEffect(
    useCallback(() => {
      loadData();
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    }, [])
  );

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
          <Search color={colors.textSecondary} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs, titles, companies..."
            placeholderTextColor={colors.textMuted}
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
            <Bookmark color={colors.primary} size={15} fill={colors.primary} />
            <Text style={styles.savedNavBtnText}>
              Saved ({savedJobIds.size})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item, index) => String(item.id || item._id || index)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              colors={[colors.primary]}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Briefcase color={colors.textMuted} size={40} />
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
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.jobTitle}>{item.title}</Text>
                    <Text style={styles.companyName}>{item.company}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.bookmarkTouch}
                    onPress={() => handleToggleSave(item)}
                    activeOpacity={0.7}
                  >
                    <Bookmark
                      color={isSaved ? "#f59e0b" : colors.textMuted}
                      fill={isSaved ? "#f59e0b" : "transparent"}
                      size={22}
                    />
                  </TouchableOpacity>
                </View>

                {/* Metadata Pills */}
                <View style={styles.pillsRow}>
                  <View style={styles.pill}>
                    <MapPin color={colors.textSecondary} size={12} />
                    <Text style={styles.pillText}>{item.loc || "Remote"}</Text>
                  </View>

                  <View style={styles.pill}>
                    <DollarSign color={colors.textSecondary} size={12} />
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
                        appliedJobIds.has(jobId) && styles.appliedBtn,
                      ]}
                      disabled={appliedJobIds.has(jobId) || applyingId === jobId}
                      onPress={() => handleApplyJob(item)}
                      activeOpacity={0.8}
                    >
                      <CheckCircle color={appliedJobIds.has(jobId) ? colors.success : "#ffffff"} size={16} />
                      <Text style={[styles.applyBtnText, appliedJobIds.has(jobId) && styles.appliedBtnText]}>
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
                    <ChevronUp color={colors.primary} size={16} />
                  ) : (
                    <ChevronDown color={colors.primary} size={16} />
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
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  searchInput: { color: colors.textPrimary, marginLeft: 8, flex: 1, fontSize: 14 },
  filterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  filterChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  filterChipTextActive: { color: colors.primary, fontWeight: "700" },
  savedNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  savedNavBtnText: { color: colors.primary, fontSize: 12, fontWeight: "700", marginLeft: 6 },
  listContent: { padding: 16, paddingBottom: 40 },
  jobCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
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
  bookmarkTouch: { padding: 4 },
  pillsRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 10, gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: { color: colors.textSecondary, fontSize: 12, marginLeft: 4, fontWeight: "500" },
  matchBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  matchText: { color: colors.success, fontSize: 12, fontWeight: "700" },
  description: { color: colors.textSecondary, fontSize: 13, marginTop: 10, lineHeight: 19 },
  expandedSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorderSubtle, paddingTop: 12 },
  sectionHeading: { color: colors.textPrimary, fontSize: 13, fontWeight: "700", marginBottom: 6 },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  applyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  appliedBtn: {
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  applyBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 14, marginLeft: 6 },
  appliedBtnText: { color: colors.success },
  expandToggle: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 12, paddingTop: 8 },
  expandToggleText: { color: colors.primary, fontSize: 13, fontWeight: "600", marginRight: 4 },
  emptyBox: { alignItems: "center", marginTop: 60 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700", marginTop: 12 },
  emptySubtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
});
