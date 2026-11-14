import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api, getAuthToken } from "../services/api";
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { FileText, Sparkles, RotateCcw, AlertCircle, LogIn } from "lucide-react-native";

export function ResumeHistoryScreen({ navigation }: any) {
  const { user, token, initializing } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadHistory = async () => {
    // 1. Ensure session restoration completes before loading resume history
    if (initializing) return;

    // 2. Ensure user is authenticated and token is available
    const activeToken = getAuthToken() || token;
    if (!user || !activeToken) {
      setLoading(false);
      setRefreshing(false);
      setIsAuthError(true);
      setErrorMessage("Please sign in to view your resume audit history.");
      return;
    }

    setErrorMessage(null);
    setIsAuthError(false);

    try {
      const data = await api.getResumeHistory();
      setHistory(Array.isArray(data) ? data : data?.data || []);
    } catch (e: any) {
      console.warn("Error loading resume history:", e);
      if (e?.response?.status === 401) {
        setIsAuthError(true);
        setErrorMessage("Your session has expired. Please sign in again to continue.");
      } else if (!e?.response) {
        setErrorMessage("Network error: Unable to connect to server. Please check your network connection.");
      } else {
        setErrorMessage(e?.response?.data?.message || "Failed to load resume history.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!initializing) {
        loadHistory();
      }
    }, [initializing, user, token])
  );

  useEffect(() => {
    if (!initializing) {
      loadHistory();
    }
  }, [initializing]);

  const handleRestore = (item: any) => {
    Alert.alert(
      "Restore Resume",
      `Are you sure you want to restore "${item.file_name || item.filename || "this resume"}" as your active resume?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "default",
          onPress: async () => {
            try {
              setRestoringId(item.id);
              await api.restoreResume(item.id);
              Alert.alert("Success", "Resume restored successfully!");
              await loadHistory();
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to restore resume");
            } finally {
              setRestoringId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resume Audit History</Text>
      <Text style={styles.subtitle}>Past ATS scans and machine learning analysis reports</Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading audit history...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.errorBox}>
          <AlertCircle color={isAuthError ? colors.warning : colors.destructive} size={42} />
          <Text style={styles.errorTitle}>{isAuthError ? "Session Notice" : "Unable to Load"}</Text>
          <Text style={styles.errorDesc}>{errorMessage}</Text>
          {isAuthError ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.8}
            >
              <LogIn color="#ffffff" size={16} />
              <Text style={styles.actionBtnText}>Sign In</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setLoading(true);
                loadHistory();
              }}
              activeOpacity={0.8}
            >
              <RotateCcw color="#ffffff" size={16} />
              <Text style={styles.actionBtnText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => item.id || index.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              colors={[colors.primary]}
              onRefresh={() => {
                setRefreshing(true);
                loadHistory();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <FileText color={colors.primary} size={32} />
              </View>
              <Text style={styles.emptyText}>No resume scans yet.</Text>
              <Text style={styles.emptySubText}>
                Upload a resume in the Resume tab to see your ATS and ML audit history.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const score = item.ats_score ?? item.score ?? 85;
            const role = item.predicted_role ?? item.predictedRole;
            const isLatest = index === 0;
            const dateStr = item.created_at || item.upload_date
              ? new Date(item.created_at || item.upload_date).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "Recent";

            return (
              <View style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.iconCircle}>
                    <FileText color={colors.primary} size={20} />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {item.file_name || item.filename || "Resume Audit"}
                      </Text>
                      {isLatest && (
                        <View style={styles.latestBadge}>
                          <Text style={styles.latestBadgeText}>Latest</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.dateText}>{dateStr}</Text>
                    {role ? (
                      <View style={styles.roleTag}>
                        <Sparkles color="#8b5cf6" size={12} />
                        <Text style={styles.roleTagText}>{role}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>{score}%</Text>
                    <Text style={styles.scoreLabel}>ATS Score</Text>
                  </View>
                </View>

                {!isLatest && item.id && (
                  <TouchableOpacity
                    style={styles.restoreBtn}
                    onPress={() => handleRestore(item)}
                    disabled={restoringId === item.id}
                    activeOpacity={0.7}
                  >
                    {restoringId === item.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <RotateCcw color={colors.primary} size={14} />
                        <Text style={styles.restoreBtnText}>Restore this Version</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
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
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "bold", marginTop: 6 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginBottom: 20, marginTop: 4 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  loadingText: { color: colors.textSecondary, fontSize: 13, marginTop: 12 },
  card: {
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
  row: { flexDirection: "row", alignItems: "center" },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  fileName: { color: colors.textPrimary, fontSize: 15, fontWeight: "700", flexShrink: 1 },
  latestBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  latestBadgeText: { color: "#059669", fontSize: 10, fontWeight: "700" },
  dateText: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  roleTagText: { color: "#6d28d9", fontSize: 11, marginLeft: 4, fontWeight: "600" },
  scoreContainer: { alignItems: "flex-end", marginLeft: 10 },
  scoreText: { color: colors.success, fontSize: 20, fontWeight: "bold" },
  scoreLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  restoreBtnText: { color: colors.primary, fontSize: 12, fontWeight: "700", marginLeft: 6 },
  emptyBox: { alignItems: "center", marginTop: 60, paddingHorizontal: 20 },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
  emptySubText: { color: colors.textSecondary, fontSize: 13, marginTop: 6, textAlign: "center", lineHeight: 18 },
  errorBox: { alignItems: "center", marginTop: 50, paddingHorizontal: 24 },
  errorTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "bold", marginTop: 14 },
  errorDesc: { color: colors.textSecondary, fontSize: 13, marginTop: 6, textAlign: "center", lineHeight: 18 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 18,
  },
  actionBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 14, marginLeft: 8 },
});
