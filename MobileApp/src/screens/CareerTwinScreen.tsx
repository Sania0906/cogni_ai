import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { api } from "../services/api";
import { Brain, Sparkles, RefreshCw } from "lucide-react-native";

export function CareerTwinScreen() {
  const [twin, setTwin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTwin();
  }, []);

  const fetchTwin = async () => {
    setLoading(true);
    try {
      const data = await api.getLatestCareerTwin().catch(() => api.generateCareerTwin());
      setTwin(data);
    } catch (e) {
      console.log("Career Twin error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>AI Career Twin Simulation</Text>
      <Text style={styles.subtitle}>Simulated dual persona predicting career trajectory</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
      ) : (
        <View>
          <View style={styles.twinCard}>
            <Brain color="#8b5cf6" size={36} />
            <Text style={styles.twinTitle}>{twin?.archetype || "Senior AI Architect Twin"}</Text>
            <Text style={styles.twinDesc}>{twin?.summary || "Optimized for technical leadership & cloud-native systems."}</Text>
          </View>

          <TouchableOpacity style={styles.btn} onPress={fetchTwin}>
            <RefreshCw color="#fff" size={18} />
            <Text style={styles.btnText}>Regenerate Simulation</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16", padding: 16 },
  title: { color: "#ffffff", fontSize: 24, fontWeight: "bold", marginTop: 20 },
  subtitle: { color: "#94a3b8", fontSize: 14, marginBottom: 20 },
  twinCard: { backgroundColor: "#1e1b4b", padding: 24, borderRadius: 16, alignItems: "center" },
  twinTitle: { color: "#ffffff", fontSize: 20, fontWeight: "bold", marginTop: 12 },
  twinDesc: { color: "#c7d2fe", textAlign: "center", marginTop: 8, fontSize: 14 },
  btn: { backgroundColor: "#6366f1", padding: 16, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 20 },
  btnText: { color: "#fff", fontWeight: "600", marginLeft: 8 },
});
