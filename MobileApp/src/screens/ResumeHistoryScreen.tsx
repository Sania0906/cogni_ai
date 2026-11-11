import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { api } from "../services/api";
import { FileText, Sparkles } from "lucide-react-native";

export function ResumeHistoryScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    try {
      const data = await api.getResumeHistory();
      setHistory(Array.isArray(data) ? data : data?.data || []);
    } catch (e) {
      console.warn("Error loading resume history:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resume Audit History</Text>
      <Text style={styles.subtitle}>Past ATS scans and machine learning analysis reports</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => item.id || index.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadHistory();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No resume scans yet.</Text>
              <Text style={styles.emptySubText}>Upload a resume to see your ATS and ML audit history.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const score = item.ats_score ?? item.score ?? 85;
            const role = item.predicted_role ?? item.predictedRole;
            const dateStr = item.created_at
              ? new Date(item.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "Recent";

            return (
              <View style={styles.card}>
                <View style={styles.row}>
                  <FileText color="#818cf8" size={24} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.fileName}>{item.filename || item.file_name || "Resume Audit"}</Text>
                    <Text style={styles.dateText}>{dateStr}</Text>
                    {role ? (
                      <View style={styles.roleTag}>
                        <Sparkles color="#a855f7" size={12} />
                        <Text style={styles.roleTagText}>{role}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>{score}%</Text>
                    <Text style={styles.scoreLabel}>ATS Score</Text>
                  </View>
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
  container: { flex: 1, backgroundColor: "#090d16", padding: 16 },
  title: { color: "#ffffff", fontSize: 24, fontWeight: "bold", marginTop: 10 },
  subtitle: { color: "#94a3b8", fontSize: 14, marginBottom: 20, marginTop: 4 },
  card: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  row: { flexDirection: "row", alignItems: "center" },
  fileName: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  dateText: { color: "#64748b", fontSize: 12, marginTop: 2 },
  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "#2e1065",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  roleTagText: { color: "#d8b4fe", fontSize: 11, marginLeft: 4, fontWeight: "500" },
  scoreContainer: { alignItems: "flex-end" },
  scoreText: { color: "#34d399", fontSize: 20, fontWeight: "bold" },
  scoreLabel: { color: "#64748b", fontSize: 11, marginTop: 2 },
  emptyBox: { alignItems: "center", marginTop: 60, paddingHorizontal: 20 },
  emptyText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  emptySubText: { color: "#64748b", fontSize: 13, marginTop: 6, textAlign: "center" },
});
