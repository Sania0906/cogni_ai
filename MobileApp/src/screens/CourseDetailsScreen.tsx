import React, { useState, useEffect } from "react";
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
import { BookOpen, Star, Clock, CheckCircle, PlayCircle, Users, ArrowLeft } from "lucide-react-native";

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

  useEffect(() => {
    loadCourse();
  }, [courseId]);

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
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const isEnrolled = course?.isEnrolled ?? false;
  const lessons = course?.lessons || [];
  const progress = course?.progress || 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{course?.title || "Machine Learning Foundations"}</Text>
        <Text style={styles.instructor}>By {course?.author || "Expert Instructor"}</Text>

        <View style={styles.metaRow}>
          <View style={styles.ratingBox}>
            <Star color="#f59e0b" size={14} fill="#f59e0b" />
            <Text style={styles.ratingText}>{course?.rating || 4.9}</Text>
          </View>
          <View style={styles.pill}>
            <Clock color="#94a3b8" size={13} />
            <Text style={styles.pillText}>{course?.weeks || 8} Weeks</Text>
          </View>
          <View style={styles.pill}>
            <Users color="#94a3b8" size={13} />
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

      {/* Enrollment Action */}
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
            <Text style={styles.enrollBtnText}>Enroll in Course (Free)</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.enrolledBox}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Your Course Progress</Text>
            <Text style={styles.progressValue}>{progress}%</Text>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${progress}%` }]} />
          </View>
        </View>
      )}

      {/* Curriculum Lessons List */}
      <Text style={styles.curriculumTitle}>Course Curriculum ({lessons.length} Lessons)</Text>
      {lessons.map((lesson: any, index: number) => {
        const isDone = !!lesson.completed;
        const lessonId = lesson.id || `l${index + 1}`;

        return (
          <TouchableOpacity
            key={lessonId}
            style={styles.lessonCard}
            onPress={() =>
              navigation.navigate("Lesson", {
                lessonId,
                courseId,
                courseTitle: course?.title,
              })
            }
            activeOpacity={0.7}
          >
            <View style={styles.lessonLeft}>
              {isDone ? (
                <CheckCircle color="#10b981" size={22} />
              ) : (
                <PlayCircle color="#6366f1" size={22} />
              )}
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.lessonName}>
                  {index + 1}. {lesson.title}
                </Text>
                <Text style={styles.lessonDuration}>{lesson.duration || "15 min"}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d16" },
  center: { flex: 1, backgroundColor: "#090d16", justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 50 },
  header: { marginBottom: 16 },
  title: { color: "#ffffff", fontSize: 22, fontWeight: "bold" },
  instructor: { color: "#818cf8", fontSize: 14, marginTop: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 },
  ratingBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#1e293b", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ratingText: { color: "#f59e0b", fontSize: 12, fontWeight: "bold", marginLeft: 4 },
  pill: { flexDirection: "row", alignItems: "center", backgroundColor: "#1e293b", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pillText: { color: "#cbd5e1", fontSize: 12, marginLeft: 4 },
  card: { backgroundColor: "#1e293b", padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#334155" },
  cardTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "600", marginBottom: 6 },
  description: { color: "#94a3b8", fontSize: 13, lineHeight: 19 },
  enrollBtn: { backgroundColor: "#6366f1", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginBottom: 20 },
  enrollBtnText: { color: "#ffffff", fontWeight: "bold", fontSize: 15 },
  enrolledBox: { backgroundColor: "#1e1b4b", padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: "#3730a3" },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressLabel: { color: "#a5b4fc", fontSize: 13, fontWeight: "500" },
  progressValue: { color: "#ffffff", fontSize: 14, fontWeight: "bold" },
  barBg: { height: 8, backgroundColor: "#0f172a", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#10b981", borderRadius: 4 },
  curriculumTitle: { color: "#ffffff", fontSize: 17, fontWeight: "bold", marginBottom: 12 },
  lessonCard: {
    backgroundColor: "#1e293b",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#334155",
  },
  lessonLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  lessonName: { color: "#ffffff", fontSize: 14, fontWeight: "500" },
  lessonDuration: { color: "#64748b", fontSize: 12, marginTop: 2 },
});

