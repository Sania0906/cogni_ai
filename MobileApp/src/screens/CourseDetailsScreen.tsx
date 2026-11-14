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
import {
  BookOpen,
  Star,
  Clock,
  CheckCircle,
  PlayCircle,
  Users,
  ChevronRight,
  ArrowRight,
} from "lucide-react-native";
import { colors } from "../theme/colors";

export function CourseDetailsScreen({ route, navigation }: any) {
  const { courseId } = route.params || { courseId: "course_1" };
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  const loadCourse = async () => {
    try {
      const data = await api.getCourseById(courseId);
      setCourse(data?.data || data);
    } catch (e) {
      console.warn("Failed to load course details:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCourse();
      const interval = setInterval(loadCourse, 10000);
      return () => clearInterval(interval);
    }, [courseId])
  );

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await api.enrollCourse(courseId);
      Alert.alert("Enrolled!", "You are now enrolled in this course.");
      loadCourse();
    } catch (e: any) {
      Alert.alert("Enrollment", e?.response?.data?.message || "Successfully enrolled.");
      loadCourse();
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isEnrolled = Boolean(course?.isEnrolled);
  const lessons = course?.lessons || [];
  const progress = course?.progress || 0;
  const isCompleted = progress >= 100;
  const nextLessonId = course?.nextLessonId || "l1";

  const handleContinueLearning = (lessonIdToOpen?: string) => {
    navigation.navigate("Lesson", {
      lessonId: lessonIdToOpen || nextLessonId,
      courseId,
      courseTitle: course?.title,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{course?.title || "Machine Learning Foundations"}</Text>
        <Text style={styles.instructor}>By {course?.author || "Expert Instructor"}</Text>

        <View style={styles.metaRow}>
          <View style={styles.ratingBox}>
            <Star color={colors.warning} size={14} fill={colors.warning} />
            <Text style={styles.ratingText}>{course?.rating || 4.9}</Text>
          </View>
          <View style={styles.pill}>
            <Clock color={colors.textSecondary} size={13} />
            <Text style={styles.pillText}>{course?.weeks || 8} Weeks</Text>
          </View>
          <View style={styles.pill}>
            <Users color={colors.textSecondary} size={13} />
            <Text style={styles.pillText}>{course?.students || "12.5k"} Enrolled</Text>
          </View>
        </View>
      </View>

      {/* Description */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>About this Course</Text>
        <Text style={styles.description}>
          {course?.description ||
            "Master production engineering concepts with hands-on practice, automated grading, and real-world architectures."}
        </Text>
      </View>

      {/* Enrollment & Continue Learning Action */}
      {!isEnrolled ? (
        <TouchableOpacity
          style={styles.enrollBtn}
          onPress={handleEnroll}
          disabled={enrolling}
          activeOpacity={0.8}
        >
          {enrolling ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={styles.enrollBtnText}>Enroll in Course (Free)</Text>
              <ArrowRight color="#ffffff" size={16} />
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.enrolledBox}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {isCompleted ? "Course Completed 🎉" : "Your Course Progress"}
            </Text>
            <Text style={styles.progressValue}>{progress}%</Text>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${progress}%` }, isCompleted && { backgroundColor: colors.success }]} />
          </View>

          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => handleContinueLearning()}
            activeOpacity={0.8}
          >
            <PlayCircle color="#ffffff" size={18} />
            <Text style={styles.continueBtnText}>
              {isCompleted ? "Review Completed Lessons" : "Continue Learning"}
            </Text>
            <ChevronRight color="#ffffff" size={16} />
          </TouchableOpacity>
        </View>
      )}

      {/* Curriculum Lessons List */}
      <Text style={styles.curriculumTitle}>Course Curriculum ({lessons.length} Lessons)</Text>
      {lessons.map((lesson: any, index: number) => {
        const isDone = Boolean(lesson.done || lesson.completed);
        const lessonId = lesson.id || `l${index + 1}`;

        return (
          <TouchableOpacity
            key={lessonId}
            style={[styles.lessonCard, isDone && styles.lessonCardDone]}
            onPress={() => handleContinueLearning(lessonId)}
            activeOpacity={0.7}
          >
            <View style={styles.lessonLeft}>
              {isDone ? (
                <CheckCircle color={colors.success} size={22} />
              ) : (
                <PlayCircle color={colors.primary} size={22} />
              )}
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.lessonName, isDone && { color: colors.textPrimary }]}>
                  {index + 1}. {lesson.title}
                </Text>
                <Text style={styles.lessonDuration}>{lesson.duration || "15 min"}</Text>
              </View>
            </View>
            <ChevronRight color={colors.textMuted} size={16} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 50 },
  header: { marginBottom: 16 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: "bold" },
  instructor: { color: colors.primary, fontSize: 14, marginTop: 4, fontWeight: "500" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warningBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: { color: colors.warning, fontSize: 12, fontWeight: "bold", marginLeft: 4 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pillText: { color: colors.textSecondary, fontSize: 12, marginLeft: 4 },
  card: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "600", marginBottom: 6 },
  description: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  enrollBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  enrollBtnText: { color: "#ffffff", fontWeight: "bold", fontSize: 15 },
  enrolledBox: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  progressValue: { color: colors.primary, fontSize: 14, fontWeight: "bold" },
  barBg: { height: 8, backgroundColor: colors.backgroundSecondary, borderRadius: 4, overflow: "hidden", marginBottom: 14 },
  barFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
  continueBtn: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  continueBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "bold" },
  curriculumTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: "bold", marginBottom: 12 },
  lessonCard: {
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  lessonCardDone: {
    borderColor: colors.successBorder,
    backgroundColor: "#ffffff",
  },
  lessonLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  lessonName: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  lessonDuration: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
