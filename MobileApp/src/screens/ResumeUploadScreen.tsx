import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { api } from "../services/api";
import { UploadCloud, FileText, CheckCircle, AlertTriangle, Sparkles, Award } from "lucide-react-native";

export function ResumeUploadScreen({ navigation }: any) {
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handlePickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/plain"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      setUploading(true);

      // Submit directly to shared Express backend ML upload endpoint
      const formData = new FormData();
      const filePayload: any = {
        uri: file.uri,
        name: file.name || "resume.pdf",
        type: file.mimeType || "application/pdf",
      };
      formData.append("file", filePayload);

      const res = await api.uploadResume(formData);
      // res can be { success: true, data: { ats_score, predicted_role, strengths, weaknesses, recommendations } }
      const data = res?.data || res;
      setAnalysisResult(data);
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

  const atsScore = analysisResult?.ats_score ?? analysisResult?.score ?? null;
  const predictedRole = analysisResult?.predicted_role ?? analysisResult?.predictedRole ?? null;
  const strengths = analysisResult?.strengths ?? [];
  const weaknesses = analysisResult?.weaknesses ?? [];
  const recommendations = analysisResult?.recommendations ?? analysisResult?.improvements ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Resume Analysis & ATS</Text>
      <Text style={styles.subtitle}>
        Upload your resume for instant AI parsing and real ML career trajectory matching
      </Text>

      <TouchableOpacity
        style={styles.dropzone}
        onPress={handlePickAndUpload}
        disabled={uploading}
        activeOpacity={0.7}
      >
        {uploading ? (
          <View style={styles.uploadingState}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.analyzingText}>Running TF-IDF & ML Inference...</Text>
          </View>
        ) : (
          <View style={{ alignItems: "center" }}>
            <UploadCloud color="#818cf8" size={48} />
            <Text style={styles.dropText}>Tap to select Resume (PDF / TXT)</Text>
            <Text style={styles.subText}>Processed directly through CognifyAI ML Engine</Text>
          </View>
        )}
      </TouchableOpacity>

      {analysisResult && (
        <View style={styles.resultBox}>
          <View style={styles.scoreRow}>
            <View>
              <Text style={styles.resultHeader}>ATS Optimization Score</Text>
              <Text style={styles.scoreNum}>{atsScore !== null ? `${atsScore}%` : "Analyzed"}</Text>
            </View>
            <Award color="#6366f1" size={40} />
          </View>

          {predictedRole && (
            <View style={styles.predictedRoleBox}>
              <Sparkles color="#a855f7" size={18} />
              <Text style={styles.predictedRoleLabel}>
                Predicted Role: <Text style={styles.predictedRoleValue}>{predictedRole}</Text>
              </Text>
            </View>
          )}

          {strengths.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>Key Strengths</Text>
              {strengths.map((item: string, i: number) => (
                <View key={`str-${i}`} style={styles.bulletRow}>
                  <CheckCircle color="#10b981" size={16} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {weaknesses.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>Identified Gaps</Text>
              {weaknesses.map((item: string, i: number) => (
                <View key={`wk-${i}`} style={styles.bulletRow}>
                  <AlertTriangle color="#f59e0b" size={16} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {recommendations.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>ML Recommendations</Text>
              {recommendations.map((item: string, i: number) => (
                <View key={`rec-${i}`} style={styles.bulletRow}>
                  <CheckCircle color="#3b82f6" size={16} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.historyBtn}
        onPress={() => navigation.navigate("ResumeHistory")}
      >
        <FileText color="#ffffff" size={18} />
        <Text style={styles.historyBtnText}>View Resume Upload History</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16" },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: "#ffffff", fontSize: 24, fontWeight: "bold", marginTop: 10 },
  subtitle: { color: "#94a3b8", fontSize: 14, marginBottom: 20, marginTop: 4 },
  dropzone: {
    backgroundColor: "#1e293b",
    borderWidth: 2,
    borderColor: "#334155",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginBottom: 20,
  },
  uploadingState: { alignItems: "center", paddingVertical: 10 },
  analyzingText: { color: "#818cf8", marginTop: 12, fontSize: 14, fontWeight: "500" },
  dropText: { color: "#ffffff", marginTop: 12, fontSize: 16, fontWeight: "600" },
  subText: { color: "#64748b", marginTop: 4, fontSize: 12 },
  resultBox: {
    backgroundColor: "#1e1b4b",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#3730a3",
  },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultHeader: { color: "#a5b4fc", fontSize: 14, fontWeight: "500" },
  scoreNum: { color: "#ffffff", fontSize: 40, fontWeight: "bold", marginTop: 4 },
  predictedRoleBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2e1065",
    padding: 10,
    borderRadius: 8,
    marginTop: 14,
  },
  predictedRoleLabel: { color: "#d8b4fe", fontSize: 14, marginLeft: 8 },
  predictedRoleValue: { color: "#ffffff", fontWeight: "bold" },
  sectionTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "600", marginBottom: 6 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 6 },
  bulletText: { color: "#cbd5e1", marginLeft: 8, fontSize: 13, flex: 1, lineHeight: 18 },
  historyBtn: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  historyBtnText: { color: "#ffffff", fontWeight: "600", marginLeft: 8 },
});
