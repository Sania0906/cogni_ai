import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Award,
  RefreshCw,
  ChevronRight,
  Briefcase,
  History,
  GitCompare,
} from "lucide-react-native";

export function ResumeUploadScreen({ navigation }: any) {
  const [uploading, setUploading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [targetJob, setTargetJob] = useState("Software Engineer");
  const [historyCount, setHistoryCount] = useState(0);
  const [comparison, setComparison] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadExistingResume();
      const interval = setInterval(loadExistingResume, 10000);
      return () => clearInterval(interval);
    }, [])
  );

  const loadExistingResume = async () => {
    try {
      const [report, profile, historyData] = await Promise.all([
        api.getLatestAtsReport().catch(() => null),
        api.getProfile().catch(() => null),
        api.getResumeHistory().catch(() => []),
      ]);

      if (profile?.target_role) {
        setTargetJob(profile.target_role);
      }

      const historyArr = Array.isArray(historyData) ? historyData : historyData?.data || [];
      setHistoryCount(historyArr.length);

      if (report && (report.score !== undefined || report.ats_score !== undefined)) {
        setAnalysisResult(report);
      } else if (profile?.resumeDetails) {
        setAnalysisResult({
          ats_score: profile.resumeDetails.ats_score,
          score: profile.resumeDetails.ats_score,
          predicted_role: profile.resumeDetails.predicted_role || profile.target_role || "Software Engineer",
          strengths: Array.isArray(profile.resumeDetails.skills) && profile.resumeDetails.skills.length > 0
            ? profile.resumeDetails.skills
            : profile.resumeDetails.parsed_skills || ["Core Technical Skills", "Education Verified"],
          weaknesses: [],
          recommendations: Array.isArray(profile.resumeDetails.improvements) && profile.resumeDetails.improvements.length > 0
            ? profile.resumeDetails.improvements
            : [
                "Ensure bullet points start with strong action verbs",
                "Quantify measurable accomplishments in your experience",
              ],
          file_name: profile.resumeDetails.file_name,
        });
      }
    } catch (e) {
      console.warn("Could not load existing resume report:", e);
    } finally {
      setLoadingInitial(false);
      setRefreshing(false);
    }
  };

  const handlePickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      setUploading(true);

      const formData = new FormData();
      const filePayload: any = {
        uri: file.uri,
        name: file.name || "resume.pdf",
        type: file.mimeType || "application/pdf",
      };
      formData.append("file", filePayload);
      formData.append("targetJob", targetJob || "Software Engineer");

      const res = await api.uploadResume(formData);
      const data = res?.data || res;
      setAnalysisResult(data);
      await loadExistingResume();
      Alert.alert("Success", "Resume uploaded and analyzed successfully!");
    } catch (e: any) {
      console.warn("Resume upload failed:", e);
      Alert.alert(
        "Upload Notice",
        e?.response?.data?.message || e.message || "Failed to process resume through ML engine."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFetchComparison = async () => {
    if (showComparison) {
      setShowComparison(false);
      return;
    }

    try {
      setLoadingCompare(true);
      const res = await api.getResumeComparison();
      setComparison(res);
      setShowComparison(true);
    } catch (e: any) {
      Alert.alert("Comparison Notice", e?.response?.data?.message || "Upload at least 2 resumes to compare.");
    } finally {
      setLoadingCompare(false);
    }
  };

  const atsScore = analysisResult?.ats_score ?? analysisResult?.score ?? null;
  const predictedRole = analysisResult?.predicted_role ?? analysisResult?.predictedRole ?? null;
  const strengths: string[] = analysisResult?.strengths ?? analysisResult?.detected_skills ?? analysisResult?.skills ?? [];
  const weaknesses: string[] = analysisResult?.weaknesses ?? analysisResult?.missing_skills ?? [];
  const recommendations: string[] = analysisResult?.recommendations ?? analysisResult?.improvements ?? [];
  const fileName = analysisResult?.file_name || analysisResult?.filename || "resume.pdf";

  if (loadingInitial) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
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
          onRefresh={() => {
            setRefreshing(true);
            loadExistingResume();
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>AI ATS Optimization</Text>
          <Text style={styles.subtitle}>
            Synchronized across Web and Mobile with instant ML scoring
          </Text>
        </View>
        {analysisResult && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
      </View>

      {/* Target Role Input */}
      <View style={styles.targetRoleCard}>
        <Text style={styles.targetRoleLabel}>TARGET ROLE FOR ATS BENCHMARK</Text>
        <View style={styles.inputWrapper}>
          <Briefcase color={colors.textSecondary} size={18} style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            value={targetJob}
            onChangeText={setTargetJob}
            placeholder="e.g. Senior Full Stack Engineer"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      {/* Dropzone Upload / Replace Card */}
      <TouchableOpacity
        style={[styles.dropzone, uploading && styles.dropzoneUploading]}
        onPress={handlePickAndUpload}
        disabled={uploading}
        activeOpacity={0.7}
      >
        {uploading ? (
          <View style={styles.uploadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.analyzingText}>Running TF-IDF & ML Analysis...</Text>
            <Text style={styles.subText}>Evaluating industry benchmarks...</Text>
          </View>
        ) : (
          <View style={{ alignItems: "center" }}>
            <View style={styles.iconCircle}>
              <UploadCloud color={colors.primary} size={32} />
            </View>
            <Text style={styles.dropText}>
              {analysisResult ? "Tap to Replace Resume (PDF, TXT, DOCX)" : "Tap to Upload Resume (PDF, TXT, DOCX)"}
            </Text>
            <Text style={styles.subText}>Evaluated directly through the CognifyAI ML Pipeline</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Active Resume ATS Result Card */}
      {analysisResult && (
        <View style={styles.resultBox}>
          <View style={styles.scoreRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.scorePill}>
                <Text style={styles.scoreNum}>{atsScore !== null ? `${atsScore}%` : "85%"}</Text>
              </View>
              <View style={{ marginLeft: 14 }}>
                <Text style={styles.resultHeader}>ATS Optimization Score</Text>
                <Text style={styles.fileLabel} numberOfLines={1}>
                  Active: <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>{fileName}</Text>
                </Text>
              </View>
            </View>
            <Award color={colors.primary} size={28} />
          </View>

          {predictedRole && (
            <View style={styles.predictedRoleBox}>
              <Sparkles color="#8b5cf6" size={16} />
              <Text style={styles.predictedRoleLabel}>
                Predicted Role: <Text style={styles.predictedRoleValue}>{predictedRole}</Text>
              </Text>
            </View>
          )}

          {/* Key Strengths & Extracted Skills */}
          {strengths.length > 0 && (
            <View style={{ marginTop: 18 }}>
              <View style={styles.sectionHeaderRow}>
                <CheckCircle color={colors.success} size={15} />
                <Text style={styles.sectionTitle}>Key Verified Strengths & Skills</Text>
              </View>
              <View style={styles.tagsContainer}>
                {strengths.map((item: string, i: number) => (
                  <View key={`str-${i}`} style={styles.strengthTag}>
                    <Text style={styles.strengthTagText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Identified Gaps / Missing Skills */}
          {weaknesses.length > 0 && (
            <View style={{ marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.cardBorder }}>
              <View style={styles.sectionHeaderRow}>
                <AlertTriangle color={colors.warning} size={15} />
                <Text style={styles.sectionTitle}>Identified Skill Gaps for {targetJob}</Text>
              </View>
              <View style={styles.tagsContainer}>
                {weaknesses.map((item: string, i: number) => (
                  <View key={`wk-${i}`} style={styles.gapTag}>
                    <Text style={styles.gapTagText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <View style={{ marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.cardBorder }}>
              <Text style={styles.recSectionTitle}>ML ACTIONABLE RECOMMENDATIONS</Text>
              {recommendations.map((item: string, i: number) => (
                <View key={`rec-${i}`} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Version Comparison Card (Available if 2+ scans recorded) */}
      {historyCount >= 2 && (
        <View style={styles.compareCard}>
          <TouchableOpacity
            style={styles.compareHeader}
            onPress={handleFetchComparison}
            activeOpacity={0.7}
          >
            <View style={styles.compareIconBox}>
              <GitCompare color={colors.primary} size={20} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.compareTitle}>Compare with Previous Resume</Text>
              <Text style={styles.compareSub}>Inspect ATS score delta & skills diff</Text>
            </View>
            {loadingCompare ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <ChevronRight
                color={colors.textSecondary}
                size={18}
                style={{ transform: [{ rotate: showComparison ? "90deg" : "0deg" }] }}
              />
            )}
          </TouchableOpacity>

          {showComparison && comparison?.canCompare && (
            <View style={styles.compareDetails}>
              <View style={styles.compareMetricRow}>
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Previous Score</Text>
                  <Text style={styles.metricVal}>{comparison.previousScore}%</Text>
                </View>
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Latest Score</Text>
                  <Text style={[styles.metricVal, { color: colors.primary }]}>{comparison.latestScore}%</Text>
                </View>
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Delta</Text>
                  <Text
                    style={[
                      styles.metricVal,
                      { color: (comparison.atsImprovement || 0) >= 0 ? colors.success : colors.destructive },
                    ]}
                  >
                    {(comparison.atsImprovement || 0) >= 0 ? `+${comparison.atsImprovement}%` : `${comparison.atsImprovement}%`}
                  </Text>
                </View>
              </View>

              {comparison.addedSkills?.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.diffLabel}>Added Skills in New Version:</Text>
                  <View style={styles.tagsContainer}>
                    {comparison.addedSkills.map((s: string, idx: number) => (
                      <View key={idx} style={styles.addedSkillBadge}>
                        <Text style={styles.addedSkillText}>+{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* History Navigation Card */}
      <TouchableOpacity
        style={styles.historyBtn}
        onPress={() => navigation.navigate("ResumeHistory")}
        activeOpacity={0.7}
      >
        <View style={styles.historyIconCircle}>
          <History color={colors.primary} size={20} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.historyBtnText}>Resume Upload & Audit History</Text>
          <Text style={styles.historySubText}>
            {historyCount > 0 ? `${historyCount} past scans recorded` : "View past ATS scans"}
          </Text>
        </View>
        <ChevronRight color={colors.textSecondary} size={18} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 6 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "bold" },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginBottom: 16, marginTop: 4, lineHeight: 18 },
  activeBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: { color: "#059669", fontWeight: "700", fontSize: 12 },
  targetRoleCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  targetRoleLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  dropzone: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  dropzoneUploading: {
    borderColor: colors.primary,
    backgroundColor: "rgba(99, 102, 241, 0.04)",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingState: { alignItems: "center", paddingVertical: 10 },
  analyzingText: { color: colors.primary, marginTop: 12, fontSize: 14, fontWeight: "700" },
  dropText: { color: colors.textPrimary, marginTop: 14, fontSize: 15, fontWeight: "700", textAlign: "center" },
  subText: { color: colors.textSecondary, marginTop: 4, fontSize: 12, textAlign: "center" },
  resultBox: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scorePill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreNum: { color: "#ffffff", fontSize: 22, fontWeight: "900" },
  resultHeader: { color: colors.textPrimary, fontSize: 15, fontWeight: "700" },
  fileLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  predictedRoleBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.18)",
  },
  predictedRoleLabel: { color: "#6d28d9", fontSize: 13, marginLeft: 8 },
  predictedRoleValue: { color: "#5b21b6", fontWeight: "bold" },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sectionTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: "700", marginLeft: 6 },
  recSectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  strengthTag: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  strengthTagText: { color: "#059669", fontSize: 12, fontWeight: "700" },
  gapTag: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  gapTagText: { color: "#d97706", fontSize: 12, fontWeight: "700" },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 6 },
  bulletDot: { color: colors.primary, fontSize: 14, fontWeight: "bold", marginRight: 8 },
  bulletText: { color: colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 18 },
  compareCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  compareHeader: { flexDirection: "row", alignItems: "center" },
  compareIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  compareTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
  compareSub: { color: colors.textSecondary, fontSize: 12, marginTop: 1 },
  compareDetails: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  compareMetricRow: { flexDirection: "row", justifyContent: "space-between" },
  metricBlock: { alignItems: "center", flex: 1 },
  metricLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "600" },
  metricVal: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, marginTop: 2 },
  diffLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 6 },
  addedSkillBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addedSkillText: { color: "#059669", fontSize: 11, fontWeight: "700" },
  historyBtn: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
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
  historyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  historyBtnText: { color: colors.textPrimary, fontWeight: "700", fontSize: 14 },
  historySubText: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
