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
import { colors } from "../theme/colors";
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

      {!session && !evaluation && (
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Target Company</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Google, Meta, Stripe"
              placeholderTextColor={colors.textMuted}
              value={company}
              onChangeText={setCompany}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Target Role</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Senior Frontend Engineer"
              placeholderTextColor={colors.textMuted}
              value={role}
              onChangeText={setRole}
            />
          </View>

          <TouchableOpacity style={styles.btn} onPress={startSession} disabled={loading} activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnRow}>
                <Sparkles color="#fff" size={18} />
                <Text style={styles.btnText}>Start AI Mock Interview</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Active Interview Session Form */}
      {session && !evaluation && (
        <View>
          <View style={styles.sessionBanner}>
            <Text style={styles.sessionTitle}>
              {session.company || company} — {session.role || role}
            </Text>
            <Text style={styles.sessionSub}>Answer the questions below to receive AI analysis</Text>
          </View>

          {questions.map((q: any, i: number) => (
            <View key={i} style={styles.questionCard}>
              <View style={styles.qBadgeRow}>
                <Text style={styles.qType}>{q.type || `Question ${i + 1}`}</Text>
                <Text style={styles.qDifficulty}>{q.difficulty || "Standard"}</Text>
              </View>
              <Text style={styles.questionText}>{q.question || q.text || q}</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={4}
                placeholder="Type your response or approach here..."
                placeholderTextColor={colors.textMuted}
                value={answers[i] || ""}
                onChangeText={(text) => handleUpdateAnswer(i, text)}
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
              <Text style={styles.btnText}>Submit for AI Rubric Evaluation</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelLink} onPress={handleReset}>
            <Text style={styles.cancelLinkText}>Cancel Session</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Evaluation Results */}
      {evaluation && (
        <View>
          <View style={styles.resultBanner}>
            <View style={styles.scoreHeader}>
              <View>
                <Text style={styles.resultLabel}>Overall Interview Score</Text>
                <Text style={styles.resultScore}>{evaluation.overallScore || 85}%</Text>
              </View>
              <Award color="#ffffff" size={36} />
            </View>
            <Text style={styles.feedbackText}>
              {evaluation.summary || "Solid technical explanations with strong clarity and structured thinking."}
            </Text>
          </View>

          <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
            <RefreshCw color="#fff" size={16} />
            <Text style={styles.btnText}>Start New Mock Interview</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 50 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "bold", marginTop: 6 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginBottom: 18, marginTop: 4, lineHeight: 18 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  inputGroup: { marginBottom: 14 },
  label: { color: colors.textSecondary, fontSize: 13, marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.textPrimary,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    fontSize: 14,
  },
  btn: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  sessionBanner: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  sessionTitle: { color: "#ffffff", fontSize: 17, fontWeight: "bold" },
  sessionSub: { color: "rgba(255, 255, 255, 0.9)", fontSize: 12, marginTop: 4 },
  questionCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  qBadgeRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  qType: { color: colors.primary, fontSize: 11, fontWeight: "bold", textTransform: "uppercase" },
  qDifficulty: { color: colors.warning, fontSize: 11, fontWeight: "bold" },
  questionText: { color: colors.textPrimary, fontSize: 15, fontWeight: "600", lineHeight: 21, marginBottom: 12 },
  textArea: {
    backgroundColor: colors.backgroundSecondary,
    color: colors.textPrimary,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 90,
    textAlignVertical: "top",
    fontSize: 14,
  },
  cancelLink: { alignItems: "center", marginTop: 14 },
  cancelLinkText: { color: colors.textSecondary, fontSize: 14, fontWeight: "600" },
  resultBanner: {
    backgroundColor: colors.success,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  scoreHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultLabel: { color: "rgba(255, 255, 255, 0.9)", fontSize: 13, fontWeight: "600" },
  resultScore: { color: "#ffffff", fontSize: 38, fontWeight: "bold" },
  feedbackText: { color: "rgba(255, 255, 255, 0.95)", fontSize: 13, marginTop: 10, lineHeight: 19 },
  resetBtn: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
});
