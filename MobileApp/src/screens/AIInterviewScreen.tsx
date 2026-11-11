import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { api } from "../services/api";
import { Award, CheckCircle, Sparkles, RefreshCw } from "lucide-react-native";

export function AIInterviewScreen() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [session, setSession] = useState<any>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const startSession = async () => {
    if (!company.trim() || !role.trim()) {
      Alert.alert("Required Fields", "Please enter both Target Company and Role.");
      return;
    }
    setLoading(true);
    setEvaluation(null);
    try {
      const data = await api.generateInterview(company.trim(), role.trim());
      const questions = data?.questions || [];
      setSession(data);
      setAnswers(new Array(questions.length).fill(""));
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to generate interview questions.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAnswer = (index: number, text: string) => {
    setAnswers((prev) => {
      const copy = [...prev];
      copy[index] = text;
      return copy;
    });
  };

  const handleSubmitEvaluation = async () => {
    if (answers.every((a) => !a.trim())) {
      Alert.alert("No Answers", "Please provide an answer to at least one question before submitting.");
      return;
    }
    setEvaluating(true);
    try {
      const result = await api.evaluateInterview(session?.id || "session", answers);
      setEvaluation(result);
    } catch (e: any) {
      Alert.alert("Evaluation Error", e?.response?.data?.message || "Failed to evaluate interview responses.");
    } finally {
      setEvaluating(false);
    }
  };

  const handleReset = () => {
    setSession(null);
    setEvaluation(null);
    setAnswers([]);
  };

  const questions = session?.questions || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>AI Mock Interview Simulator</Text>
      <Text style={styles.subtitle}>
        Practice tailored technical & behavioral rounds with rubric-based evaluation
      </Text>

      {!session ? (
        <View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Target Company</Text>
            <TextInput
              style={styles.input}
              value={company}
              onChangeText={setCompany}
              placeholder="e.g. Google, Netflix, Stripe"
              placeholderTextColor="#64748b"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Target Role</Text>
            <TextInput
              style={styles.input}
              value={role}
              onChangeText={setRole}
              placeholder="e.g. Backend Engineer, ML Engineer"
              placeholderTextColor="#64748b"
            />
          </View>

          <TouchableOpacity
            style={styles.btn}
            onPress={startSession}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnRow}>
                <Sparkles color="#ffffff" size={18} />
                <Text style={styles.btnText}>Generate Interview Questions</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      ) : evaluation ? (
        <View>
          <View style={styles.resultBanner}>
            <View style={styles.scoreHeader}>
              <View>
                <Text style={styles.resultLabel}>Interview Rubric Score</Text>
                <Text style={styles.resultScore}>{evaluation.score ?? evaluation.overallScore ?? 0}%</Text>
              </View>
              <Award color="#10b981" size={40} />
            </View>
            <Text style={styles.feedbackText}>{evaluation.feedback}</Text>
          </View>

          {Array.isArray(evaluation.breakdown) &&
            evaluation.breakdown.map((b: any, i: number) => (
              <View key={i} style={styles.breakdownCard}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.breakdownTitle}>Question {b.questionIndex}</Text>
                  <Text style={styles.breakdownScore}>{b.score}%</Text>
                </View>
                <Text style={styles.breakdownWordCount}>Word count: {b.wordCount} words</Text>
                {Array.isArray(b.strengths) &&
                  b.strengths.map((s: string, sIdx: number) => (
                    <View key={sIdx} style={styles.strengthRow}>
                      <CheckCircle color="#10b981" size={14} />
                      <Text style={styles.strengthText}>{s}</Text>
                    </View>
                  ))}
                <Text style={styles.suggestionText}>{b.suggestions}</Text>
              </View>
            ))}

          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <RefreshCw color="#ffffff" size={18} />
            <Text style={styles.btnText}>Start New Mock Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View style={styles.sessionBanner}>
            <Text style={styles.sessionTitle}>
              {role} @ {company}
            </Text>
            <Text style={styles.sessionSub}>
              Answer each question thoughtfully using the STAR method (Situation, Task, Action, Result)
            </Text>
          </View>

          {questions.map((q: any, idx: number) => (
            <View key={q.id || idx} style={styles.questionCard}>
              <View style={styles.qBadgeRow}>
                <Text style={styles.qType}>{q.type || "Technical"}</Text>
                <Text style={styles.qDifficulty}>{q.difficulty || "Medium"}</Text>
              </View>
              <Text style={styles.questionText}>
                {idx + 1}. {q.question}
              </Text>
              <TextInput
                style={styles.textArea}
                multiline
                placeholder="Type your detailed response here..."
                placeholderTextColor="#64748b"
                value={answers[idx] || ""}
                onChangeText={(txt) => handleUpdateAnswer(idx, txt)}
              />
            </View>
          ))}

          <TouchableOpacity
            style={styles.btn}
            onPress={handleSubmitEvaluation}
            disabled={evaluating}
            activeOpacity={0.8}
          >
            {evaluating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Submit Answers for Rubric Evaluation</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelLink} onPress={handleReset}>
            <Text style={styles.cancelLinkText}>Cancel Session</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16" },
  content: { padding: 16, paddingBottom: 50 },
  title: { color: "#ffffff", fontSize: 24, fontWeight: "bold", marginTop: 10 },
  subtitle: { color: "#94a3b8", fontSize: 14, marginBottom: 20, marginTop: 4 },
  inputGroup: { marginBottom: 16 },
  label: { color: "#cbd5e1", fontSize: 13, marginBottom: 6, fontWeight: "500" },
  input: {
    backgroundColor: "#1e293b",
    color: "#fff",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    fontSize: 15,
  },
  btn: {
    backgroundColor: "#6366f1",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  sessionBanner: {
    backgroundColor: "#1e1b4b",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#3730a3",
  },
  sessionTitle: { color: "#ffffff", fontSize: 17, fontWeight: "bold" },
  sessionSub: { color: "#c7d2fe", fontSize: 12, marginTop: 4 },
  questionCard: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  qBadgeRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  qType: { color: "#818cf8", fontSize: 11, fontWeight: "bold", textTransform: "uppercase" },
  qDifficulty: { color: "#f59e0b", fontSize: 11, fontWeight: "bold" },
  questionText: { color: "#ffffff", fontSize: 15, fontWeight: "500", lineHeight: 21, marginBottom: 12 },
  textArea: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    minHeight: 90,
    textAlignVertical: "top",
    fontSize: 14,
  },
  cancelLink: { alignItems: "center", marginTop: 14 },
  cancelLinkText: { color: "#94a3b8", fontSize: 14 },
  resultBanner: {
    backgroundColor: "#064e3b",
    padding: 20,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#059669",
  },
  scoreHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultLabel: { color: "#a7f3d0", fontSize: 13 },
  resultScore: { color: "#ffffff", fontSize: 38, fontWeight: "bold" },
  feedbackText: { color: "#ecfdf5", fontSize: 13, marginTop: 10, lineHeight: 19 },
  breakdownCard: {
    backgroundColor: "#1e293b",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  breakdownHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  breakdownTitle: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  breakdownScore: { color: "#818cf8", fontSize: 15, fontWeight: "bold" },
  breakdownWordCount: { color: "#64748b", fontSize: 12, marginTop: 2, marginBottom: 6 },
  strengthRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  strengthText: { color: "#34d399", fontSize: 12, marginLeft: 6 },
  suggestionText: { color: "#cbd5e1", fontSize: 12, marginTop: 6, lineHeight: 17 },
  resetBtn: {
    backgroundColor: "#6366f1",
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
});
