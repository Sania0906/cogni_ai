import React, { useState } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { api } from "../services/api";
import { Building, Award, CheckCircle2 } from "lucide-react-native";

export function CompanyReadinessScreen() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const handleGenerate = async () => {
    if (!company || !role) return;
    setLoading(true);
    try {
      const res = await api.generateCompanyReadiness(company, role);
      setReport(res);
    } catch (e) {
      console.log("Readiness error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Company Readiness Assessment</Text>
      <Text style={styles.subtitle}>Evaluate readiness for your target company</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Company Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Google, Microsoft, Amazon"
          placeholderTextColor="#666"
          value={company}
          onChangeText={setCompany}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Target Position</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Senior Frontend Engineer"
          placeholderTextColor="#666"
          value={role}
          onChangeText={setRole}
        />
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleGenerate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Analyze Preparedness</Text>}
      </TouchableOpacity>

      {report && (
        <View style={styles.reportBox}>
          <Text style={styles.reportScore}>{report.readinessScore || 85}% Ready</Text>
          <Text style={styles.reportDetail}>{report.summary || "Your experience matches target engineering standard."}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16", padding: 16 },
  title: { color: "#ffffff", fontSize: 24, fontWeight: "bold", marginTop: 20 },
  subtitle: { color: "#94a3b8", fontSize: 14, marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { color: "#cbd5e1", fontSize: 14, marginBottom: 6 },
  input: { backgroundColor: "#1e293b", color: "#fff", padding: 14, borderRadius: 8, borderWidth: 1, borderColor: "#334155" },
  btn: { backgroundColor: "#6366f1", padding: 16, borderRadius: 8, alignItems: "center", marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  reportBox: { backgroundColor: "#1e1b4b", padding: 20, borderRadius: 12, marginTop: 20 },
  reportScore: { color: "#34d399", fontSize: 32, fontWeight: "bold" },
  reportDetail: { color: "#c7d2fe", marginTop: 8, fontSize: 14 },
});
