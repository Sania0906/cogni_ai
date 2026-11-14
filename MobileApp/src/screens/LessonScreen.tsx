import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import {
  Play,
  CheckCircle,
  Clock,
  FileText,
  ArrowRight,
  ArrowLeft,
  Award,
} from "lucide-react-native";

export function LessonScreen({ route, navigation }: any) {
  const { lessonId, courseId, courseTitle } = route.params || {
    lessonId: "l1",
    courseId: "course_1",
    courseTitle: "Course",
  };
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const loadLesson = async () => {
    try {
      const data = await api.getLesson(lessonId, courseId);
      const res = data?.data || data;
      setLesson(res);
      setIsCompleted(Boolean(res?.isDone || res?.completed || res?.done));
    } catch (e) {
      console.warn("Failed to load lesson:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLesson();
      const interval = setInterval(loadLesson, 10000);
      return () => clearInterval(interval);
    }, [lessonId, courseId])
  );

  const handleComplete = async () => {
    if (isCompleted) {
      Alert.alert("Already Completed", "This lesson is already marked as completed.");
      return;
    }

    setCompleting(true);
    try {
      const res = await api.completeLesson(lessonId, courseId);
      setIsCompleted(true);
      Alert.alert(
        "Lesson Completed! 🎉",
        `Great job! Course progress updated to ${res?.progress || 100}%.`
      );
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to update completion status.");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.courseTag}>{courseTitle || "Course Curriculum"}</Text>
      <Text style={styles.title}>{lesson?.title || "Lesson Overview"}</Text>

      <View style={styles.durationRow}>
        <Clock color={colors.textSecondary} size={14} />
        <Text style={styles.durationText}>{lesson?.duration || "15 min"}</Text>
      </View>

      {/* Video Simulation Box */}
      <View style={styles.videoPlayer}>
        <View style={styles.playCircle}>
          <Play color="#ffffff" size={28} fill="#ffffff" />
        </View>
        <Text style={styles.videoText}>HD Video Lecture Active</Text>
        <Text style={styles.videoSubText}>CognifyAI Interactive Learning Stream</Text>
      </View>

      {/* Lesson Summary */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Lesson Summary & Overview</Text>
        <Text style={styles.summaryText}>
          {lesson?.summary ||
            "In this lesson, you will learn hands-on principles, best practices, and code patterns essential to mastering this topic."}
        </Text>
      </View>

      {/* Resources */}
      {Array.isArray(lesson?.resources) && lesson.resources.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Study Materials & Resources</Text>
          {lesson.resources.map((item: string, i: number) => (
            <View key={i} style={styles.resourceRow}>
              <FileText color={colors.primary} size={16} />
              <Text style={styles.resourceText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Mark Complete Action Button */}
      <TouchableOpacity
        style={[styles.completeBtn, isCompleted && styles.completedBtn]}
        onPress={handleComplete}
        disabled={completing}
        activeOpacity={0.8}
      >
        {completing ? (
          <ActivityIndicator color={isCompleted ? colors.success : "#ffffff"} />
        ) : (
          <View style={styles.btnRow}>
            <CheckCircle color={isCompleted ? colors.success : "#ffffff"} size={20} />
            <Text style={[styles.completeBtnText, isCompleted && styles.completedBtnText]}>
              {isCompleted ? "Completed ✓" : "Mark Lesson as Complete"}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Next Lesson Navigator */}
      {lesson?.nextLessonId && (
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() =>
            navigation.replace("Lesson", {
              lessonId: lesson.nextLessonId,
              courseId,
              courseTitle,
            })
          }
        >
          <Text style={styles.nextBtnText}>Proceed to Next Lesson</Text>
          <ArrowRight color={colors.primary} size={16} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 50 },
  courseTag: { color: colors.primary, fontSize: 13, fontWeight: "700", textTransform: "uppercase" },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: "bold", marginTop: 4 },
  durationRow: { flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 16 },
  durationText: { color: colors.textSecondary, fontSize: 13, marginLeft: 6 },
  videoPlayer: {
    backgroundColor: "#1e1b4b",
    height: 200,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#312e81",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  playCircle: {
    backgroundColor: colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  videoText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  videoSubText: { color: "#c7d2fe", fontSize: 12, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "700", marginBottom: 8 },
  summaryText: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  resourceRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  resourceText: { color: colors.textPrimary, fontSize: 13, marginLeft: 8 },
  completeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  completedBtn: {
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnRow: { flexDirection: "row", alignItems: "center" },
  completeBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15, marginLeft: 8 },
  completedBtnText: { color: colors.success },
  nextBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  nextBtnText: { color: colors.primary, fontSize: 14, fontWeight: "700", marginRight: 6 },
});

